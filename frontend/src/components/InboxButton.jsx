import { useUI } from '../context/UIContext';
import { ChatIcon, colors, font } from './messages/shared';

// ─── Header chat-bubble button — opens the Messages inbox, with a teal unread
// badge driven by UIContext's polled unreadMessageCount ──
export default function InboxButton() {
  const { openInbox, unreadMessageCount } = useUI();

  return (
    <button
      onClick={openInbox}
      aria-label="Messages"
      style={{
        background: "none", border: "none", cursor: "pointer",
        padding: "4px", position: "relative", display: "flex",
      }}
    >
      <ChatIcon size={24} />
      {unreadMessageCount > 0 && (
        <span style={{
          position: "absolute", top: "-2px", right: "-4px",
          minWidth: "16px", height: "16px", borderRadius: "8px",
          backgroundColor: colors.teal, color: "#111",
          fontSize: "10px", fontWeight: "700", fontFamily: font,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 4px", boxSizing: "border-box",
          border: `2px solid ${colors.bg}`,
        }}>
          {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
        </span>
      )}
    </button>
  );
}
