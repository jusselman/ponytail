import { useState, useEffect, useCallback, useRef } from "react";
import { getMe } from '../services/authService';
import { getBulletinPosts, setBulletinLike, deleteBulletinPost } from '../services/bulletinService';
import AppHeader from '../components/AppHeader';
import MiniPlayer from '../components/MiniPlayer';
import FooterNav from '../components/FooterNav';
import FullPlayer from '../components/FullPlayer';
import ProfilePanel from '../components/ProfilePanel';
import UserProfilePanel from '../components/UserProfilePanel';
import PublicPlaylistPanel from '../components/PublicPlaylistPanel';
import MessagesLayer from '../components/MessagesLayer';
import ComposePostPanel from '../components/bulletin/ComposePostPanel';
import PostThreadSheet from '../components/bulletin/PostThreadSheet';
import { FeedPost, Avatar, PhotoIcon, NoteIcon, colors as bulletinColors } from '../components/bulletin/shared';
import { useUI } from '../context/UIContext';

// ─── Colors ───────────────────────────────────────────────────────────────────
const colors = {
  ...bulletinColors,
  bgDeep: "#222222",
};
const kanit = "'Kanit', sans-serif";

// ─── Bulletin ─────────────────────────────────────────────────────────────────
// The community feed (board direction 2026-08-29: one reverse-chron feed of
// posts from artists and fans). Posts, likes and replies are real and live in
// the bulletin_* tables (migration 017), which also seeds the former mock
// posts so the feed is full for demos. Tapping the composer bar opens the
// New Post panel; tapping a post opens its reply thread. Reposts and share
// are still display only.

// ─── Composer bar: tap anywhere to open the New Post panel ───────────────────
const ComposerBar = ({ user, onOpen }) => {
  const [hovered, setHovered] = useState(false);
  const name = user?.display_name || user?.username || "You";
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? colors.bgCardHover : colors.bgCard, borderRadius: "16px", padding: "12px 14px",
        marginBottom: "16px", border: `1px solid ${colors.border}`, cursor: "pointer",
        animation: "fadeSlideUp 0.4s ease forwards", opacity: 0, transition: "background-color 0.2s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Avatar name={name} size={38} imageUrl={user?.profile_picture} />
        <div style={{
          flex: 1, padding: "10px 14px", borderRadius: "20px",
          backgroundColor: "rgba(255,255,255,0.04)", border: `1px solid ${colors.border}`,
          fontSize: "13px", color: colors.muted, fontFamily: kanit,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0,
        }}>
          {user?.is_artist ? "What's new with your music?" : "Share what's inspiring you..."}
        </div>
        <div style={{
          padding: "8px 16px", borderRadius: "20px", backgroundColor: colors.teal,
          color: "#1a1a1a", fontSize: "12px", fontWeight: "700", fontFamily: kanit, flexShrink: 0,
        }}>
          Post
        </div>
      </div>
      <div style={{ display: "flex", gap: "14px", marginTop: "10px", paddingLeft: "48px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11.5px", color: colors.textSecondary, fontFamily: kanit }}>
          <PhotoIcon size={14} /> Photo
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11.5px", color: colors.textSecondary, fontFamily: kanit }}>
          <NoteIcon size={14} /> Music
        </span>
        <span style={{ fontSize: "11.5px", color: colors.textSecondary, fontFamily: kanit }}># Tag</span>
      </div>
    </div>
  );
};

const FeedMessage = ({ children, action, onAction }) => (
  <div style={{ textAlign: "center", padding: "36px 20px", color: colors.muted, fontFamily: kanit, fontSize: "13px" }}>
    {children}
    {action && (
      <div>
        <button onClick={onAction} style={{
          marginTop: "12px", padding: "7px 16px", borderRadius: "18px", border: `1px solid ${colors.teal}`,
          background: "none", color: colors.teal, fontSize: "12px", fontWeight: "600", fontFamily: kanit, cursor: "pointer",
        }}>
          {action}
        </button>
      </div>
    )}
  </div>
);

