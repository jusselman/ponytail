import { useUI } from '../context/UIContext';

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
      { label: "Email Preferences", icon: "mail" },
      { label: "Connected Accounts", icon: "link" },
    ],
  },
  {
    section: "Playback",
    items: [
      { label: "Audio Quality", icon: "audio", value: "High" },
      { label: "Download Quality", icon: "download", value: "Standard" },
      { label: "Crossfade", icon: "crossfade", value: "Off" },
      { label: "Normalize Volume", icon: "volume", value: "On" },
    ],
  },
  {
    section: "Privacy",
    items: [
      { label: "Private Session", icon: "eye", value: "Off" },
      { label: "Show Listening Activity", icon: "activity", value: "On" },
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
    mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={stroke} strokeWidth="1.8" /><path d="M22 6l-10 7L2 6" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" /></>,
    link: <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />,
    audio: <><path d="M9 18V6l12-2v12" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><circle cx="6" cy="18" r="3" stroke={stroke} strokeWidth="1.8" /><circle cx="18" cy="16" r="3" stroke={stroke} strokeWidth="1.8" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></>,
    crossfade: <path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
    volume: <><path d="M11 5L6 9H2v6h4l5 4V5z" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" /></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={stroke} strokeWidth="1.8" /><circle cx="12" cy="12" r="3" stroke={stroke} strokeWidth="1.8" /></>,
    activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
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
  const { isSettingsOpen, closeSettings } = useUI();

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
      </div>
    </div>
  );
}