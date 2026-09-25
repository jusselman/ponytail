import { useState, useEffect, useRef, useCallback } from "react";
import { useUI } from '../context/UIContext';
import { usePlayer } from '../context/PlayerContext';
import { getMessages, sendMessage, markConversationRead } from '../services/messageService';
import { searchTracks } from '../services/playlistService';
import { blockUser, unblockUser } from '../services/blockService';
import LogoutConfirmModal from './LogoutConfirmModal';
import { colors, font, UserAvatar, ArtistBadge, separatorTime, BlockToggleButton } from './messages/shared';

const POLL_MS = 4000;
const SEPARATOR_GAP_MS = 15 * 60 * 1000; // show a timestamp when 15+ min pass between messages

// ─── Icons ────────────────────────────────────────────────────────────────────
const ChevronLeft = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <path d="M15 18l-6-6 6-6" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SendIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={active ? "#111" : colors.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const MusicPlusIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M9 18V6l10-2v8" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="18" r="3" stroke={colors.teal} strokeWidth="1.8" />
    <path d="M18 15v6M15 18h6" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 4l14 8-14 8V4z" fill="#111" /></svg>
);
const PauseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M7 4h3v16H7zM14 4h3v16h-3z" fill="#111" /></svg>
);
const CloseIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6l12 12" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const DiscIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={colors.muted} strokeWidth="1.6" />
    <circle cx="12" cy="12" r="2.5" stroke={colors.muted} strokeWidth="1.6" />
  </svg>
);

