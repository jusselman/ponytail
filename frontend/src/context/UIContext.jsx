import { createContext, useContext, useState, useCallback } from "react";
import { getMyPlaylists } from "../services/playlistService";

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [user, setUser] = useState(null);

  // ── The logged-in user's own playlists — kept here (not locally in each
  // screen) so MyMusicScreen and ProfilePanel share one source of truth. Before
  // this, each screen fetched and stored its own copy on mount, so creating a
  // playlist in one place only updated that screen; the other stayed stale
  // until the whole app remounted. addMyPlaylist gives instant optimistic
  // updates on create; refreshMyPlaylists re-syncs (e.g. after editing tracks). ──
  const [myPlaylists, setMyPlaylists] = useState([]);
  const refreshMyPlaylists = useCallback(async () => {
    try {
      const data = await getMyPlaylists();
      setMyPlaylists(data || []);
    } catch (err) {
      console.log('Failed to fetch playlists:', err);
    }
  }, []);
  const addMyPlaylist = useCallback((playlist) => {
    setMyPlaylists(prev => [playlist, ...prev]);
  }, []);

  // ── Viewing another user's public profile — separate from the above, which is
  // always the logged-in user's own profile ──
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [viewedUsername, setViewedUsername] = useState(null);

  // ── Viewing a playlist read-only (someone else's public playlist, or one you follow) ──
  const [isPublicPlaylistOpen, setIsPublicPlaylistOpen] = useState(false);
  const [viewedPlaylistId, setViewedPlaylistId] = useState(null);

  const openProfile = useCallback(() => setIsProfileOpen(true), []);
  const closeProfile = useCallback(() => setIsProfileOpen(false), []);
  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  const openUserProfile = useCallback((username) => {
    setViewedUsername(username);
    setIsUserProfileOpen(true);
  }, []);
  const closeUserProfile = useCallback(() => {
    setIsUserProfileOpen(false);
    setViewedUsername(null);
  }, []);

  const openPublicPlaylist = useCallback((playlistId) => {
    setViewedPlaylistId(playlistId);
    setIsPublicPlaylistOpen(true);
  }, []);
  const closePublicPlaylist = useCallback(() => {
    setIsPublicPlaylistOpen(false);
    setViewedPlaylistId(null);
  }, []);

  return (
    <UIContext.Provider value={{
      isProfileOpen, openProfile, closeProfile,
      isSettingsOpen, openSettings, closeSettings,
      profileImage, setProfileImage,
      user, setUser,
      isUserProfileOpen, viewedUsername, openUserProfile, closeUserProfile,
      isPublicPlaylistOpen, viewedPlaylistId, openPublicPlaylist, closePublicPlaylist,
      myPlaylists, refreshMyPlaylists, addMyPlaylist,
    }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within a UIProvider");
  return ctx;
}