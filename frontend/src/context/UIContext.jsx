import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getMyPlaylists } from "../services/playlistService";
import { getUnreadCount } from "../services/messageService";
import { getMyUploads } from "../services/authService";

const UIContext = createContext(null);

// `setScreen` is App.js's top-level screen-switcher, handed down here so any
// component below the provider (e.g. SettingsPanel's logout confirm) can
// navigate — like back to "login" — without prop-drilling it through every
// screen's <ProfilePanel />/<SettingsPanel /> call site.
export function UIProvider({ children, setScreen }) {
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

  // ── A musician's own uploaded tracks — shared the same way as myPlaylists, so
  // edits made from Settings > Library > My Music show up in the My Music tab's
  // Your Uploads row (and vice versa) without a remount. ──
  const [myUploads, setMyUploads] = useState([]);
  const refreshMyUploads = useCallback(async () => {
    try {
      const data = await getMyUploads();
      setMyUploads(data || []);
    } catch (err) {
      console.log('Failed to fetch uploads:', err);
    }
  }, []);
  const updateMyUploadLocal = useCallback((updated) => {
    setMyUploads(prev => prev.map(t => (t.id === updated.id ? { ...t, ...updated } : t)));
  }, []);
  const removeMyUploadLocal = useCallback((deleted) => {
    setMyUploads(prev => prev.filter(t => t.id !== deleted.id));
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

  // ── Direct messages. The inbox (list of threads) and an open conversation are
  // separate panels so a thread opened from someone's profile doesn't need the
  // inbox underneath it. `activeConversation` is { id, otherUser }. ──
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [activeConversation, setActiveConversation] = useState(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const openInbox = useCallback(() => setIsInboxOpen(true), []);
  const closeInbox = useCallback(() => setIsInboxOpen(false), []);
  const openConversation = useCallback((conversation) => setActiveConversation(conversation), []);
  const closeConversation = useCallback(() => setActiveConversation(null), []);

  const refreshUnreadCount = useCallback(async () => {
    try {
      setUnreadMessageCount(await getUnreadCount());
    } catch (err) {
      // Not logged in yet, or backend down — the badge just stays as-is.
    }
  }, []);

  // ── Poll the unread badge while someone is logged in. 15s is plenty for a
  // badge; the open thread polls much faster on its own. ──
  useEffect(() => {
    if (!user?.id) {
      setUnreadMessageCount(0);
      return;
    }
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [user?.id, refreshUnreadCount]);

  return (
    <UIContext.Provider value={{
      isProfileOpen, openProfile, closeProfile,
      isSettingsOpen, openSettings, closeSettings,
      profileImage, setProfileImage,
      user, setUser,
      isUserProfileOpen, viewedUsername, openUserProfile, closeUserProfile,
      isPublicPlaylistOpen, viewedPlaylistId, openPublicPlaylist, closePublicPlaylist,
      myPlaylists, refreshMyPlaylists, addMyPlaylist,
      myUploads, refreshMyUploads, updateMyUploadLocal, removeMyUploadLocal,
      isInboxOpen, openInbox, closeInbox,
      activeConversation, openConversation, closeConversation,
      unreadMessageCount, refreshUnreadCount,
      setScreen,
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