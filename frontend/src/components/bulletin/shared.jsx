import { useState } from "react";
import { usePlayer } from '../../context/PlayerContext';
import { getAlbumTracks } from '../../services/bulletinService';
import { tagColor } from '../../constants/bulletinTags';

// ─── Shared pieces for the Bulletin feed, the post composer and reply threads ──

export const colors = {
  bg: "#222222",
  bgCard: "#2a2a2a",
  bgCardHover: "#303030",
  sheet: "#262626",
  inputBg: "#333333",
  teal: "#5DEBD7",
  tealGlow: "rgba(93,235,215,0.15)",
  text: "#ffffff",
  textSecondary: "#aaaaaa",
  muted: "#666666",
  border: "rgba(255,255,255,0.07)",
  gold: "#f5cf00",
  danger: "#ff6b6b",
  like: "#ff5c8a",
};
export const kanit = "'Kanit', sans-serif";

// ─── Time ─────────────────────────────────────────────────────────────────────
export const timeAgo = (iso) => {
  const then = new Date(iso);
  const secs = Math.max(0, (Date.now() - then.getTime()) / 1000);
  if (secs < 60) return "now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  if (secs < 7 * 86400) return `${Math.floor(secs / 86400)}d`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// 'YYYY-MM-DD' as a local date (new Date('2026-10-20') would be UTC midnight)
export const parseDay = (s) => {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const formatDay = (s, withWeekday = true) => parseDay(s).toLocaleDateString(undefined, {
  ...(withWeekday ? { weekday: "short" } : {}), month: "short", day: "numeric",
});
const isPastDay = (s) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return parseDay(s) < today;
};

export const formatCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n));
const formatMoney = (n) => `$${Number(n).toLocaleString()}`;

