// ─── FooterNav ────────────────────────────────────────────────────────────────
// Reusable bottom navigation bar with 5 tabs.
// Props:
//   activeTab: string — one of "home", "search", "mymusic", "radio", "bulletin"
//   onTabPress: (tabKey) => void
// ─────────────────────────────────────────────────────────────────────────────
export default function FooterNav({ activeTab = "home", onTabPress }) {

  const tabs = [
    {
      key: "home",
      label: "Home",
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z"
            fill={active ? "#5DEBD7" : "#666666"}
            stroke={active ? "#5DEBD7" : "#666666"}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      key: "search",
      label: "Search",
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle
            cx="11" cy="11" r="7"
            stroke={active ? "#5DEBD7" : "#666666"}
            strokeWidth="2"
          />
          <path
            d="M16.5 16.5L21 21"
            stroke={active ? "#5DEBD7" : "#666666"}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      key: "mymusic",
      label: "My Music",
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 18V6L21 4V16"
            stroke={active ? "#5DEBD7" : "#666666"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="6" cy="18" r="3" stroke={active ? "#5DEBD7" : "#666666"} strokeWidth="2" />
          <circle cx="18" cy="16" r="3" stroke={active ? "#5DEBD7" : "#666666"} strokeWidth="2" />
        </svg>
      ),
    },
    {
      key: "radio",
      label: "Radio",
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect
            x="2" y="9" width="20" height="13" rx="2"
            stroke={active ? "#5DEBD7" : "#666666"}
            strokeWidth="2"
          />
          <path
            d="M7 9L15 3"
            stroke={active ? "#5DEBD7" : "#666666"}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="15" r="2" fill={active ? "#5DEBD7" : "#666666"} />
          <path
            d="M6 15H7M17 15H18"
            stroke={active ? "#5DEBD7" : "#666666"}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      key: "bulletin",
      label: "Bulletin",
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect
            x="3" y="3" width="18" height="18" rx="2"
            stroke={active ? "#5DEBD7" : "#666666"}
            strokeWidth="2"
          />
          <path
            d="M7 8H17M7 12H14M7 16H11"
            stroke={active ? "#5DEBD7" : "#666666"}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <div style={{
      width: "100%",
      backgroundColor: "#1a1a1a",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      display: "flex",
      alignItems: "stretch",
      boxSizing: "border-box",
      flexShrink: 0,
    }}>
      {tabs.map(tab => {
        const active = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onTabPress && onTabPress(tab.key)}
            style={{
              flex: 1,
              padding: "10px 4px 12px",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              transition: "opacity 0.2s ease",
              borderTop: active ? `2px solid #5DEBD7` : "2px solid transparent",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            {tab.icon(active)}
            <span style={{
              fontSize: "10px",
              fontWeight: active ? "600" : "400",
              color: active ? "#5DEBD7" : "#666666",
              fontFamily: "'Kanit', sans-serif",
              letterSpacing: "0.3px",
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}