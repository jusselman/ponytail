import InboxPanel from './InboxPanel';
import ConversationPanel from './ConversationPanel';

// ─── Mount once per screen, next to ProfilePanel/PublicPlaylistPanel. Z-order:
// UserProfilePanel (1100) < Inbox (1105) < Conversation (1110) < PublicPlaylistPanel
// (1120), so a thread opens over a profile, and a shared playlist opens over the thread. ──
export default function MessagesLayer() {
  return (
    <>
      <InboxPanel />
      <ConversationPanel />
    </>
  );
}