// ─── Square cover with a disc fallback ──
const Cover = ({ url, size }) => (
  <div style={{
    width: size, height: size, borderRadius: "8px", overflow: "hidden", flexShrink: 0,
    backgroundColor: "#333", display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    {url ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <DiscIcon />}
  </div>
);

// ─── Shared-track card — tap anywhere to play/pause it through the global player ──
const TrackCard = ({ track, mine }) => {
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const isThis = currentTrack && currentTrack.title === track.title && currentTrack.artist === track.artist;
  const playingThis = isThis && isPlaying;

  return (
    <div
      onClick={() => playTrack(track, [track], 0)}
      style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "8px", borderRadius: "14px", cursor: "pointer",
        backgroundColor: mine ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.05)",
        width: "240px", maxWidth: "100%", boxSizing: "border-box",
      }}
    >
      <Cover url={track.coverUrl} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: "600", color: colors.text, fontFamily: font, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {track.title}
        </div>
        <div style={{ fontSize: "12px", color: colors.textSecondary, fontFamily: font, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {track.artist}
        </div>
      </div>
      <div style={{
        width: 30, height: 30, borderRadius: "50%", backgroundColor: colors.teal, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {playingThis ? <PauseIcon /> : <PlayIcon />}
      </div>
    </div>
  );
};

// ─── Shared-playlist card — tap opens the read-only playlist viewer ──
const PlaylistCard = ({ playlist, mine }) => {
  const { openPublicPlaylist } = useUI();
  return (
    <div
      onClick={() => openPublicPlaylist(playlist.id)}
      style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "8px", borderRadius: "14px", cursor: "pointer",
        backgroundColor: mine ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.05)",
        width: "240px", maxWidth: "100%", boxSizing: "border-box",
      }}
    >
      <Cover url={playlist.coverUrl} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "10px", fontWeight: "700", color: colors.teal, fontFamily: font, letterSpacing: "0.6px", textTransform: "uppercase" }}>
          Playlist
        </div>
        <div style={{ fontSize: "13px", fontWeight: "600", color: colors.text, fontFamily: font, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {playlist.title}
        </div>
        <div style={{ fontSize: "12px", color: colors.textSecondary, fontFamily: font, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {playlist.trackCount ?? 0} track{playlist.trackCount === 1 ? "" : "s"}{playlist.ownerUsername ? ` · @${playlist.ownerUsername}` : ""}
        </div>
      </div>
    </div>
  );
};

// ─── One message bubble (text and/or attachment) ──
const MessageBubble = ({ msg, onRetry }) => {
  const { mine } = msg;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", marginBottom: "4px" }}>
      <div style={{
        maxWidth: "78%",
        display: "flex", flexDirection: "column", gap: "6px",
        alignItems: mine ? "flex-end" : "flex-start",
        opacity: msg.pending ? 0.6 : 1,
      }}>
        {msg.attachmentType === "track" && msg.attachment && <TrackCard track={msg.attachment} mine={mine} />}
        {msg.attachmentType === "playlist" && msg.attachment && <PlaylistCard playlist={msg.attachment} mine={mine} />}
        {msg.body && (
          <div style={{
            padding: "9px 14px", borderRadius: "18px",
            borderBottomRightRadius: mine ? "6px" : "18px",
            borderBottomLeftRadius: mine ? "18px" : "6px",
            backgroundColor: mine ? colors.teal : colors.bgCard,
            color: mine ? "#111" : colors.text,
            fontSize: "14px", lineHeight: 1.4, fontFamily: font,
            whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {msg.body}
          </div>
        )}
      </div>
      {msg.failed && (
        <button
          onClick={() => onRetry(msg)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontSize: "11px", color: colors.danger, fontFamily: font }}
        >
          Not sent · Tap to retry
        </button>
      )}
    </div>
  );
};

// ─── "Share music" sheet — search any track in the catalog, or pick one of your
// public playlists. Picking one stages it above the composer. ──
const AttachSheet = ({ open, onClose, onPick }) => {
  const { myPlaylists, refreshMyPlaylists } = useUI();
  const [tab, setTab] = useState("tracks");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (open) refreshMyPlaylists();
    else { setQuery(""); setResults([]); }
  }, [open, refreshMyPlaylists]);

  // ── Debounced track search ──
  useEffect(() => {
    if (tab !== "tracks") return;
    if (query.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        setResults((await searchTracks(query)).slice(0, 25));
      } catch (err) {
        console.log('Track search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, tab]);

  const publicPlaylists = (myPlaylists || []).filter(p => p.is_public);

  return (
    <>
      {open && (
        <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 20, backgroundColor: "rgba(0,0,0,0.5)" }} />
      )}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: "70%", zIndex: 21,
        backgroundColor: "#262626", borderTopLeftRadius: "20px", borderTopRightRadius: "20px",
        transform: open ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        pointerEvents: open ? "all" : "none",
        boxShadow: "0 -10px 40px rgba(0,0,0,0.4)",
      }}>
        <div style={{ padding: "10px 0 0", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#444" }} />
        </div>
        <div style={{ padding: "12px 20px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "15px", fontWeight: "600", color: colors.text, fontFamily: font }}>Share music</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}>
            <CloseIcon size={18} />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", gap: "6px", padding: "0 20px 12px" }}>
          {[{ key: "tracks", label: "Tracks" }, { key: "playlists", label: "My Playlists" }].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "6px 14px", borderRadius: "16px", cursor: "pointer",
                border: `1.5px solid ${tab === t.key ? colors.teal : "rgba(255,255,255,0.12)"}`,
                backgroundColor: tab === t.key ? colors.tealGlow : "transparent",
                color: tab === t.key ? colors.teal : colors.textSecondary,
                fontSize: "12px", fontWeight: "600", fontFamily: font,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "tracks" ? (
          <>
            <div style={{ padding: "0 20px 10px" }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search songs, artists, albums"
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: "12px",
                  backgroundColor: colors.inputBg, border: "1.5px solid transparent",
                  color: colors.text, fontSize: "14px", outline: "none",
                  fontFamily: font, boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 16px" }}>
              {searching && results.length === 0 && (
                <div style={{ textAlign: "center", color: colors.muted, fontFamily: font, fontSize: "13px", padding: "20px 0" }}>Searching...</div>
              )}
              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <div style={{ textAlign: "center", color: colors.muted, fontFamily: font, fontSize: "13px", padding: "20px 0" }}>No tracks found.</div>
              )}
              {results.map((t, i) => (
                <PickRow
                  key={`${t.title}|${t.artist}|${i}`}
                  cover={t.coverUrl}
                  title={t.title}
                  subtitle={t.artist}
                  onTap={() => onPick({ type: "track", track: t })}
                />
              ))}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 16px" }}>
            {publicPlaylists.length === 0 ? (
              <div style={{ textAlign: "center", color: colors.muted, fontFamily: font, fontSize: "13px", padding: "20px 24px", lineHeight: 1.5 }}>
                You don't have any public playlists yet. Only public playlists can be shared.
              </div>
            ) : publicPlaylists.map(p => (
              <PickRow
                key={p.id}
                cover={p.cover_art_url}
                title={p.title}
                subtitle={`${p.track_count ?? 0} track${p.track_count === 1 ? "" : "s"}`}
                onTap={() => onPick({ type: "playlist", playlistId: p.id, preview: { id: p.id, title: p.title, coverUrl: p.cover_art_url, trackCount: p.track_count } })}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

const PickRow = ({ cover, title, subtitle, onTap }) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onTap}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: "12px", padding: "8px", borderRadius: "10px",
        cursor: "pointer", backgroundColor: hover ? colors.bgCardHover : "transparent",
      }}
    >
      <Cover url={cover} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: font, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        <div style={{ fontSize: "12px", color: colors.textSecondary, fontFamily: font, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div>
      </div>
    </div>
  );
};

// ─── A single DM thread. Slides in from the right over the inbox (or over a
// profile, when opened with that profile's Message button). Polls every few
// seconds for new messages while open. ──
export default function ConversationPanel() {
  const { activeConversation, closeConversation, refreshUnreadCount } = useUI();

  // ── Block state for this thread, iPhone-Messages style. blockedByMe: I
  // blocked them — the thread stays, I can still write, and the header toggle
  // reads Unblock. canMessage: false only when THEY blocked me — when they
  // blocked me, all I ever see is a neutral "can't message" note. ──
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [canMessage, setCanMessage] = useState(true);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [blockPending, setBlockPending] = useState(false);
  useEffect(() => {
    setBlockedByMe(!!activeConversation?.blockedByMe);
    setCanMessage(activeConversation?.canMessage ?? true);
    setBlockConfirmOpen(false);
  }, [activeConversation?.id]);
  const applyBlockState = (data) => {
    if (typeof data?.blockedByMe === "boolean") setBlockedByMe(data.blockedByMe);
    if (typeof data?.canMessage === "boolean") setCanMessage(data.canMessage);
  };
  const isOpen = !!activeConversation;
  const conversationId = activeConversation?.id;

  // Keep the last conversation around while the panel slides out, so its
  // contents don't blank mid-animation.
  const [shown, setShown] = useState(null);
  useEffect(() => { if (activeConversation) setShown(activeConversation); }, [activeConversation]);
  const otherUser = shown?.otherUser;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [otherLastReadAt, setOtherLastReadAt] = useState(null);
  const [draft, setDraft] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [attachOpen, setAttachOpen] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const stickToBottom = useRef(true);
  const newestRef = useRef(null); // createdAt of the newest server-confirmed message

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  // ── Merge incoming server messages, dropping any we already have ──
  const mergeMessages = useCallback((incoming) => {
    if (!incoming.length) return;
    setMessages(prev => {
      const seen = new Set(prev.map(m => m.id));
      const fresh = incoming.filter(m => !seen.has(m.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
    const last = incoming[incoming.length - 1].createdAt;
    if (!newestRef.current || new Date(last) > new Date(newestRef.current)) newestRef.current = last;
  }, []);

  const markRead = useCallback(async (id) => {
    try {
      await markConversationRead(id);
      refreshUnreadCount();
    } catch (err) {
      console.log('Failed to mark conversation read:', err);
    }
  }, [refreshUnreadCount]);

  // ── Initial load + polling ──
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    setMessages([]);
    setLoading(true);
    setHasMore(false);
    setOtherLastReadAt(null);
    setDraft("");
    setPendingAttachment(null);
    setAttachOpen(false);
    newestRef.current = null;
    stickToBottom.current = true;

    const initial = async () => {
      try {
        const data = await getMessages(conversationId);
        if (cancelled) return;
        mergeMessages(data.messages);
        setHasMore(data.hasMore);
        setOtherLastReadAt(data.otherLastReadAt);
        applyBlockState(data);
        markRead(conversationId);
      } catch (err) {
        console.log('Failed to load messages:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const poll = async () => {
      try {
        const data = await getMessages(conversationId, { after: newestRef.current || undefined });
        if (cancelled) return;
        setOtherLastReadAt(data.otherLastReadAt);
        applyBlockState(data);
        if (data.messages.length) {
          mergeMessages(data.messages);
          if (data.messages.some(m => !m.mine)) markRead(conversationId);
        }
      } catch (err) {
        // transient — try again next tick
      }
    };

    initial();
    const interval = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [conversationId, mergeMessages, markRead]);

  // ── Auto-scroll to newest, unless the user has scrolled up to read history ──
  useEffect(() => {
    if (stickToBottom.current) scrollToBottom();
  }, [messages]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const loadEarlier = async () => {
    const oldest = messages.find(m => !m.pending && !m.failed);
    if (!oldest || loadingEarlier) return;
    setLoadingEarlier(true);
    const el = scrollRef.current;
    const prevHeight = el ? el.scrollHeight : 0;
    try {
      const data = await getMessages(conversationId, { before: oldest.createdAt });
      setHasMore(data.hasMore);
      setMessages(prev => {
        const seen = new Set(prev.map(m => m.id));
        return [...data.messages.filter(m => !seen.has(m.id)), ...prev];
      });
      // keep the viewport anchored on what the user was reading
      requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - prevHeight; });
    } catch (err) {
      console.log('Failed to load earlier messages:', err);
    } finally {
      setLoadingEarlier(false);
    }
  };

  // ── Optimistic send: show it immediately, swap in the server copy on success,
  // mark it failed (tap to retry) otherwise ──
  const deliver = async (tempMsg, payload) => {
    try {
      const saved = await sendMessage(conversationId, payload);
      setMessages(prev => {
        const without = prev.filter(m => m.id !== tempMsg.id);
        if (without.some(m => m.id === saved.id)) return without; // poll beat us to it
        return [...without, saved];
      });
      if (!newestRef.current || new Date(saved.createdAt) > new Date(newestRef.current)) newestRef.current = saved.createdAt;
    } catch (err) {
      console.log('Failed to send message:', err);
      // A block landed since the thread opened: drop the unsent bubble and
      // swap the composer for the "can't message" note instead of offering retry.
      if (err.response?.status === 403) {
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        setCanMessage(false);
        return;
      }
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...m, pending: false, failed: true } : m));
    }
  };

  const handleSend = () => {
    const body = draft.trim();
    if (!body && !pendingAttachment) return;

    const payload = {
      body: body || undefined,
      attachment: pendingAttachment
        ? (pendingAttachment.type === "track"
            ? { type: "track", track: pendingAttachment.track }
            : { type: "playlist", playlistId: pendingAttachment.playlistId })
        : undefined,
    };
    const tempMsg = {
      id: `temp-${Date.now()}`,
      mine: true,
      pending: true,
      body: body || null,
      attachmentType: pendingAttachment?.type || null,
      attachment: pendingAttachment
        ? (pendingAttachment.type === "track" ? pendingAttachment.track : pendingAttachment.preview)
        : null,
      createdAt: new Date().toISOString(),
      payload,
    };

    stickToBottom.current = true;
    setMessages(prev => [...prev, tempMsg]);
    setDraft("");
    setPendingAttachment(null);
    deliver(tempMsg, payload);
  };

  const handleRetry = (msg) => {
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, pending: true, failed: false } : m));
    deliver(msg, msg.payload);
  };

  // ── Grow the composer with its content, up to ~5 lines ──
  const autoGrow = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "20px";
    el.style.height = `${Math.min(el.scrollHeight - 20, 110)}px`;
  };
  useEffect(() => { if (!draft && inputRef.current) inputRef.current.style.height = "20px"; }, [draft]);

  // ── Block: confirm first, then stay right here — the conversation is kept
  // as-is and the header toggle flips to Unblock. Unblock is immediate. ──
  const handleConfirmBlock = async () => {
    if (!otherUser || blockPending) return;
    setBlockPending(true);
    try {
      await blockUser(otherUser.username);
      setBlockConfirmOpen(false);
      setBlockedByMe(true);
    } catch (err) {
      console.log('Failed to block user:', err);
      alert("Couldn't block this account right now.");
    } finally {
      setBlockPending(false);
    }
  };

  const handleUnblock = async () => {
    if (!otherUser || blockPending) return;
    setBlockPending(true);
    try {
      await unblockUser(otherUser.username);
      const data = await getMessages(conversationId, { after: newestRef.current || undefined });
      applyBlockState(data);
      mergeMessages(data.messages);
      refreshUnreadCount();
    } catch (err) {
      console.log('Failed to unblock user:', err);
      alert("Couldn't unblock this account right now.");
    } finally {
      setBlockPending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = draft.trim().length > 0 || !!pendingAttachment;

  // ── "Seen" goes under my newest confirmed message if the other person has
  // read up to (or past) it ──
  const myLastConfirmed = [...messages].reverse().find(m => m.mine && !m.pending && !m.failed);
  const showSeen = myLastConfirmed && otherLastReadAt &&
    new Date(otherLastReadAt) >= new Date(myLastConfirmed.createdAt) &&
    messages[messages.length - 1]?.id === myLastConfirmed.id;

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 1110,
      backgroundColor: colors.bg,
      transform: isOpen ? "translateX(0)" : "translateX(100%)",
      transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
      display: "flex", flexDirection: "column", overflow: "hidden",
      pointerEvents: isOpen ? "all" : "none",
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px",
        borderBottom: `1px solid ${colors.border}`, flexShrink: 0,
      }}>
        <button onClick={closeConversation} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}>
          <ChevronLeft />
        </button>
        {otherUser && (
          <>
            <UserAvatar name={otherUser.displayName} picture={otherUser.profilePicture} size={36} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
                <span style={{ fontSize: "15px", fontWeight: "600", color: colors.text, fontFamily: font, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {otherUser.displayName}
                </span>
                {otherUser.isArtist && <ArtistBadge />}
              </div>
              <div style={{ fontSize: "12px", color: colors.muted, fontFamily: font }}>@{otherUser.username}</div>
            </div>
            <BlockToggleButton
              blocked={blockedByMe}
              pending={blockPending}
              onPress={() => (blockedByMe ? handleUnblock() : setBlockConfirmOpen(true))}
            />
          </>
        )}
      </div>

      {/* ── Thread ── */}
      <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>
        {hasMore && (
          <div style={{ textAlign: "center", marginBottom: "12px" }}>
            <button
              onClick={loadEarlier}
              disabled={loadingEarlier}
              style={{ background: "none", border: `1px solid ${colors.border}`, borderRadius: "14px", padding: "5px 14px", cursor: "pointer", color: colors.textSecondary, fontSize: "12px", fontFamily: font }}
            >
              {loadingEarlier ? "Loading..." : "Load earlier messages"}
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", color: colors.muted, fontFamily: font, fontSize: "14px", padding: "40px 0" }}>Loading...</div>
        ) : messages.length === 0 && otherUser ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "50px 20px", textAlign: "center" }}>
            <UserAvatar name={otherUser.displayName} picture={otherUser.profilePicture} size={72} />
            <div style={{ fontSize: "17px", fontWeight: "600", color: colors.text, fontFamily: font }}>{otherUser.displayName}</div>
            <div style={{ fontSize: "13px", color: colors.textSecondary, fontFamily: font, lineHeight: 1.5 }}>
              Say hi{otherUser.isArtist ? ", tell them what you love about their music," : ""} or share a track you think they'd like.
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const prev = messages[i - 1];
            const showSeparator = !prev || new Date(msg.createdAt) - new Date(prev.createdAt) > SEPARATOR_GAP_MS;
            return (
              <div key={msg.id}>
                {showSeparator && (
                  <div style={{ textAlign: "center", fontSize: "11px", color: colors.muted, fontFamily: font, margin: "14px 0 10px" }}>
                    {separatorTime(msg.createdAt)}
                  </div>
                )}
                <MessageBubble msg={msg} onRetry={handleRetry} />
              </div>
            );
          })
        )}

        {showSeen && (
          <div style={{ textAlign: "right", fontSize: "11px", color: colors.muted, fontFamily: font, marginTop: "2px" }}>Seen</div>
        )}
      </div>

      {/* ── I blocked them: a quiet banner above my (still working) composer ── */}
      {blockedByMe && (
        <div style={{
          padding: "10px 20px", borderTop: `1px solid ${colors.border}`, flexShrink: 0,
          textAlign: "center", fontSize: "12px", color: colors.textSecondary, fontFamily: font, lineHeight: 1.5,
        }}>
          You blocked @{otherUser?.username}. They can't send you messages.
        </div>
      )}

      {!canMessage ? (
        /* ── They blocked me: neutral note instead of the composer. It never
        says they blocked me. ── */
        <div style={{
          padding: "16px 20px 22px", borderTop: `1px solid ${colors.border}`, flexShrink: 0,
          textAlign: "center", fontSize: "13px", color: colors.textSecondary, fontFamily: font, lineHeight: 1.5,
        }}>
          You can't message this account.
        </div>
      ) : (
      <>
      {/* ── Staged attachment ── */}
      {pendingAttachment && (
        <div style={{ padding: "8px 16px 0", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <Cover url={pendingAttachment.type === "track" ? pendingAttachment.track.coverUrl : pendingAttachment.preview.coverUrl} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: colors.teal, fontFamily: font, letterSpacing: "0.6px", textTransform: "uppercase" }}>
              Sharing {pendingAttachment.type === "track" ? "track" : "playlist"}
            </div>
            <div style={{ fontSize: "13px", color: colors.text, fontFamily: font, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {pendingAttachment.type === "track"
                ? `${pendingAttachment.track.title} · ${pendingAttachment.track.artist}`
                : pendingAttachment.preview.title}
            </div>
          </div>
          <button onClick={() => setPendingAttachment(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}>
            <CloseIcon />
          </button>
        </div>
      )}

      {/* ── Composer ── */}
      <div style={{
        padding: "10px 12px 16px", display: "flex", alignItems: "flex-end", gap: "8px",
        borderTop: pendingAttachment ? "none" : `1px solid ${colors.border}`, flexShrink: 0,
      }}>
        <button
          onClick={() => setAttachOpen(true)}
          aria-label="Share music"
          style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", display: "flex" }}
        >
          <MusicPlusIcon />
        </button>
        <textarea
          ref={inputRef}
          value={draft}
          onChange={e => { setDraft(e.target.value); autoGrow(); }}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          rows={1}
          maxLength={2000}
          style={{
            flex: 1, resize: "none", maxHeight: "110px", minHeight: "20px",
            padding: "10px 14px", borderRadius: "20px",
            backgroundColor: colors.inputBg, border: "1.5px solid transparent",
            color: colors.text, fontSize: "14px", lineHeight: "20px", outline: "none",
            fontFamily: font, boxSizing: "content-box",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send"
          style={{
            width: 40, height: 40, borderRadius: "50%", border: "none", flexShrink: 0,
            backgroundColor: canSend ? colors.teal : colors.bgCard,
            cursor: canSend ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background-color 0.15s ease",
          }}
        >
          <SendIcon active={canSend} />
        </button>
      </div>
      </>
      )}

      <LogoutConfirmModal
        isOpen={blockConfirmOpen}
        onCancel={() => setBlockConfirmOpen(false)}
        onConfirm={handleConfirmBlock}
        title={`Block @${otherUser?.username || ""}?`}
        message="They won't be able to send you messages. Your conversation stays as it is, and they won't be notified. You can unblock them anytime."
        confirmLabel={blockPending ? "Blocking..." : "Block"}
        cancelLabel="Cancel"
      />

      <AttachSheet
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        onPick={(att) => { setPendingAttachment(att); setAttachOpen(false); }}
      />
    </div>
  );
}
