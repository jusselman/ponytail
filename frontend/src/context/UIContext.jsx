import { createContext, useContext, useState, useCallback } from "react";

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [user, setUser] = useState(null);

  // ── Viewing another user's public profile — separate from the above, which is
  // always the logged-in user's own profile ──
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [viewedUsername, setViewedUsername] = useState(null);

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

  return (
    <UIContext.Provider value={{
      isProfileOpen, openProfile, closeProfile,
      isSettingsOpen, openSettings, closeSettings,
      profileImage, setProfileImage,
      user, setUser,
      isUserProfileOpen, viewedUsername, openUserProfile, closeUserProfile,
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