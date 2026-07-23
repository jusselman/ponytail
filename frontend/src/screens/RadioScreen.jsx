import { useState, useEffect } from "react";
import { getMe, getHotInHere, getMyStation } from '../services/authService';
import AppHeader from '../components/AppHeader';
import MiniPlayer from '../components/MiniPlayer';
import FooterNav from '../components/FooterNav';
import FullPlayer from '../components/FullPlayer';
import ProfilePanel from '../components/ProfilePanel';
import PublicPlaylistPanel from '../components/PublicPlaylistPanel';
import { usePlayer } from '../context/PlayerContext';

// ─── Colors ───────────────────────────────────────────────────────────────────
const colors = {
  bg: "#222222",
  bgDeep: "#222222",
  bgCard: "#2a2a2a",
  bgCardHover: "#303030",
  teal: "#5DEBD7",
  tealGlow: "rgba(93,235,215,0.15)",
  text: "#ffffff",
  textSecondary: "#aaaaaa",
  muted: "#666666",
  border: "rgba(255,255,255,0.07)",
  gold: "#f5cf00",
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const PinIcon = ({ color = colors.muted }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill={color} />
    <circle cx="12" cy="9" r="2.5" fill="#1a1a1a" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke={colors.teal} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// ─── Your Station Card — the musician's real personalized station: their own
// uploads plus catalog tracks matched on genre/subgenre/mood/similar-artist (see
// GET /radio/my-station). Musician accounts only. ──
const YourStationCard = ({ myStation, onPlay, currentTrack, isPlaying }) => {
  const [hovered, setHovered] = useState(false);
  const allTracks = [...myStation.ownTracks, ...myStation.matchedTracks];
  const isActive = allTracks.some(t => currentTrack &&
    `${currentTrack.title}|${currentTrack.artist}` === `${t.title}|${t.artist}`);
  const showPause = isActive && isPlaying;
  const tags = [myStation.genre, myStation.subgenre, myStation.mood].filter(Boolean).join(" · ");

  return (
    <div
      onClick={() => onPlay(allTracks)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? colors.bgCardHover : colors.bgCard,
        borderRadius: "16px", padding: "14px", marginBottom: "16px",
        border: `1.5px solid ${isActive ? colors.teal : colors.teal}`,
        boxShadow: `0 0 20px rgba(93,235,215,0.12)`,
        display: "flex", alignItems: "center", gap: "14px",
        cursor: "pointer", transition: "all 0.2s ease",
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: "12px", flexShrink: 0,
        background: `linear-gradient(135deg, ${colors.teal}, ${colors.tealDark})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" stroke="#1a1a1a" strokeWidth="1.8" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        {(hovered || isActive) && (
          <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {showPause ? (
              <div style={{ display: "flex", gap: "3px" }}>
                <div style={{ width: 3, height: 12, backgroundColor: "#1a1a1a", borderRadius: 2 }} />
                <div style={{ width: 3, height: 12, backgroundColor: "#1a1a1a", borderRadius: 2 }} />
              </div>
            ) : (
              <div style={{ width: 0, height: 0, borderTop: "7px solid transparent", borderBottom: "7px solid transparent", borderLeft: "12px solid #1a1a1a", marginLeft: 2 }} />
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "14px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", marginBottom: "2px" }}>
          Your Station
        </div>
        <div style={{ fontSize: "12px", color: colors.teal, fontFamily: "'Kanit', sans-serif", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {tags || "Built from your uploads"}
        </div>
        <div style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
          {allTracks.length} track{allTracks.length === 1 ? "" : "s"} · your uploads + similar artists
        </div>
      </div>

      {isActive && (
        <div style={{
          fontSize: "10px", fontWeight: "700", color: colors.teal,
          fontFamily: "'Kanit', sans-serif", backgroundColor: colors.tealGlow,
          padding: "3px 8px", borderRadius: "20px", border: `1px solid ${colors.teal}`,
          flexShrink: 0,
        }}>
          {isPlaying ? "PLAYING" : "PAUSED"}
        </div>
      )}
    </div>
  );
};

// ─── Hot Card — a real nearby-musician track. `distance`/`listeners` from the old
// mock version are gone since there's no geocoding or real-time listener-count
// infra yet; location shows the same-city match instead (see the backend's
// /radio/hot-in-here comment for the real-geocoding plan). ──
const HotCard = ({ item, index, onPlay, currentTrack, isPlaying }) => {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const isCurrentTrack = currentTrack &&
    `${currentTrack.title}|${currentTrack.artist}` === `${item.track}|${item.artist}`;
  const showPause = isCurrentTrack && isPlaying;
  const hue = item.hue ?? (item.artist ? item.artist.charCodeAt(0) * 37 % 360 : 200);

  return (
    <div
      onClick={() => onPlay(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? colors.bgCardHover : colors.bgCard,
        borderRadius: "16px", padding: "14px", marginBottom: "10px",
        border: `1px solid ${isCurrentTrack ? colors.teal : colors.border}`,
        boxShadow: isCurrentTrack ? `0 0 20px rgba(93,235,215,0.1)` : "none",
        display: "flex", alignItems: "center", gap: "12px",
        cursor: "pointer", transition: "all 0.2s ease",
        animation: `fadeSlideUp 0.4s ease ${index * 0.07}s forwards`, opacity: 0,
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: "10px", flexShrink: 0,
        background: `linear-gradient(135deg, hsl(${hue}, 55%, 30%), hsl(${hue + 40}, 45%, 20%))`,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>
        {item.coverUrl && !imgError ? (
          <img
            src={item.coverUrl}
            alt={item.track}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 18V6l12-2v12" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6" cy="18" r="3" stroke={colors.teal} strokeWidth="1.8" />
            <circle cx="18" cy="16" r="3" stroke={colors.teal} strokeWidth="1.8" />
          </svg>
        )}
        {(hovered || isCurrentTrack) && (
          <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {showPause ? (
              <div style={{ display: "flex", gap: "3px" }}>
                <div style={{ width: 3, height: 10, backgroundColor: colors.teal, borderRadius: 2 }} />
                <div style={{ width: 3, height: 10, backgroundColor: colors.teal, borderRadius: 2 }} />
              </div>
            ) : (
              <div style={{ width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: `10px solid ${colors.teal}`, marginLeft: 2 }} />
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "2px" }}>
          {item.track}
        </div>
        <div style={{ fontSize: "12px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.artist}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <PinIcon />
          <span style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>{item.location}</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
        <div style={{ fontSize: "10px", color: colors.teal, fontFamily: "'Kanit', sans-serif", backgroundColor: colors.tealGlow, padding: "2px 8px", borderRadius: "20px", border: `1px solid ${colors.teal}` }}>
          {item.genre}
        </div>
      </div>
    </div>
  );
};

// ─── My Stations Tab — `myStation` is the musician's real personalized station
// (own uploads + genre/subgenre/mood/similar-artist matches, see /radio/my-station);
// null for listener accounts, or while still loading, so it just doesn't render. ──
const MyStationsTab = ({ onAddStation, currentTrack, isPlaying, myStation, onPlayMyStation }) => (
  <div style={{ padding: "20px 16px 0" }}>
    {/* Header row with + button */}
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: "16px",
      animation: "fadeSlideUp 0.4s ease 0s forwards", opacity: 0,
    }}>
      <div>
        <div style={{ fontSize: "18px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.2px" }}>
          My Stations
        </div>
      </div>
      <div
        onClick={onAddStation}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          cursor: "pointer", padding: "8px 14px",
          borderRadius: "20px", border: `1px solid ${colors.teal}`,
          backgroundColor: colors.tealGlow, transition: "opacity 0.2s ease",
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
      >
        <PlusIcon />
        <span style={{ fontSize: "12px", fontWeight: "600", color: colors.teal, fontFamily: "'Kanit', sans-serif" }}>
          Add Station
        </span>
      </div>
    </div>

    {/* ── Your Station — real data, musician accounts only ── */}
    {myStation && (myStation.ownTracks.length > 0 || myStation.matchedTracks.length > 0) && (
      <YourStationCard
        myStation={myStation}
        onPlay={onPlayMyStation}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
      />
    )}

    <div style={{ height: "20px" }} />
  </div>
);

// ─── Discover Tab — `hotInHere` is real data (see /radio/hot-in-here): other
// musicians uploading tracks in the same city as the current user. Renders
// nothing if the user has no location set or no one else shares their city yet. ──
const DiscoverTab = ({ onPlayHot, currentTrack, isPlaying, hotInHere = [] }) => {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ padding: "16px 16px 0" }}>

      {/* ── Search bar ── */}
      <div style={{ position: "relative", marginBottom: "24px", animation: "fadeSlideUp 0.4s ease 0s forwards", opacity: 0 }}>
        <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke={focused ? colors.teal : "#666"} strokeWidth="2" />
            <path d="M16.5 16.5L21 21" stroke={focused ? colors.teal : "#666"} strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <input
          style={{
            width: "100%", padding: "11px 40px 11px 40px",
            borderRadius: "12px", backgroundColor: colors.bgCard,
            border: `1.5px solid ${focused ? colors.teal : "transparent"}`,
            color: colors.text, fontSize: "14px", outline: "none",
            fontFamily: "'Kanit', sans-serif", boxSizing: "border-box",
            boxShadow: focused ? `0 0 0 3px rgba(93,235,215,0.1)` : "none",
            transition: "all 0.2s ease",
          }}
          placeholder="Search stations..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {query.length > 0 && (
          <button
            onClick={() => setQuery("")}
            style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "4px" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#666" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Hot in Here — real data, musicians uploading in your city ── */}
      {hotInHere.length > 0 && (
        <div style={{ marginBottom: "28px", animation: "fadeSlideUp 0.4s ease 0.05s forwards", opacity: 0 }}>
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "15px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.2px" }}>
              Hot in Here
            </div>
            <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "2px" }}>
              Musicians uploading near you
            </div>
          </div>
          {hotInHere.map((item, i) => (
            <HotCard
              key={item.id}
              item={item}
              index={i}
              onPlay={onPlayHot}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
            />
          ))}
        </div>
      )}

      <div style={{ height: "20px" }} />
    </div>
  );
};

// ─── Radio Screen ─────────────────────────────────────────────────────────────
export default function RadioScreen({ setScreen }) {
  const [activeTab, setActiveTab] = useState("mystations");
  const [activeNav, setActiveNav] = useState("radio");
  const [user, setUser] = useState(null);
  const [hotInHere, setHotInHere] = useState([]);
  const [myStation, setMyStation] = useState(null);
  const { playTrack, currentTrack, isPlaying } = usePlayer();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const me = await getMe();
        setUser(me);
      } catch (err) {
        console.log('Could not load user:', err);
      }
    };
    loadUser();
  }, []);

  // ── Hot in Here — any logged-in user can fetch this; it just comes back empty
  // if they have no location set (listener accounts never get asked for one) or
  // no one else shares their city yet. ──
  useEffect(() => {
    const fetchHotInHere = async () => {
      try {
        const data = await getHotInHere();
        // Map title -> track to match HotCard's existing field names.
        setHotInHere((data.tracks || []).map(t => ({ ...t, track: t.title })));
      } catch (err) {
        console.log('Failed to fetch Hot in Here:', err);
      }
    };
    fetchHotInHere();
  }, []);

  // ── Personalized station — musician accounts only ──
  useEffect(() => {
    if (!user?.is_artist) return;
    const fetchMyStation = async () => {
      try {
        const data = await getMyStation();
        setMyStation(data);
      } catch (err) {
        console.log('Failed to fetch personalized station:', err);
      }
    };
    fetchMyStation();
  }, [user?.is_artist]);

  const handlePlayHot = (item) => {
    const queue = hotInHere.map(t => ({
      title: t.track, artist: t.artist, album: t.genre, genre: t.genre,
      coverUrl: t.coverUrl || null, audioUrl: t.audioUrl || "http://localhost:5000/audio/dummy.mp3",
    }));
    playTrack(
      { title: item.track, artist: item.artist, album: item.genre, genre: item.genre, coverUrl: item.coverUrl || null, audioUrl: item.audioUrl || "http://localhost:5000/audio/dummy.mp3" },
      queue,
      hotInHere.findIndex(t => t.id === item.id)
    );
  };

  // ── Your Station tap — `tracks` is the combined real ownTracks + matchedTracks
  // array built in YourStationCard; play the whole thing as a queue starting at 0 ──
  const handlePlayMyStation = (tracks) => {
    if (!tracks || tracks.length === 0) return;
    playTrack(tracks[0], tracks, 0);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Kanit', sans-serif; }
        body { background: #222222; }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{ minHeight: "100vh", width: "100%", backgroundColor: colors.bgDeep, display: "flex", alignItems: "flex-start", justifyContent: "center", fontFamily: "'Kanit', sans-serif" }}>
        <div style={{
          width: "375px", height: "750px", backgroundColor: colors.bg, borderRadius: "40px",
          boxShadow: "0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
          position: "relative", overflow: "hidden", marginTop: "40px", marginBottom: "40px",
          display: "flex", flexDirection: "column",
        }}>

          {/* ── Header ── */}
          <AppHeader />

          {/* ── Tabs ── */}
          <div style={{
            display: "flex", gap: "4px", padding: "0 20px",
            backgroundColor: colors.bg,
            borderBottom: `1px solid ${colors.border}`,
            flexShrink: 0,
          }}>
            {[
              { key: "mystations", label: "My Stations" },
              { key: "discover", label: "Discover" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1, padding: "12px 0", background: "none", border: "none", cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: activeTab === tab.key ? "700" : "400",
                  color: activeTab === tab.key ? colors.teal : colors.muted,
                  fontFamily: "'Kanit', sans-serif",
                  borderBottom: `2px solid ${activeTab === tab.key ? colors.teal : "transparent"}`,
                  transition: "all 0.2s ease", marginBottom: "-1px", boxSizing: "border-box",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab content ── */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", width: "100%", boxSizing: "border-box", minHeight: 0 }}>
            {activeTab === "mystations" && (
              <MyStationsTab
                onAddStation={() => setActiveTab("discover")}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                myStation={myStation}
                onPlayMyStation={handlePlayMyStation}
              />
            )}
            {activeTab === "discover" && (
            <DiscoverTab
              onPlayHot={handlePlayHot}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              hotInHere={hotInHere}
            />
          )}
          </div>

          {/* ── Mini Player ── */}
          <MiniPlayer />

          {/* ── Footer Nav ── */}
          <FooterNav
            activeTab={activeNav}
            onTabPress={(tab) => {
              setActiveNav(tab);
              if (tab === "home") setScreen("home");
              if (tab === "search") setScreen("search");
              if (tab === "mymusic") setScreen("mymusic");
              if (tab === "bulletin") setScreen("bulletin");
            }}
          />

          {/* ── Full Player ── */}
          <FullPlayer />

          {/* ── Profile Panel ── */}
          <ProfilePanel />

          {/* ── Read-only viewer for a playlist you don't own ── */}
          <PublicPlaylistPanel />

        </div>
      </div>
    </>
  );
}