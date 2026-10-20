import { useState } from "react";
import { TipHeartIcon } from './TipPanel';
import { formatCents } from '../services/paymentService';

// ─── Tips Received ────────────────────────────────────────────────────────────
// The Profile panel's private list of tips this user has been sent. Only the
// signed-in user ever sees it (GET /api/tips/received only returns your own).
// Anonymous tips show as "Anonymous" with no way to tell who sent them.
//
// Props: data = { count, totalCents, netCents, tips } or null while loading,
//        onOpenUser(username) opens a named tipper's public profile
// ─────────────────────────────────────────────────────────────────────────────

const colors = {
  bgCard: "#2a2a2a",
  teal: "#5DEBD7",
  tealGlow: "rgba(93,235,215,0.15)",
  text: "#ffffff",
  textSecondary: "#aaaaaa",
  muted: "#666666",
  border: "rgba(255,255,255,0.07)",
};
const kanit = "'Kanit', sans-serif";
const COLLAPSED_COUNT = 3;

const LockIcon = ({ size = 11 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="5" y="11" width="14" height="10" rx="2" stroke={colors.muted} strokeWidth="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const timeAgo = (iso) => {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const TipperAvatar = ({ tipper, size = 36 }) => {
  const [failed, setFailed] = useState(false);
  if (!tipper) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        backgroundColor: "#3a3a3a", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" stroke={colors.textSecondary} strokeWidth="1.8" />
          <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke={colors.textSecondary} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  if (tipper.avatarUrl && !failed) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
        <img src={tipper.avatarUrl} alt={tipper.name} onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  const initials = tipper.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const hue = tipper.name.charCodeAt(0) * 37 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, hsl(${hue}, 60%, 45%), hsl(${hue + 40}, 70%, 35%))`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, color: "#fff", fontFamily: kanit,
    }}>
      {initials}
    </div>
  );
};

const forLine = (tip) => {
  if (tip.targetType === 'playlist') return `for your playlist ${tip.targetLabel}`;
  if (tip.targetType === 'post') return `for your post "${tip.targetLabel}"`;
  return `for ${tip.targetLabel}`;
};

const TipRow = ({ tip, onOpenUser }) => (
  <div style={{ display: "flex", gap: "10px", padding: "12px 0", borderTop: `1px solid ${colors.border}` }}>
    <div onClick={tip.tipper ? () => onOpenUser?.(tip.tipper.username) : undefined} style={{ cursor: tip.tipper ? "pointer" : "default" }}>
      <TipperAvatar tipper={tip.tipper} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
        <div
          onClick={tip.tipper ? () => onOpenUser?.(tip.tipper.username) : undefined}
          style={{
            flex: 1, minWidth: 0, fontSize: "13px", fontWeight: 600, fontFamily: kanit,
            color: tip.tipper ? colors.text : colors.textSecondary,
            fontStyle: tip.tipper ? "normal" : "italic",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            cursor: tip.tipper ? "pointer" : "default",
          }}
        >
          {tip.tipper ? tip.tipper.name : 'Anonymous'}
        </div>
        <div style={{ fontSize: "14px", fontWeight: 700, color: colors.teal, fontFamily: kanit, flexShrink: 0 }}>
          {formatCents(tip.amountCents)}
        </div>
      </div>
      <div style={{ fontSize: "11.5px", color: colors.muted, fontFamily: kanit, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {forLine(tip)} · {timeAgo(tip.createdAt)}
      </div>
      {tip.message && (
        <div style={{ fontSize: "12.5px", color: colors.textSecondary, fontFamily: kanit, marginTop: "4px", lineHeight: 1.4, wordBreak: "break-word" }}>
          "{tip.message}"
        </div>
      )}
    </div>
  </div>
);

export default function TipsReceived({ data, onOpenUser }) {
  const [expanded, setExpanded] = useState(false);
  const tips = data?.tips || [];
  const shown = expanded ? tips : tips.slice(0, COLLAPSED_COUNT);

  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: colors.muted, fontFamily: kanit, letterSpacing: "0.8px", textTransform: "uppercase" }}>
          Tips Received
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10.5px", color: colors.muted, fontFamily: kanit }}>
          <LockIcon /> Only you can see this
        </div>
      </div>

      <div style={{ backgroundColor: colors.bgCard, borderRadius: "14px", padding: "14px 14px 2px" }}>
        {/* Totals */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingBottom: "12px" }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%", backgroundColor: colors.tealGlow,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <TipHeartIcon size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "20px", fontWeight: 700, color: colors.text, fontFamily: kanit, lineHeight: 1.1 }}>
              {data ? formatCents(data.totalCents) : '--'}
            </div>
            <div style={{ fontSize: "11.5px", color: colors.muted, fontFamily: kanit }}>
              {data
                ? `${data.count} tip${data.count === 1 ? '' : 's'} · ${formatCents(data.netCents)} after card fees`
                : 'Loading your tips...'}
            </div>
          </div>
        </div>

        {data && tips.length === 0 && (
          <div style={{ borderTop: `1px solid ${colors.border}`, padding: "14px 0", fontSize: "12.5px", color: colors.muted, fontFamily: kanit, textAlign: "center" }}>
            Tips people send you for your music, playlists and posts will show up here.
          </div>
        )}

        {shown.map((tip) => <TipRow key={tip.id} tip={tip} onOpenUser={onOpenUser} />)}

        {tips.length > COLLAPSED_COUNT && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              width: "100%", padding: "10px 0 12px", background: "none", border: "none",
              borderTop: `1px solid ${colors.border}`, color: colors.teal,
              fontSize: "12.5px", fontWeight: 600, fontFamily: kanit, cursor: "pointer",
            }}
          >
            {expanded ? 'Show less' : `See all ${tips.length}`}
          </button>
        )}
      </div>
    </div>
  );
}
