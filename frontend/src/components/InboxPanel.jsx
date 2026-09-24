import { useState, useEffect, useCallback } from "react";
import { useUI } from '../context/UIContext';
import { getConversations } from '../services/messageService';
import { colors, font, UserAvatar, ArtistBadge, ChatIcon, shortTime, previewText } from './messages/shared';

const ChevronDown = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <path d="M6 9l6 6 6-6" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── One conversation row ──
const ConversationRow = ({ convo, onTap }) => {
  const [hover, setHover] = useState(false);
  const unread = convo.unreadCount > 0;
  const { otherUser, lastMessage } = convo;

  return (
    <div
      onClick={() => onTap(convo)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "12px 20px", cursor: "pointer",
        backgroundColor: hover ? colors.bgCard : "transparent",
        transition: "background-color 0.15s ease",
      }}
    >
      <UserAvatar name={otherUser.displayName} picture={otherUser.profilePicture} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
          <span style={{
            fontSize: "14px", fontWeight: unread ? "700" : "600", color: colors.text, fontFamily: font,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {otherUser.displayName}
          </span>
          {otherUser.isArtist && <ArtistBadge />}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px", minWidth: 0 }}>
          <span style={{
            fontSize: "13px", fontFamily: font,
            color: unread ? colors.text : colors.textSecondary,
            fontWeight: unread ? "600" : "400",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0,
          }}>
            {previewText(lastMessage)}
          </span>
          <span style={{ fontSize: "12px", color: colors.muted, fontFamily: font, flexShrink: 0 }}>
            · {shortTime(lastMessage.createdAt)}
          </span>
        </div>
      </div>
      {unread && (
        <div style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: colors.teal, flexShrink: 0 }} />
      )}
    </div>
  );
};

// ─── Messages inbox — every DM thread, most recent first. Opened from the chat
// icon in the header. Tapping a row opens ConversationPanel on top of this. ──
export default function InboxPanel() {
  const { isInboxOpen, closeInbox, openConversation, activeConversation, refreshUnreadCount } = useUI();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setConversations(await getConversations());
    } catch (err) {
      console.log('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load on open, re-sync when a thread closes (its unread state and last
  // message may have changed), and poll every 10s while visible ──
  useEffect(() => {
    if (!isInboxOpen) return;
    load();
    refreshUnreadCount();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [isInboxOpen, activeConversation, load, refreshUnreadCount]);

  return (
    <>
      {isInboxOpen && (
        <div
          onClick={closeInbox}
          style={{ position: "absolute", inset: 0, zIndex: 1104, backgroundColor: "rgba(0,0,0,0.6)" }}
        />
      )}

      <div style={{
        position: "absolute", inset: 0, zIndex: 1105,
        backgroundColor: colors.bg,
        transform: isInboxOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        pointerEvents: isInboxOpen ? "all" : "none",
      }}>
        {/* ── Header ── */}
        <div style={{
          padding: "16px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${colors.border}`, flexShrink: 0,
        }}>
          <button onClick={closeInbox} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}>
            <ChevronDown />
          </button>
          <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: font, letterSpacing: "0.3px" }}>
            Messages
          </div>
          <div style={{ width: "28px" }} />
        </div>

        {/* ── List ── */}
        <div style={{ flex: 1, overflowY: "auto", paddingTop: "6px" }}>
          {loading && conversations.length === 0 ? (
            <div style={{ textAlign: "center", color: colors.muted, fontFamily: font, fontSize: "14px", padding: "40px 0" }}>
              Loading...
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%", backgroundColor: colors.bgCard,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <ChatIcon size={28} stroke={colors.muted} />
              </div>
              <div style={{ fontSize: "16px", fontWeight: "600", color: colors.text, fontFamily: font }}>
                No messages yet
              </div>
              <div style={{ fontSize: "13px", color: colors.textSecondary, fontFamily: font, lineHeight: 1.5 }}>
                Visit a musician's or listener's profile and tap Message to start a conversation.
              </div>
            </div>
          ) : (
            conversations.map(convo => (
              <ConversationRow
                key={convo.id}
                convo={convo}
                onTap={(c) => openConversation({ id: c.id, otherUser: c.otherUser })}
              />
            ))
          )}
          <div style={{ height: "20px" }} />
        </div>
      </div>
    </>
  );
}
