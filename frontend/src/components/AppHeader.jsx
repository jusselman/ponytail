import { useState } from "react";
import { useUI } from '../context/UIContext';

const colors = {
  bg: "#222222",
  teal: "#5DEBD7",
  text: "#ffffff",
  border: "rgba(255,255,255,0.07)",
};

const Avatar = ({ name, size = 34 }) => {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const hue = name.charCodeAt(0) * 37 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, hsl(${hue}, 60%, 45%), hsl(${hue + 40}, 70%, 35%))`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: "700", color: "#fff",
      fontFamily: "'Kanit', sans-serif", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
};

export default function AppHeader() {
  const { openProfile, profileImage, user } = useUI();

  return (
    <div style={{
      padding: "32px 20px 12px",
      backgroundColor: "#222222",
      position: "sticky", top: 0, zIndex: 10,
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      width: "100%", boxSizing: "border-box", flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          fontSize: "20px", fontWeight: "700", color: "#ffffff",
          fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.5px",
        }}>
          ponytail
          <span style={{
            display: "inline-block", width: "6px", height: "6px",
            borderRadius: "50%", backgroundColor: "#5DEBD7",
            marginLeft: "4px", marginBottom: "6px",
          }} />
        </div>
        <button
          onClick={openProfile}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          {profileImage ? (
            <div style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden" }}>
              <img src={profileImage} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ) : (
            <div style={{ borderRadius: "50%", overflow: "hidden", width: 34, height: 34 }}>
              <Avatar name={user?.username || "User"} size={34} />
            </div>
          )}
        </button>
      </div>
    </div>
  );
}