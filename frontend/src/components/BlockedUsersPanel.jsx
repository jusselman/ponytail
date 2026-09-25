import { useState, useEffect } from "react";
import { useUI } from '../context/UIContext';
import { getBlockedUsers, unblockUser } from '../services/blockService';
import { LibrarySubPanel, LibraryRow, RowText, EmptyState, LoadingState, colors, font } from './library/shared';
import { UserAvatar } from './messages/shared';

// ─── Settings > Privacy > Blocked Users. Everyone you've blocked, with an
// Unblock button each. Unblocking lets them message you again; your
// conversation with them was never touched, so nothing needs restoring. ──
export default function BlockedUsersPanel({ isOpen, onClose, onCountChange }) {
  const { refreshUnreadCount } = useUI();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    getBlockedUsers()
      .then(list => { if (!cancelled) { setUsers(list); onCountChange?.(list.length); } })
      .catch(err => console.log('Failed to fetch blocked users:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleUnblock = async (u) => {
    if (pending[u.username]) return;
    setPending(prev => ({ ...prev, [u.username]: true }));
    try {
      await unblockUser(u.username);
      setUsers(prev => {
        const next = prev.filter(x => x.username !== u.username);
        onCountChange?.(next.length);
        return next;
      });
      refreshUnreadCount();
    } catch (err) {
      console.log('Failed to unblock user:', err);
      alert("Couldn't unblock this account right now.");
    } finally {
      setPending(prev => { const { [u.username]: _, ...rest } = prev; return rest; });
    }
  };

  return (
    <LibrarySubPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Blocked Users"
      subtitle={users.length ? `${users.length} blocked` : null}
    >
      {loading && users.length === 0 ? (
        <LoadingState />
      ) : users.length === 0 ? (
        <EmptyState
          title="No one is blocked"
          message="When you block someone from a conversation or their profile, they can't send you messages. They'll show up here so you can unblock them later."
        />
      ) : (
        users.map(u => (
          <LibraryRow key={u.username}>
            <UserAvatar name={u.displayName} picture={u.profilePicture} size={44} />
            <RowText title={u.displayName} subtitle={`@${u.username}${u.isArtist ? " · Artist" : ""}`} />
            <button
              onClick={(e) => { e.stopPropagation(); handleUnblock(u); }}
              disabled={!!pending[u.username]}
              style={{
                padding: "6px 14px", borderRadius: "16px", flexShrink: 0,
                border: `1.5px solid ${colors.teal}`, backgroundColor: colors.tealGlow,
                color: colors.teal, fontSize: "12px", fontWeight: "600", fontFamily: font,
                cursor: pending[u.username] ? "default" : "pointer",
                opacity: pending[u.username] ? 0.6 : 1,
              }}
            >
              Unblock
            </button>
          </LibraryRow>
        ))
      )}
      <div style={{ height: "20px" }} />
    </LibrarySubPanel>
  );
}
