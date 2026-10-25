import { useState, useEffect, useRef } from "react";
import { getBulletinReplies, createBulletinReply, deleteBulletinReply } from '../../services/bulletinService';
import { MAX_REPLY_LENGTH } from '../../constants/bulletinTags';
import { colors, kanit, Avatar, VerifiedBadge, FeedPost, XIcon, timeAgo } from './shared';

// ─── Reply thread ─────────────────────────────────────────────────────────────
// Slides up when a post (or its comment button) is tapped: the post at the
// top, replies oldest first, and a reply box pinned to the bottom. Closing
// slides it back down.
//
// Props:
//   post          the post, live from the feed's state so likes stay in sync
//   user          the signed-in user (getMe)
//   onClose       () => void, after the slide-down
//   onPostChange  (postId, patch) => void, e.g. a new replyCount
//   onToggleLike / onDelete / onOpenAuthor  same handlers the feed uses
// ─────────────────────────────────────────────────────────────────────────────

const CLOSE_MS = 260;

const Reply = ({ reply, onDelete, onOpenAuthor }) => {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { author } = reply;
  const clickable = !author.seeded && onOpenAuthor;

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return; }
    setDeleting(true);
    try { await onDelete(reply); } catch (err) { setDeleting(false); setConfirming(false); }
  };

  return (
    <div style={{ display: "flex", gap: "10px", padding: "12px 4px", borderBottom: `1px solid ${colors.border}`, animation: "bulletinFadeIn 0.25s ease" }}>
      <Avatar
        name={author.name} hue={author.hue} imageUrl={author.profilePicture} size={34}
        onClick={clickable ? () => onOpenAuthor(author, reply.mine) : undefined}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
          <span
            onClick={clickable ? () => onOpenAuthor(author, reply.mine) : undefined}
            style={{ fontSize: "12.5px", fontWeight: "700", color: colors.text, fontFamily: kanit, cursor: clickable ? "pointer" : "default" }}
          >
            {author.name}
          </span>
          {author.verified && <VerifiedBadge size={12} />}
          {author.username && <span style={{ fontSize: "11.5px", color: colors.muted, fontFamily: kanit }}>@{author.username}</span>}
          <span style={{ fontSize: "11px", color: colors.muted }}>·</span>
          <span style={{ fontSize: "11.5px", color: colors.muted, fontFamily: kanit }}>{timeAgo(reply.createdAt)}</span>
          {reply.pending && <span style={{ fontSize: "11px", color: colors.muted, fontFamily: kanit }}>· sending</span>}
        </div>
        <div style={{ fontSize: "13px", color: colors.text, fontFamily: kanit, lineHeight: 1.45, marginTop: "3px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {reply.body}
        </div>
        {reply.mine && !reply.pending && (
          <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
            <button onClick={handleDelete} disabled={deleting} style={{
              background: "none", border: "none", padding: 0, cursor: "pointer",
              fontSize: "11px", fontFamily: kanit, color: confirming ? colors.danger : colors.muted,
            }}>
              {deleting ? "Deleting..." : confirming ? "Tap again to delete" : "Delete"}
            </button>
            {confirming && !deleting && (
              <button onClick={() => setConfirming(false)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "11px", fontFamily: kanit, color: colors.muted }}>
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function PostThreadSheet({ post, user, onClose, onPostChange, onToggleLike, onDelete, onOpenAuthor }) {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [closing, setClosing] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const postId = post?.id;

  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, CLOSE_MS);
  };

  useEffect(() => {
    if (!postId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const data = await getBulletinReplies(postId);
        if (cancelled) return;
        setReplies(data.replies);
        onPostChange(postId, { replyCount: data.replies.length, likeCount: data.post.likeCount, likedByMe: data.post.likedByMe });
      } catch (err) {
        if (!cancelled) setLoadError(err?.response?.status === 404 ? "This post was deleted." : "Couldn't load replies.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || sending || body.length > MAX_REPLY_LENGTH) return;
    setSending(true);
    setSendError(null);
    const tempId = `pending-${Date.now()}`;
    const optimistic = {
      id: tempId, postId, mine: true, pending: true, body, createdAt: new Date().toISOString(),
      author: {
        id: user?.id, username: user?.username, name: user?.display_name || user?.username || "You",
        profilePicture: user?.profile_picture || null, isArtist: Boolean(user?.is_artist), hue: null, seeded: false,
      },
    };
    setReplies(r => [...r, optimistic]);
    setDraft("");
    scrollToBottom();
    try {
      const { reply, replyCount } = await createBulletinReply(postId, body);
      setReplies(r => r.map(x => (x.id === tempId ? reply : x)));
      onPostChange(postId, { replyCount });
    } catch (err) {
      setReplies(r => r.filter(x => x.id !== tempId));
      setDraft(body);
      setSendError(err?.response?.data?.error || "Couldn't send your reply.");
    } finally {
      setSending(false);
      inputRef.current?.focus({ preventScroll: true });
    }
  };

  const removeReply = async (reply) => {
    await deleteBulletinReply(reply.id);
    setReplies(r => {
      const next = r.filter(x => x.id !== reply.id);
      onPostChange(postId, { replyCount: next.length });
      return next;
    });
  };

  const handleDeletePost = async (p) => {
    await onDelete(p);
    close();
  };

  const over = draft.length > MAX_REPLY_LENGTH;
  const canSend = draft.trim().length > 0 && !sending && !over && !loadError;

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 1050, backgroundColor: "rgba(0,0,0,0.55)",
      animation: closing ? `bulletinFadeOut ${CLOSE_MS}ms ease forwards` : "bulletinFadeIn 0.2s ease",
    }}>
      <style>{`
        @keyframes bulletinFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bulletinFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes bulletinSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes bulletinSheetDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
        .bulletin-thread textarea::placeholder { color: #666; }
      `}</style>
      <div onClick={close} style={{ position: "absolute", inset: 0 }} />

      <div className="bulletin-thread" style={{
        position: "absolute", left: 0, right: 0, bottom: 0, top: "44px",
        backgroundColor: colors.bg, borderRadius: "24px 24px 0 0",
        boxShadow: "0 -12px 40px rgba(0,0,0,0.6)",
        animation: closing
          ? `bulletinSheetDown ${CLOSE_MS}ms cubic-bezier(0.4, 0, 1, 1) forwards`
          : "bulletinSheetUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{
          padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${colors.border}`, flexShrink: 0,
        }}>
          <div style={{ width: "26px" }} />
          <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: kanit }}>Post</div>
          <button onClick={close} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", width: "26px", justifyContent: "flex-end" }}>
            <XIcon />
          </button>
        </div>

        <div ref={listRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 14px 10px" }}>
          {post && (
            <FeedPost
              post={post} inThread
              onToggleLike={onToggleLike} onOpenAuthor={onOpenAuthor} onDelete={handleDeletePost}
            />
          )}

          <div style={{ fontSize: "11px", fontWeight: "600", color: colors.textSecondary, fontFamily: kanit, letterSpacing: "0.4px", textTransform: "uppercase", padding: "6px 4px 2px" }}>
            Replies
          </div>

          {loading && <div style={emptyStyle}>Loading replies...</div>}
          {!loading && loadError && <div style={emptyStyle}>{loadError}</div>}
          {!loading && !loadError && replies.length === 0 && <div style={emptyStyle}>No replies yet. Start the conversation.</div>}
          {replies.map(r => (
            <Reply key={r.id} reply={r} onDelete={removeReply} onOpenAuthor={onOpenAuthor} />
          ))}
        </div>

        {/* ── Reply box ── */}
        <div style={{ flexShrink: 0, borderTop: `1px solid ${colors.border}`, padding: "10px 14px 14px", backgroundColor: colors.bg }}>
          {sendError && <div style={{ fontSize: "11.5px", color: colors.danger, fontFamily: kanit, marginBottom: "6px" }}>{sendError}</div>}
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
            <Avatar name={user?.display_name || user?.username || "You"} size={30} imageUrl={user?.profile_picture} />
            <textarea
              ref={inputRef}
              value={draft}
              onChange={e => { setDraft(e.target.value); setSendError(null); }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={post?.author?.name ? `Reply to ${post.author.name}...` : "Write a reply..."}
              rows={1}
              disabled={Boolean(loadError)}
              style={{
                flex: 1, resize: "none", maxHeight: "90px", padding: "9px 12px", borderRadius: "18px",
                backgroundColor: colors.inputBg, border: `1.5px solid ${over ? colors.danger : "transparent"}`,
                color: colors.text, fontSize: "13px", outline: "none", fontFamily: kanit, lineHeight: 1.4,
              }}
            />
            <button onClick={send} disabled={!canSend} style={{
              padding: "8px 14px", borderRadius: "18px", border: "none",
              backgroundColor: canSend ? colors.teal : "rgba(93,235,215,0.15)",
              color: canSend ? "#1a1a1a" : "rgba(93,235,215,0.5)",
              fontSize: "12.5px", fontWeight: "700", fontFamily: kanit, cursor: canSend ? "pointer" : "default",
            }}>
              Reply
            </button>
          </div>
          {over && <div style={{ fontSize: "11px", color: colors.danger, fontFamily: kanit, marginTop: "4px" }}>Replies can be up to {MAX_REPLY_LENGTH} characters.</div>}
        </div>
      </div>
    </div>
  );
}

const emptyStyle = { textAlign: "center", color: colors.muted, fontFamily: kanit, fontSize: "12.5px", padding: "22px 0" };