// ─── Icons ────────────────────────────────────────────────────────────────────
export const VerifiedBadge = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" fill={colors.teal} />
    <path d="M8 12.5l2.5 2.5L16 9.5" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const HeartIcon = ({ size = 15, color = colors.muted, filled = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"}>
    <path d="M12 21C12 21 3 16 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-9 12-9 12z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CommentIcon = ({ size = 15, color = colors.muted }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const RepostIcon = ({ size = 15, color = colors.muted }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M17 2l4 4-4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 22l-4-4 4-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ShareIcon = ({ size = 15, color = colors.muted }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 6l-4-4-4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 2v13" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const XIcon = ({ color = colors.textSecondary, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const MoreIcon = ({ color = colors.muted, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
  </svg>
);

export const PlayIcon = ({ size = 12, color = "#1a1a1a" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M7 4.5v15l13-7.5z" /></svg>
);
export const PauseIcon = ({ size = 12, color = "#1a1a1a" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
);

export const DiscIcon = ({ size = 20, color = "rgba(255,255,255,0.5)" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8" />
  </svg>
);

export const PhotoIcon = ({ size = 18, color = colors.textSecondary }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth="1.8" />
    <circle cx="8.5" cy="10" r="1.6" fill={color} />
    <path d="M21 16l-5.5-5.5a1.5 1.5 0 0 0-2.1 0L5 19" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const NoteIcon = ({ size = 18, color = colors.textSecondary }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M9 18V6l12-2v12" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="18" r="3" stroke={color} strokeWidth="1.8" />
    <circle cx="18" cy="16" r="3" stroke={color} strokeWidth="1.8" />
  </svg>
);

const CalendarIcon = ({ size = 16, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5" width="18" height="16" rx="2" stroke={color} strokeWidth="1.8" />
    <path d="M3 10h18M8 3v4M16 3v4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const SearchUserIcon = ({ size = 16, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="10" cy="8" r="4" stroke={color} strokeWidth="1.8" />
    <path d="M3 20c0-3.3 3.1-6 7-6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="17" cy="17" r="3" stroke={color} strokeWidth="1.8" />
    <path d="M19.2 19.2L21.5 21.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// ─── Avatar: profile photo when there is one, otherwise initials on the
// author's identity gradient ──────────────────────────────────────────────────
export const hueFor = (name = "") => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
};

export const Avatar = ({ name = "?", size = 42, hue, imageUrl, onClick }) => {
  const initials = name.split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const h = hue ?? hueFor(name);
  return (
    <div onClick={onClick} style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
      background: imageUrl ? colors.bgCard : `linear-gradient(135deg, hsl(${h}, 55%, 42%), hsl(${h + 40}, 60%, 30%))`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: "700", color: "#fff", fontFamily: kanit,
      cursor: onClick ? "pointer" : "default",
    }}>
      {imageUrl ? <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </div>
  );
};

// ─── Tag pill, colored by tag ─────────────────────────────────────────────────
export const TagPill = ({ label, selected = true, onClick, size = "sm" }) => {
  const c = tagColor(label);
  const big = size === "lg";
  return (
    <div onClick={onClick} style={{
      display: "inline-flex", alignItems: "center",
      fontSize: big ? "12px" : "10px", fontWeight: "600", fontFamily: kanit, letterSpacing: "0.3px",
      color: selected ? c : colors.textSecondary,
      backgroundColor: selected ? `${c}22` : "transparent",
      border: `1px solid ${selected ? c : "rgba(255,255,255,0.14)"}`,
      padding: big ? "6px 13px" : "2px 9px", borderRadius: "20px",
      cursor: onClick ? "pointer" : "default", userSelect: "none",
      transition: "all 0.15s ease", whiteSpace: "nowrap",
    }}>
      {label}
    </div>
  );
};

// ─── Tag details (show date, crowdfunding progress, who someone is looking for) ──
const linkStyle = (c) => ({
  marginLeft: "auto", flexShrink: 0, padding: "5px 12px", borderRadius: "14px",
  backgroundColor: c, color: "#1a1a1a", fontSize: "11px", fontWeight: "700",
  fontFamily: kanit, textDecoration: "none",
});

const DetailsShell = ({ tag, children }) => (
  <div style={{
    marginTop: "10px", padding: "10px 12px", borderRadius: "12px",
    backgroundColor: "rgba(255,255,255,0.04)", border: `1px solid ${tagColor(tag)}33`,
    display: "flex", alignItems: "center", gap: "10px",
  }}>
    {children}
  </div>
);

const line1 = { fontSize: "13px", fontWeight: "600", color: colors.text, fontFamily: kanit };
const line2 = { fontSize: "11.5px", color: colors.textSecondary, fontFamily: kanit };

export const PostDetails = ({ tag, details }) => {
  if (!details) return null;
  const c = tagColor(tag);

  if (tag === "Show" && details.date) {
    return (
      <DetailsShell tag={tag}>
        <CalendarIcon color={c} />
        <div style={{ minWidth: 0 }}>
          <div style={line1}>{formatDay(details.date)}{details.venue ? ` · ${details.venue}` : ""}</div>
          {details.city && <div style={line2}>{details.city}</div>}
        </div>
        {details.ticketUrl && (
          <a href={details.ticketUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={linkStyle(c)}>Tickets</a>
        )}
      </DetailsShell>
    );
  }

  if (tag === "Crowdfunding" && details.goal) {
    const goal = Number(details.goal) || 0;
    const raised = Number(details.raised) || 0;
    const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
    return (
      <div style={{ marginTop: "10px", padding: "10px 12px", borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.04)", border: `1px solid ${c}33` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ minWidth: 0 }}>
            <div style={line1}>{formatMoney(raised)} <span style={{ color: colors.textSecondary, fontWeight: "400" }}>of {formatMoney(goal)}</span></div>
            <div style={line2}>{pct >= 100 ? "Funded!" : `${pct}% funded`}{details.endDate ? ` · ends ${formatDay(details.endDate, false)}` : ""}</div>
          </div>
          {details.link && (
            <a href={details.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={linkStyle(c)}>Support</a>
          )}
        </div>
        <div style={{ marginTop: "8px", height: "6px", borderRadius: "3px", backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: "3px", backgroundColor: c }} />
        </div>
      </div>
    );
  }

  if (tag === "Looking For" && details.role) {
    return (
      <DetailsShell tag={tag}>
        <SearchUserIcon color={c} />
        <div style={{ minWidth: 0 }}>
          <div style={line1}>Looking for: {details.role}</div>
          {details.location && <div style={line2}>{details.location}</div>}
        </div>
      </DetailsShell>
    );
  }

  if (tag === "New Release" && details.releaseDate) {
    return (
      <DetailsShell tag={tag}>
        <CalendarIcon color={c} />
        <div style={line1}>{isPastDay(details.releaseDate) ? `Out since ${formatDay(details.releaseDate, false)}` : `Out ${formatDay(details.releaseDate)}`}</div>
      </DetailsShell>
    );
  }

  if (tag === "Show Recap" && (details.artist || details.venue)) {
    return (
      <DetailsShell tag={tag}>
        <NoteIcon color={c} size={16} />
        <div style={line1}>{[details.artist, details.venue].filter(Boolean).join(" at ")}</div>
      </DetailsShell>
    );
  }

  return null;
};

// ─── Music card: a shared track or album, tap to play through the global player ──
export const MusicCard = ({ type, item, onRemove }) => {
  const { playTrack, togglePlay, currentTrack, isPlaying } = usePlayer();
  const [loading, setLoading] = useState(false);
  const isAlbum = type === "album";
  const isThis = currentTrack && currentTrack.artist === item.artist && (
    isAlbum ? currentTrack.album === item.album : currentTrack.title === item.title
  );
  const playingThis = isThis && isPlaying;

  const handlePlay = async (e) => {
    e.stopPropagation();
    if (onRemove) return; // preview inside the composer
    if (isThis) { togglePlay(); return; }
    if (!isAlbum) { playTrack(item, [item], 0); return; }
    setLoading(true);
    try {
      const tracks = await getAlbumTracks(item.artist, item.album);
      if (tracks.length) playTrack(tracks[0], tracks, 0);
    } catch (err) {
      console.log('Could not load album:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={handlePlay} style={{
      display: "flex", alignItems: "center", gap: "10px", marginTop: "10px",
      padding: "8px", borderRadius: "14px", cursor: onRemove ? "default" : "pointer",
      backgroundColor: "rgba(255,255,255,0.05)", border: `1px solid ${colors.border}`,
    }}>
      <div style={{ width: 48, height: 48, borderRadius: isAlbum ? "6px" : "10px", overflow: "hidden", flexShrink: 0, backgroundColor: "#333", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {item.coverUrl ? <img src={item.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <DiscIcon />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "10px", fontWeight: "700", color: colors.teal, fontFamily: kanit, letterSpacing: "0.6px", textTransform: "uppercase" }}>
          {isAlbum ? "Album" : "Track"}
        </div>
        <div style={{ fontSize: "13px", fontWeight: "600", color: colors.text, fontFamily: kanit, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {isAlbum ? item.album : item.title}
        </div>
        <div style={{ fontSize: "12px", color: colors.textSecondary, fontFamily: kanit, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.artist}
        </div>
      </div>
      {onRemove ? (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex" }}>
          <XIcon size={16} />
        </button>
      ) : (
        <div style={{
          width: 32, height: 32, borderRadius: "50%", backgroundColor: colors.teal, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center", opacity: loading ? 0.5 : 1,
        }}>
          {playingThis ? <PauseIcon /> : <PlayIcon />}
        </div>
      )}
    </div>
  );
};

// ─── Placeholder media for the seeded demo posts (no real image files) ──
export const SeedMediaBlock = ({ media, hue = 190 }) => (
  <div style={{
    width: "100%", aspectRatio: "16 / 9", borderRadius: "12px", marginTop: "10px",
    overflow: "hidden", position: "relative",
    background: `linear-gradient(150deg, hsl(${hue}, 55%, 26%) 0%, hsl(${hue + 40}, 45%, 16%) 100%)`,
    display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    {media.type === "album" ? <DiscIcon size={26} color="rgba(255,255,255,0.55)" />
      : media.type === "concert" ? <NoteIcon size={26} color="rgba(255,255,255,0.55)" />
      : <PhotoIcon size={26} color="rgba(255,255,255,0.55)" />}
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, padding: "18px 12px 10px",
      background: "linear-gradient(0deg, rgba(0,0,0,0.55) 0%, transparent 100%)",
    }}>
      <div style={{ fontSize: "12px", fontWeight: "600", color: "#fff", fontFamily: kanit, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
        {media.label}
      </div>
    </div>
  </div>
);

export const PostImage = ({ url }) => (
  <div style={{ marginTop: "10px", borderRadius: "12px", overflow: "hidden", backgroundColor: "#1c1c1c" }}>
    <img src={url} alt="" style={{ width: "100%", maxHeight: "340px", objectFit: "cover", display: "block" }} />
  </div>
);

// ─── Action bar button ───────────────────────────────────────────────────────
const StatButton = ({ icon, count, onClick, active, activeColor }) => (
  <button
    onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
    style={{
      display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none",
      padding: "2px 0", cursor: onClick ? "pointer" : "default",
    }}
  >
    {icon}
    {count > 0 && (
      <span style={{ fontSize: "11px", color: active ? activeColor : colors.muted, fontFamily: kanit }}>
        {formatCount(count)}
      </span>
    )}
  </button>
);

// ─── A post in the feed, or the head of a reply thread (inThread) ────────────
export const FeedPost = ({ post, index = 0, inThread = false, onToggleLike, onOpenThread, onOpenAuthor, onDelete }) => {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { author } = post;
  const authorClickable = !author.seeded && onOpenAuthor;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(post);
    } catch (err) {
      setDeleting(false);
    }
  };

  return (
    <div
      onClick={!inThread && onOpenThread ? () => onOpenThread(post) : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
      style={{
        backgroundColor: !inThread && hovered ? colors.bgCardHover : colors.bgCard,
        borderRadius: "16px", padding: "14px", marginBottom: "10px",
        border: `1px solid ${colors.border}`, transition: "background-color 0.2s ease",
        cursor: !inThread && onOpenThread ? "pointer" : "default",
        position: "relative",
        ...(inThread ? {} : { animation: `fadeSlideUp 0.4s ease ${Math.min(index, 8) * 0.05}s forwards`, opacity: 0 }),
      }}
    >
      <div style={{ display: "flex", gap: "10px" }}>
        <Avatar
          name={author.name} hue={author.hue} imageUrl={author.profilePicture}
          onClick={authorClickable ? (e) => { e.stopPropagation(); onOpenAuthor(author, post.mine); } : undefined}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap", paddingRight: post.mine ? "22px" : 0 }}>
            <span
              onClick={authorClickable ? (e) => { e.stopPropagation(); onOpenAuthor(author, post.mine); } : undefined}
              style={{ fontSize: "13px", fontWeight: "700", color: colors.text, fontFamily: kanit, cursor: authorClickable ? "pointer" : "inherit" }}
            >
              {author.name}
            </span>
            {author.isArtist && <VerifiedBadge />}
            {author.username && (
              <span style={{ fontSize: "12px", color: colors.muted, fontFamily: kanit }}>@{author.username}</span>
            )}
            <span style={{ fontSize: "11px", color: colors.muted }}>·</span>
            <span style={{ fontSize: "12px", color: colors.muted, fontFamily: kanit }}>{timeAgo(post.createdAt)}</span>
          </div>

          {post.tag && <div style={{ marginTop: "4px" }}><TagPill label={post.tag} /></div>}

          <div style={{
            fontSize: inThread ? "14px" : "13px", color: colors.text, fontFamily: kanit,
            lineHeight: 1.5, marginTop: "8px", whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {post.body}
          </div>

          <PostDetails tag={post.tag} details={post.details} />
          {post.imageUrl && <PostImage url={post.imageUrl} />}
          {post.seedMedia && <SeedMediaBlock media={post.seedMedia} hue={author.hue ?? 190} />}
          {post.attachment && <MusicCard type={post.attachmentType} item={post.attachment} />}

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginTop: "12px", paddingTop: "10px", borderTop: `1px solid ${colors.border}`, maxWidth: "260px",
          }}>
            <StatButton
              icon={<HeartIcon color={post.likedByMe ? colors.like : colors.muted} filled={post.likedByMe} />}
              count={post.likeCount} active={post.likedByMe} activeColor={colors.like}
              onClick={onToggleLike ? () => onToggleLike(post) : undefined}
            />
            <StatButton
              icon={<CommentIcon />} count={post.replyCount}
              onClick={!inThread && onOpenThread ? () => onOpenThread(post) : undefined}
            />
            <StatButton icon={<RepostIcon />} count={post.repostCount} />
            <StatButton icon={<ShareIcon />} />
          </div>
        </div>
      </div>

      {/* ── Your own post: ⋯ menu with Delete (inline confirm, no browser dialog) ── */}
      {post.mine && onDelete && (
        <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "10px", right: "10px" }}>
          <button onClick={() => { setMenuOpen(o => !o); setConfirmDelete(false); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}>
            <MoreIcon />
          </button>
          {menuOpen && (
            <div style={{
              position: "absolute", top: "26px", right: 0, zIndex: 5, minWidth: "170px",
              backgroundColor: "#333", borderRadius: "12px", padding: "6px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)", border: `1px solid ${colors.border}`,
            }}>
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} style={menuItemStyle(colors.danger)}>Delete post</button>
              ) : (
                <>
                  <div style={{ fontSize: "12px", color: colors.textSecondary, fontFamily: kanit, padding: "6px 10px" }}>Delete this post for good?</div>
                  <div style={{ display: "flex", gap: "6px", padding: "4px" }}>
                    <button onClick={() => { setConfirmDelete(false); setMenuOpen(false); }} style={{ ...pillBtn, flex: 1 }}>Cancel</button>
                    <button onClick={handleDelete} disabled={deleting} style={{ ...pillBtn, flex: 1, backgroundColor: colors.danger, color: "#1a1a1a", opacity: deleting ? 0.6 : 1 }}>
                      {deleting ? "..." : "Delete"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const menuItemStyle = (color) => ({
  width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer",
  padding: "8px 10px", borderRadius: "8px", color, fontSize: "13px", fontFamily: kanit, fontWeight: "500",
});

const pillBtn = {
  padding: "6px 10px", borderRadius: "14px", border: "none", cursor: "pointer",
  backgroundColor: "rgba(255,255,255,0.08)", color: colors.text, fontSize: "12px", fontWeight: "600", fontFamily: kanit,
};
