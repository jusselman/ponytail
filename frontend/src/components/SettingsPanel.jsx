import { useState } from 'react';
import { useUI } from '../context/UIContext';
import { logout, deleteAccount } from '../services/authService';
import EditProfilePanel from './EditProfilePanel';
import ChangePasswordPanel from './ChangePasswordPanel';
import LogoutConfirmModal from './LogoutConfirmModal';
import DeleteAccountModal from './DeleteAccountModal';

const colors = {
  bg: "#222222",
  bgCard: "#2a2a2a",
  bgCardHover: "#303030",
  teal: "#5DEBD7",
  tealGlow: "rgba(93,235,215,0.15)",
  text: "#ffffff",
  textSecondary: "#aaaaaa",
  muted: "#666666",
  border: "rgba(255,255,255,0.07)",
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const ChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M15 18l-6-6 6-6" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M9 18l6-6-6-6" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Settings sections ────────────────────────────────────────────────────────
const SETTINGS = [
  {
    section: "Account",
    items: [
      { label: "Edit Profile", icon: "user" },
      { label: "Change Password", icon: "lock" },
    ],
  },
  {
    section: "Notifications",
    items: [
      { label: "New Releases", icon: "bell", value: "On" },
      { label: "Concert Alerts", icon: "pin", value: "On" },
      { label: "Messages", icon: "message", value: "On" },
    ],
  },
  {
    section: "Support",
    items: [
      { label: "Help Center", icon: "help" },
      { label: "Report a Problem", icon: "flag" },
      { label: "About Ponytail", icon: "info" },
    ],
  },
  {
    section: "Account Actions",
    items: [
      { label: "Log Out", icon: "logout", danger: true },
      { label: "Delete Account", icon: "trash", danger: true },
    ],
  },
];

// ─── Setting Icon ─────────────────────────────────────────────────────────────
const SettingIcon = ({ type, danger }) => {
  const stroke = danger ? "#ff6b6b" : colors.muted;
  const icons = {
    user: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" stroke={stroke} strokeWidth="1.8" /><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" /></>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" /></>,
    pin: <><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke={stroke} strokeWidth="1.8" /><circle cx="12" cy="9" r="2.5" stroke={stroke} strokeWidth="1.8" /></>,
    message: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></>,
    help: <><circle cx="12" cy="12" r="10" stroke={stroke} strokeWidth="1.8" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" /></>,
    flag: <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><line x1="4" y1="22" x2="4" y2="15" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" /></>,
    info: <><circle cx="12" cy="12" r="10" stroke={stroke} strokeWidth="1.8" /><line x1="12" y1="8" x2="12" y2="12" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" /><line x1="12" y1="16" x2="12.01" y2="16" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></>,
    trash: <><polyline points="3 6 5 6 21 6" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" /></>,
  };

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      {icons[type]}
    </svg>
  );
};

