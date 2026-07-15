import { useState, useEffect } from "react";
import { getMe, getToken, getMyUploads } from '../services/authService';
import { getMyPlaylists } from '../services/playlistService';
import AppHeader from '../components/AppHeader';
import MiniPlayer from '../components/MiniPlayer';
import FooterNav from '../components/FooterNav';
import FullPlayer from '../components/FullPlayer';
import ProfilePanel from '../components/ProfilePanel';
import PlaylistPanel from '../components/PlaylistPanel';
import PublicPlaylistPanel from '../components/PublicPlaylistPanel';
import UploadTrackPanel from '../components/UploadTrackPanel';
import SongPanel from '../components/SongPanel';
import { usePlayer } from '../context/PlayerContext';

// ─── Colors ───────────────────────────────────────────────────────────────────
const colors = {
  bg: "#222222",
  bgDeep: "#222222",
  bgCard: "#2a2a2a",
  bgCardHover: "#303030",
  teal: "#5DEBD7",
  tealDark: "#3ecfba",
  tealGlow: "rgba(93,235,215,0.15)",
  text: "#ffffff",
  textSecondary: "#aaaaaa",
  muted: "#666666",
  border: "rgba(255,255,255,0.07)",
  gold: "#f5cf00",
};

// ─── Derive a stable hue for a playlist's gradient art from its id/title ──
const hueFromString = (str) => {
  if (!str) return 200;
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
};

// ─── Map a playlist row from the API into the shape PlaylistCard expects ──
const mapPlaylist = (playlist) => ({
  id: playlist.id,
  name: playlist.title,
  tracks: playlist.track_count ?? 0,
  hue: hueFromString(playlist.id || playlist.title),
  coverUrl: playlist.cover_art_url || null,
});