// ─── Bulletin Screen ──────────────────────────────────────────────────────────
export default function BulletinScreen({ setScreen }) {
  const [activeNav, setActiveNav] = useState("bulletin");
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [threadPostId, setThreadPostId] = useState(null);
  const scrollRef = useRef(null);
  const likeInFlight = useRef(new Set());
  const { openUserProfile, openProfile } = useUI();

  useEffect(() => {
    const loadUser = async () => {
      try {
        setUser(await getMe());
      } catch (err) {
        console.log('Could not load user:', err);
      }
    };
    loadUser();
  }, []);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getBulletinPosts();
      setPosts(data.posts);
      setHasMore(data.hasMore);
    } catch (err) {
      console.log('Could not load bulletin:', err);
      setLoadError("Couldn't load the Bulletin. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || posts.length === 0) return;
    setLoadingMore(true);
    try {
      const data = await getBulletinPosts({ before: posts[posts.length - 1].createdAt });
      setPosts(prev => {
        const seen = new Set(prev.map(p => p.id));
        return [...prev, ...data.posts.filter(p => !seen.has(p.id))];
      });
      setHasMore(data.hasMore);
    } catch (err) {
      console.log('Could not load more posts:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, posts]);

  // Infinite scroll: fetch the next page when near the bottom
  const handleScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) loadMore();
  };

  const patchPost = useCallback((postId, patch) => {
    setPosts(prev => prev.map(p => (p.id === postId ? { ...p, ...patch } : p)));
  }, []);

  // ── Like: optimistic, reverted if the request fails ──
  const toggleLike = useCallback(async (post) => {
    if (likeInFlight.current.has(post.id)) return;
    likeInFlight.current.add(post.id);
    const next = !post.likedByMe;
    patchPost(post.id, { likedByMe: next, likeCount: post.likeCount + (next ? 1 : -1) });
    try {
      const fresh = await setBulletinLike(post.id, next);
      patchPost(post.id, fresh);
    } catch (err) {
      patchPost(post.id, { likedByMe: post.likedByMe, likeCount: post.likeCount });
    } finally {
      likeInFlight.current.delete(post.id);
    }
  }, [patchPost]);

  const removePost = useCallback(async (post) => {
    await deleteBulletinPost(post.id);
    setPosts(prev => prev.filter(p => p.id !== post.id));
  }, []);

  const openAuthor = useCallback((author, mine) => {
    if (mine) openProfile();
    else if (author.username) openUserProfile(author.username);
  }, [openProfile, openUserProfile]);

  const handlePosted = (post) => {
    setPosts(prev => [post, ...prev]);
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
  };

  const threadPost = threadPostId ? posts.find(p => p.id === threadPostId) : null;

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
        fontFamily: kanit,
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

          {/* ── Scrollable feed ── */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            style={{
              flex: 1, overflowY: "auto", overflowX: "hidden",
              width: "100%", boxSizing: "border-box", minHeight: 0,
              padding: "16px 16px 0",
            }}
          >
            <ComposerBar user={user} onOpen={() => setComposeOpen(true)} />

            {loading && posts.length === 0 && <FeedMessage>Loading the Bulletin...</FeedMessage>}
            {!loading && loadError && <FeedMessage action="Try again" onAction={loadFeed}>{loadError}</FeedMessage>}
            {!loading && !loadError && posts.length === 0 && (
              <FeedMessage action="Write the first post" onAction={() => setComposeOpen(true)}>Nothing on the Bulletin yet.</FeedMessage>
            )}

            {posts.map((post, i) => (
              <FeedPost
                key={post.id}
                post={post}
                index={i}
                onToggleLike={toggleLike}
                onOpenThread={(p) => setThreadPostId(p.id)}
                onOpenAuthor={openAuthor}
                onDelete={removePost}
              />
            ))}

            {loadingMore && <FeedMessage>Loading more...</FeedMessage>}
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
              if (tab === "mymusic") setScreen("mymusic");
              if (tab === "radio") setScreen("radio");
            }}
          />

          {/* ── Reply thread (z 1050) and New Post panel (z 1060) ── */}
          {threadPost && (
            <PostThreadSheet
              key={threadPost.id}
              post={threadPost}
              user={user}
              onClose={() => setThreadPostId(null)}
              onPostChange={patchPost}
              onToggleLike={toggleLike}
              onDelete={removePost}
              onOpenAuthor={openAuthor}
            />
          )}
          {composeOpen && (
            <ComposePostPanel
              user={user}
              onClose={() => setComposeOpen(false)}
              onPosted={handlePosted}
            />
          )}

          {/* ── Full Player ── */}
          <FullPlayer />

          {/* ── Profile Panel ── */}
          <ProfilePanel />

          {/* ── Someone else's profile, opened from a post's author ── */}
          <UserProfilePanel />

          {/* ── Read-only viewer for a playlist you don't own ── */}
          <MessagesLayer />
          <PublicPlaylistPanel />

        </div>
      </div>
    </>
  );
}