// ─── Settings Panel ───────────────────────────────────────────────────────────
export default function SettingsPanel() {
  const {
    isSettingsOpen, closeSettings,
    closeProfile, setUser, setProfileImage, setScreen,
  } = useUI();
  // ── Only "Edit Profile", "Change Password", "Log Out", and "Delete Account"
  // are wired up so far — everything else in SETTINGS is still a static
  // placeholder row. ──
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  // ── Change Password also asks "are you sure?" first, same as logout/delete,
  // before it ever shows the actual form. ──
  const [isChangePasswordConfirmOpen, setIsChangePasswordConfirmOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  // ── Delete Account is two steps on purpose, given how serious/irreversible
  // it is: a plain "are you sure?" first, and only on "Yes" does the real,
  // can't-be-undone confirmation (with the anxious pony) appear. ──
  const [isDeleteStep1Open, setIsDeleteStep1Open] = useState(false);
  const [isDeleteStep2Open, setIsDeleteStep2Open] = useState(false);

  // ── Shared cleanup for both logging out and finishing an account deletion:
  // clears the stored auth token, resets the shared UIContext user/avatar/
  // panel-open state (so the next login doesn't briefly flash the previous
  // account's data or an already-open settings panel), then hands navigation
  // back to App.js's top-level screen switcher to land on the login screen —
  // completing the session either way. ──
  const endSession = async () => {
    await logout();
    closeSettings();
    closeProfile();
    setUser(null);
    setProfileImage(null);
    setScreen("login");
  };

  const handleConfirmLogout = async () => {
    setIsLogoutConfirmOpen(false);
    await endSession();
  };

  // ── The actual delete call — left to throw on failure so DeleteAccountModal's
  // own try/catch can show the error and let the user retry, rather than
  // silently closing on a failed request. ──
  const handleConfirmDeleteAccount = async () => {
    await deleteAccount();
    setIsDeleteStep2Open(false);
    await endSession();
  };

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      zIndex: 1100,
      pointerEvents: isSettingsOpen ? "all" : "none",
    }}>
      {/* Backdrop */}
      {isSettingsOpen && (
        <div
          onClick={closeSettings}
          style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 0 }}
        />
      )}

      {/* Panel — slides in from right */}
      <div style={{
        position: "absolute",
        top: 0, right: 0, bottom: 0,
        width: "88%",
        backgroundColor: colors.bg,
        zIndex: 1,
        transform: isSettingsOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{
          padding: "48px 20px 16px",
          borderBottom: `1px solid ${colors.border}`,
          display: "flex", alignItems: "center", gap: "12px",
          flexShrink: 0,
        }}>
          <button
            onClick={closeSettings}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}
          >
            <ChevronLeft />
          </button>
          <div style={{ fontSize: "18px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.3px" }}>
            Settings
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {SETTINGS.map((group, gi) => (
            <div key={gi} style={{ marginBottom: "8px" }}>
              <div style={{
                fontSize: "11px", fontWeight: "600", color: colors.muted,
                fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px",
                textTransform: "uppercase", padding: "12px 20px 6px",
              }}>
                {group.section}
              </div>
              {group.items.map((item, ii) => (
                <div
                  key={ii}
                  onClick={() => {
                    if (item.label === "Edit Profile") setIsEditProfileOpen(true);
                    if (item.label === "Change Password") setIsChangePasswordConfirmOpen(true);
                    if (item.label === "Log Out") setIsLogoutConfirmOpen(true);
                    if (item.label === "Delete Account") setIsDeleteStep1Open(true);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    padding: "13px 20px",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                    borderBottom: ii < group.items.length - 1 ? `1px solid ${colors.border}` : "none",
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.bgCard}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <SettingIcon type={item.icon} danger={item.danger} />
                  <div style={{ flex: 1, fontSize: "14px", fontWeight: "500", color: item.danger ? "#ff6b6b" : colors.text, fontFamily: "'Kanit', sans-serif" }}>
                    {item.label}
                  </div>
                  {item.value && (
                    <div style={{ fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
                      {item.value}
                    </div>
                  )}
                  {!item.danger && <ChevronRight />}
                </div>
              ))}
            </div>
          ))}
          <div style={{ height: "20px" }} />
        </div>

        {/* Edit Profile / Change Password — slide in over the settings list,
        within this same panel's bounds (position: absolute + inset: 0 resolves
        against this div, its nearest positioned ancestor). */}
        <EditProfilePanel isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} />
        <ChangePasswordPanel isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
      </div>

      {/* Log Out confirmation — deliberately a sibling of the 88%-wide sliding
      panel above (not nested inside it), so this bottom sheet spans the full
      screen card width like other bottom sheets in the app (UploadTrackPanel,
      SongPanel) instead of being confined to the settings drawer's own width. */}
      <LogoutConfirmModal
        isOpen={isLogoutConfirmOpen}
        onCancel={() => setIsLogoutConfirmOpen(false)}
        onConfirm={handleConfirmLogout}
      />

      {/* Change Password confirmation — same "are you sure?" pattern as logout,
      before the actual form (nested above) is ever shown. */}
      <LogoutConfirmModal
        isOpen={isChangePasswordConfirmOpen}
        onCancel={() => setIsChangePasswordConfirmOpen(false)}
        onConfirm={() => {
          setIsChangePasswordConfirmOpen(false);
          setIsChangePasswordOpen(true);
        }}
        title="Change your password?"
        message="You'll be asked for your current password and a new one."
        confirmLabel="Yes"
        cancelLabel="No"
      />

      {/* Delete Account, step 1 — plain "are you sure?" reusing the same generic
      modal as logout. Only "Yes" here advances to the real, irreversible
      confirmation below. */}
      <LogoutConfirmModal
        isOpen={isDeleteStep1Open}
        onCancel={() => setIsDeleteStep1Open(false)}
        onConfirm={() => {
          setIsDeleteStep1Open(false);
          setIsDeleteStep2Open(true);
        }}
        title="Delete your account?"
        message="This permanently removes your profile, playlists, and follows. You'll be asked to confirm once more."
        confirmLabel="Yes"
        cancelLabel="No"
      />

      {/* Delete Account, step 2 — the actual point of no return */}
      <DeleteAccountModal
        isOpen={isDeleteStep2Open}
        onCancel={() => setIsDeleteStep2Open(false)}
        onConfirmDelete={handleConfirmDeleteAccount}
      />
    </div>
  );
}