// ─── Album Card — `showPlayOverlay` (default true) hides the hover play button
// for rows where tapping doesn't play (currently just Your Uploads, which opens
// SongPanel instead). ──
const AlbumCard = ({ track, onPlay, size = 120, currentTrack, isPlaying, showPlayOverlay = true }) => {
  const isCurrentTrack = currentTrack &&
    `${currentTrack.title}|${currentTrack.artist}` === `${track.title}|${track.artist}`;
  const showPause = isCurrentTrack && isPlaying;
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const hue = track.artist?.charCodeAt(0) * 37 % 360 || 200;

  return (
    <div
      onClick={() => onPlay(track)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0,
        width: size,
        cursor: "pointer",
        transition: "transform 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      {/* Album art */}
      <div style={{
        width: size, height: size,
        borderRadius: "10px", overflow: "hidden",
        backgroundColor: colors.bgCard,
        marginBottom: "8px",
        boxShadow: hovered ? "0 8px 24px rgba(0,0,0,0.4)" : "0 4px 12px rgba(0,0,0,0.2)",
        transition: "box-shadow 0.2s ease",
        position: "relative",
      }}>
        {track.coverUrl && !imgError ? (
          <img
            src={track.coverUrl}
            alt={track.album}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: `linear-gradient(135deg, hsl(${hue}, 50%, 30%), hsl(${hue + 40}, 40%, 20%))`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M9 18V6l12-2v12" stroke={colors.teal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6" cy="18" r="3" stroke={colors.teal} strokeWidth="1.5" />
              <circle cx="18" cy="16" r="3" stroke={colors.teal} strokeWidth="1.5" />
            </svg>
          </div>
        )}

        {/* Play overlay on hover */}
        {showPlayOverlay && (hovered || isCurrentTrack) && (
            <div style={{
                position: "absolute", inset: 0,
                backgroundColor: "rgba(0,0,0,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <div style={{
                width: 36, height: 36, borderRadius: "50%",
                backgroundColor: colors.teal,
                display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                {showPause ? (
                    <div style={{ display: "flex", gap: "3px" }}>
                    <div style={{ width: 3, height: 12, backgroundColor: "#1a1a1a", borderRadius: 2 }} />
                    <div style={{ width: 3, height: 12, backgroundColor: "#1a1a1a", borderRadius: 2 }} />
                    </div>
                ) : (
                    <div style={{
                    width: 0, height: 0,
                    borderTop: "7px solid transparent",
                    borderBottom: "7px solid transparent",
                    borderLeft: "12px solid #1a1a1a",
                    marginLeft: 3,
                    }} />
                )}
                </div>
            </div>
            )}
      </div>

      {/* Track info */}
      <div style={{
        fontSize: "12px", fontWeight: "600", color: colors.text,
        fontFamily: "'Kanit', sans-serif",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        marginBottom: "2px",
      }}>
        {track.title}
      </div>
      <div style={{
        fontSize: "11px", color: colors.muted,
        fontFamily: "'Kanit', sans-serif",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {track.artist}
      </div>
    </div>
  );
};

// ─── Playlist Card — same visual language as AlbumCard, but title/track-count instead of title/artist ──
const PlaylistCard = ({ playlist, onTap, size = 120 }) => {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={() => onTap(playlist)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0,
        width: size,
        cursor: "pointer",
        transition: "transform 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      {/* Playlist art */}
      <div style={{
        width: size, height: size,
        borderRadius: "10px", overflow: "hidden",
        backgroundColor: colors.bgCard,
        marginBottom: "8px",
        boxShadow: hovered ? "0 8px 24px rgba(0,0,0,0.4)" : "0 4px 12px rgba(0,0,0,0.2)",
        transition: "box-shadow 0.2s ease",
        position: "relative",
      }}>
        {playlist.coverUrl && !imgError ? (
          <img
            src={playlist.coverUrl}
            alt={playlist.name}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: `linear-gradient(135deg, hsl(${playlist.hue}, 50%, 30%), hsl(${playlist.hue + 40}, 40%, 20%))`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M9 18V6l12-2v12" stroke={colors.teal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6" cy="18" r="3" stroke={colors.teal} strokeWidth="1.5" />
              <circle cx="18" cy="16" r="3" stroke={colors.teal} strokeWidth="1.5" />
            </svg>
          </div>
        )}
      </div>

      {/* Playlist info — tapping opens the playlist panel, so no play affordance here */}
      <div style={{
        fontSize: "12px", fontWeight: "600", color: colors.text,
        fontFamily: "'Kanit', sans-serif",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        marginBottom: "2px",
      }}>
        {playlist.name}
      </div>
      <div style={{
        fontSize: "11px", color: colors.muted,
        fontFamily: "'Kanit', sans-serif",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {playlist.tracks} track{playlist.tracks === 1 ? '' : 's'}
      </div>
    </div>
  );
};

// ─── Section Header — optional `action` renders on the right (e.g. "+ New") ──
const SectionHeader = ({ title, subtitle, index = 0, action }) => (
  <div style={{
    marginBottom: "14px",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
    animation: `fadeSlideUp 0.4s ease ${index * 0.1}s forwards`,
    opacity: 0,
  }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: "16px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.2px" }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "2px" }}>
          {subtitle}
        </div>
      )}
    </div>
    {action}
  </div>
);

// ─── "+ New" pill — used to open the playlist creation panel ──────────────────
const NewPlaylistButton = ({ onPress }) => (
  <div
    onClick={onPress}
    style={{
      display: "flex", alignItems: "center", gap: "4px", flexShrink: 0,
      cursor: "pointer", padding: "5px 10px",
      borderRadius: "20px", border: `1px solid ${colors.teal}`,
      backgroundColor: colors.tealGlow,
    }}
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke={colors.teal} strokeWidth="2" strokeLinecap="round" />
    </svg>
    <span style={{ fontSize: "11px", fontWeight: "600", color: colors.teal, fontFamily: "'Kanit', sans-serif" }}>New</span>
  </div>
);

// ─── "+ Upload" pill — same visual language as NewPlaylistButton, opens the
// upload panel instead. Only ever rendered for is_artist accounts. ──
const UploadTrackButton = ({ onPress }) => (
  <div
    onClick={onPress}
    style={{
      display: "flex", alignItems: "center", gap: "4px", flexShrink: 0,
      cursor: "pointer", padding: "5px 10px",
      borderRadius: "20px", border: `1px solid ${colors.gold}`,
      backgroundColor: "rgba(245,207,0,0.12)",
    }}
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke={colors.gold} strokeWidth="2" strokeLinecap="round" />
    </svg>
    <span style={{ fontSize: "11px", fontWeight: "600", color: colors.gold, fontFamily: "'Kanit', sans-serif" }}>Upload</span>
  </div>
);

// ─── Horizontal Scroll Row ────────────────────────────────────────────────────
const ScrollRow = ({ items, renderItem, emptyMessage, index = 0 }) => {
  if (!items || items.length === 0) {
    return (
      <div style={{
        height: "120px", display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: colors.bgCard, borderRadius: "12px",
        marginBottom: "28px",
        animation: `fadeSlideUp 0.4s ease ${index * 0.1 + 0.05}s forwards`,
        opacity: 0,
      }}>
        <div style={{ fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif", textAlign: "center", padding: "0 20px" }}>
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", gap: "14px",
      overflowX: "auto", paddingBottom: "8px",
      marginBottom: "28px",
      scrollbarWidth: "none",
    }}>
      {items.map((item, i) => renderItem(item, i))}
    </div>
  );
};

// ─── My Music Screen ──────────────────────────────────────────────────────────
export default function MyMusicScreen({ setScreen }) {
  const [user, setUser] = useState(null);
  const [suggested, setSuggested] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [activeNav, setActiveNav] = useState("mymusic");
  const [loadingSuggested, setLoadingSuggested] = useState(true);
  const [loadingNew, setLoadingNew] = useState(true);
  const [playlists, setPlaylists] = useState([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [isPlaylistPanelOpen, setIsPlaylistPanelOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [myUploads, setMyUploads] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(true);
  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(false);
  const [isSongPanelOpen, setIsSongPanelOpen] = useState(false);
  const [selectedUpload, setSelectedUpload] = useState(null);

  const { playTrack, playHistory, currentTrack, isPlaying } = usePlayer();
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);

  // ── Fetch recently played tracks from the user's persisted history — capped at 15,
  // most-recent-first, deduplicated by track. This survives app reloads (unlike the
  // in-memory playHistory from PlayerContext, which resets on every launch). ──
  useEffect(() => {
    const fetchRecentlyPlayed = async () => {
      try {
        const token = await getToken();
        const res = await fetch('http://localhost:5000/api/auth/history/recent?limit=15', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setRecentlyPlayed(data.tracks || []);
      } catch (err) {
        console.log('Failed to fetch recently played:', err);
      }
    };
    fetchRecentlyPlayed();
  }, []);

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

  // ── Fetch the musician's own uploaded tracks — only meaningful for is_artist
  // accounts, so it waits until `user` has loaded to check that flag ──
  const fetchMyUploads = async () => {
    setLoadingUploads(true);
    try {
      const data = await getMyUploads();
      setMyUploads(data || []);
    } catch (err) {
      console.log('Failed to fetch uploads:', err);
    } finally {
      setLoadingUploads(false);
    }
  };

  useEffect(() => {
    if (user?.is_artist) fetchMyUploads();
  }, [user?.is_artist]);

  // ── Tapping a tile in Your Uploads opens the edit/delete panel instead of
  // playing it, per product decision — managing your own catalog takes priority
  // over playback here. Tracks are still playable normally everywhere else
  // (search, playlists, recently played, etc.) via the regular AlbumCard tap. ──
  const handleUploadTap = (track) => {
    setSelectedUpload(track);
    setIsSongPanelOpen(true);
  };

  const handleCloseSongPanel = () => {
    setIsSongPanelOpen(false);
    setSelectedUpload(null);
  };

  const handleUploadSaved = (updated) => {
    setMyUploads(prev => prev.map(t => (t.id === updated.id ? { ...t, ...updated } : t)));
  };

  const handleUploadDeleted = (deleted) => {
    setMyUploads(prev => prev.filter(t => t.id !== deleted.id));
  };

  // ── Fetch the user's real playlists — on mount, and again whenever the playlist
  // panel closes, so track counts/covers stay current after editing ──
  const fetchPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const data = await getMyPlaylists();
      setPlaylists((data || []).map(mapPlaylist));
    } catch (err) {
      console.log('Failed to fetch playlists:', err);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  // ── Fetch suggested tracks once on mount ──
useEffect(() => {
  const fetchSuggested = async () => {
    setLoadingSuggested(true);
    try {
      const genres = [...new Set(playHistory.map(t => t.genre).filter(Boolean))];
      const genreParam = genres.length > 0 ? `&genres=${encodeURIComponent(genres.join(','))}` : '';
      const res = await fetch(`http://localhost:5000/api/auth/tracks/suggested?limit=10${genreParam}`);
      const data = await res.json();
      setSuggested(data.tracks || []);
    } catch (err) {
      console.log('Failed to fetch suggested:', err);
    } finally {
      setLoadingSuggested(false);
    }
  };
  fetchSuggested();
}, []); // 

  // ── Fetch new releases ──
  useEffect(() => {
    const fetchNewReleases = async () => {
      setLoadingNew(true);
      try {
        const res = await fetch('http://localhost:5000/api/auth/tracks/new-releases?limit=10');
        const data = await res.json();
        setNewReleases(data.tracks || []);
      } catch (err) {
        console.log('Failed to fetch new releases:', err);
      } finally {
        setLoadingNew(false);
      }
    };
    fetchNewReleases();
  }, []);

  const handlePlay = (track) => {
    playTrack(
      track,
      [track],
      0
    );
  };

  // ── Tapping a playlist opens the panel straight into search-and-build mode ──
  const handlePlaylistTap = (playlist) => {
    setSelectedPlaylist(playlist);
    setIsPlaylistPanelOpen(true);
  };

  const handleNewPlaylist = () => {
    setSelectedPlaylist(null);
    setIsPlaylistPanelOpen(true);
  };

  const handleClosePlaylistPanel = () => {
    setIsPlaylistPanelOpen(false);
    setSelectedPlaylist(null);
    fetchPlaylists(); // pick up any track/count/cover changes made while the panel was open
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

      <div style={{
        minHeight: "100vh", width: "100%", backgroundColor: colors.bgDeep,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        fontFamily: "'Kanit', sans-serif",
      }}>
        <div style={{
          width: "375px", height: "750px",
          backgroundColor: colors.bg, borderRadius: "40px",
          boxShadow: "0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
          position: "relative", overflow: "hidden",
          marginTop: "40px", marginBottom: "40px",
          display: "flex", flexDirection: "column",
        }}>

          {/* ── Header ── */}
        <AppHeader user={user} />

          {/* ── Scrollable content ── */}
          <div style={{
            flex: 1, overflowY: "auto", overflowX: "hidden",
            padding: "20px 16px 0",
            width: "100%", boxSizing: "border-box", minHeight: 0,
          }}>

            {/* ── Your Playlists ── */}
            <SectionHeader
              title="Your Playlists"
              subtitle={playlists.length === 0 ? null : `${playlists.length} playlist${playlists.length === 1 ? '' : 's'}`}
              index={0}
              action={<NewPlaylistButton onPress={handleNewPlaylist} />}
            />
            <ScrollRow
              items={loadingPlaylists ? [] : playlists}
              renderItem={(playlist, i) => (
                <PlaylistCard key={playlist.id} playlist={playlist} onTap={handlePlaylistTap} />
              )}
              emptyMessage={loadingPlaylists ? "Loading..." : "Create a playlist to see it here"}
              index={0}
            />

            {/* ── Your Uploads — musician accounts only ── */}
            {user?.is_artist && (
              <>
                <SectionHeader
                  title="Your Uploads"
                  subtitle={myUploads.length === 0 ? null : `${myUploads.length} track${myUploads.length === 1 ? '' : 's'}`}
                  index={0}
                  action={<UploadTrackButton onPress={() => setIsUploadPanelOpen(true)} />}
                />
                <ScrollRow
                  items={loadingUploads ? [] : myUploads}
                  renderItem={(track, i) => (
                    <AlbumCard key={track.id ?? i} track={track} onPlay={handleUploadTap} currentTrack={currentTrack} isPlaying={isPlaying} showPlayOverlay={false} />
                  )}
                  emptyMessage={loadingUploads ? "Loading..." : "Upload your first track to see it here"}
                  index={0}
                />
              </>
            )}

            {/* ── Recently Played ── */}
            <SectionHeader
              title="Recently Played"
              subtitle={recentlyPlayed.length === 0 ? null : `${recentlyPlayed.length} track${recentlyPlayed.length === 1 ? '' : 's'}`}
              index={1}
            />
            <ScrollRow
                items={recentlyPlayed}
                renderItem={(track, i) => (
                  <AlbumCard key={i} track={track} onPlay={handlePlay} currentTrack={currentTrack} isPlaying={isPlaying} />
                )}
                emptyMessage="Tracks you play will appear here"
                index={1}
            />

            {/* ── Suggested For You ── */}
            <SectionHeader
              title="Suggested For You"
              subtitle={playHistory.length > 0 ? "Based on your listening" : "Explore something new"}
              index={2}
            />
            <ScrollRow
                items={loadingSuggested ? [] : suggested}
                renderItem={(track, i) => (
                  <AlbumCard key={i} track={track} onPlay={handlePlay} currentTrack={currentTrack} isPlaying={isPlaying} />
                )}
                emptyMessage={loadingSuggested ? "Loading..." : "No suggestions yet"}
                index={2}
            />

            {/* ── New Releases ── */}
            <SectionHeader title="New Releases" subtitle="Recently added to Ponytail" index={3} />
            <ScrollRow
                items={loadingNew ? [] : newReleases}
                renderItem={(track, i) => (
                  <AlbumCard key={i} track={track} onPlay={handlePlay} currentTrack={currentTrack} isPlaying={isPlaying} />
                )}
                emptyMessage={loadingNew ? "Loading..." : "Nothing new yet"}
                index={3}
            />

            {/* Bottom padding */}
            <div style={{ height: "20px" }} />

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
              if (tab === "radio") setScreen("radio");
              if (tab === "bulletin") setScreen("bulletin");
            }}
          />

          {/* ── Full Player ── */}
          <FullPlayer />

           {/* ── Profile Panel ── */}
           <ProfilePanel />

          {/* ── Read-only viewer for a playlist you don't own ── */}
          <PublicPlaylistPanel />

          {/* ── Playlist Creation / Build Panel ── */}
          <PlaylistPanel
            isOpen={isPlaylistPanelOpen}
            playlist={selectedPlaylist}
            onClose={handleClosePlaylistPanel}
            onCreated={(playlist) => setPlaylists(prev => [mapPlaylist(playlist), ...prev])}
          />

          {/* ── Track Upload Panel — musician accounts only ── */}
          <UploadTrackPanel
            isOpen={isUploadPanelOpen}
            onClose={() => setIsUploadPanelOpen(false)}
            onUploaded={() => fetchMyUploads()}
          />

          {/* ── Song Panel — edit or delete one of your own uploads, opened by
          tapping a tile in the Your Uploads row instead of playing it ── */}
          <SongPanel
            isOpen={isSongPanelOpen}
            track={selectedUpload}
            onClose={handleCloseSongPanel}
            onSaved={handleUploadSaved}
            onDeleted={handleUploadDeleted}
          />

        </div>
      </div>
    </>
  );
}