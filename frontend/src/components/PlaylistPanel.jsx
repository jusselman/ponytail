import { useState, useEffect, useRef } from "react";
import {
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  getPlaylistDetail,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  reorderPlaylistTracks,
  searchAll,
} from '../services/playlistService';
import { usePlayer } from '../context/PlayerContext';
import ArtistPanel from './ArtistPanel';
import AlbumPanel from './AlbumPanel';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const colors = {
  bg: "#222222",
  bgCard: "#2a2a2a",
  bgCardHover: "#303030",
  teal: "#5DEBD7",
  tealDark: "#3ecfba",
  tealGlow: "rgba(93,235,215,0.15)",
  text: "#ffffff",
  textSecondary: "#aaaaaa",
  muted: "#666666",
  border: "rgba(255,255,255,0.07)",
  danger: "#ff6b6b",
};

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 300;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB, matches backend multer limit
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ─── Icons ────────────────────────────────────────────────────────────────────
const ChevronDown = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <path d="M6 9l6 6 6-6" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MusicNoteIcon = ({ size = 32, color = colors.teal }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M9 18V6l12-2v12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="18" r="3" stroke={color} strokeWidth="1.5" />
    <circle cx="18" cy="16" r="3" stroke={color} strokeWidth="1.5" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke={colors.textSecondary} strokeWidth="1.6" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20z" stroke={colors.textSecondary} strokeWidth="1.6" />
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="11" width="18" height="10" rx="2" stroke={colors.textSecondary} strokeWidth="1.6" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={colors.textSecondary} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const CameraIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="13" r="4" stroke="#1a1a1a" strokeWidth="1.8" />
  </svg>
);

const CloseIcon = ({ size = 12, color = colors.text }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

const SearchIcon = ({ color = colors.muted }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
    <path d="M16.5 16.5L21 21" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const DragHandleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="8" cy="6" r="1.5" fill={colors.muted} />
    <circle cx="8" cy="12" r="1.5" fill={colors.muted} />
    <circle cx="8" cy="18" r="1.5" fill={colors.muted} />
    <circle cx="16" cy="6" r="1.5" fill={colors.muted} />
    <circle cx="16" cy="12" r="1.5" fill={colors.muted} />
    <circle cx="16" cy="18" r="1.5" fill={colors.muted} />
  </svg>
);

const ArrowUpIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M12 20V4M5 11l7-7 7 7" stroke={colors.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ShuffleIcon = ({ color = colors.text }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <polyline points="16 3 21 3 21 8" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="4" y1="20" x2="21" y2="3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <polyline points="21 16 21 21 16 21" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="15" y1="15" x2="21" y2="21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <line x1="4" y1="4" x2="9" y2="9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const MoreIcon = ({ color = colors.text }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="5" cy="12" r="2" fill={color} />
    <circle cx="12" cy="12" r="2" fill={color} />
    <circle cx="19" cy="12" r="2" fill={color} />
  </svg>
);

const EditIcon = ({ color = colors.text }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M12 20h9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const QueueIcon = ({ color = colors.text }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M3 6h18M3 12h18M3 18h12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const TrashIcon = ({ color = colors.danger }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <polyline points="3 6 5 6 21 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// ─── Toggle Switch ────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange }) => (
  <div
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    style={{
      width: 44, height: 26, borderRadius: 13, flexShrink: 0,
      backgroundColor: checked ? colors.teal : colors.bgCardHover,
      border: `1px solid ${checked ? colors.teal : colors.border}`,
      cursor: "pointer", position: "relative",
      transition: "background-color 0.2s ease, border-color 0.2s ease",
    }}
  >
    <div style={{
      position: "absolute", top: 2, left: checked ? 20 : 2,
      width: 20, height: 20, borderRadius: "50%",
      backgroundColor: checked ? "#1a1a1a" : colors.text,
      transition: "left 0.2s cubic-bezier(0.32, 0.72, 0, 1)",
    }} />
  </div>
);

// ─── Add button — teal border/glow, matches the app's pill-button aesthetic ────
const AddButton = ({ onPress, added, loading }) => (
  <button
    onClick={onPress}
    disabled={added || loading}
    style={{
      flexShrink: 0,
      padding: "6px 16px",
      borderRadius: "20px",
      border: `1.5px solid ${added ? colors.border : colors.teal}`,
      backgroundColor: added ? "transparent" : colors.tealGlow,
      color: added ? colors.muted : colors.teal,
      fontSize: "12px", fontWeight: "700",
      fontFamily: "'Kanit', sans-serif",
      cursor: added || loading ? "default" : "pointer",
      transition: "opacity 0.15s ease",
    }}
  >
    {loading ? "…" : added ? "Added" : "Add"}
  </button>
);

// ─── A single row inside the "…" action sheet ──────────────────────────────────
const MenuRow = ({ icon, label, onPress, danger, disabled }) => (
  <div
    onClick={disabled ? undefined : onPress}
    style={{
      display: "flex", alignItems: "center", gap: "14px",
      padding: "14px 20px",
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.4 : 1,
    }}
  >
    {icon}
    <span style={{
      fontSize: "14px", fontWeight: "600",
      color: danger ? colors.danger : colors.text,
      fontFamily: "'Kanit', sans-serif",
    }}>
      {label}
    </span>
  </div>
);

// ─── A single track row inside the playlist's track list ──────────────────────
const PlaylistTrackRow = ({ track, index, onTap, onRemove, isBeingDragged }) => (
  <div
    onClick={onTap}
    style={{
      display: "flex", alignItems: "center", gap: "10px",
      padding: "8px 6px", cursor: "pointer",
      backgroundColor: isBeingDragged ? colors.bgCardHover : "transparent",
      borderRadius: isBeingDragged ? "10px" : "0",
      boxShadow: isBeingDragged ? "0 8px 24px rgba(0,0,0,0.5)" : "none",
      userSelect: "none",
    }}
  >
    <div style={{ width: 16, fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif", textAlign: "center", flexShrink: 0 }}>
      {index + 1}
    </div>
    <div style={{
      width: 40, height: 40, borderRadius: "6px", flexShrink: 0,
      backgroundColor: colors.bgCard, overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {track.coverUrl ? (
        <img src={track.coverUrl} alt={track.album} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <MusicNoteIcon size={16} />
      )}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: "13px", fontWeight: "600", color: colors.text,
        fontFamily: "'Kanit', sans-serif",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {track.title}
      </div>
      <div style={{
        fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "2px",
      }}>
        {track.artist}
      </div>
    </div>
    <div
      onClick={(e) => { e.stopPropagation(); onRemove(); }}
      style={{ padding: "6px", cursor: "pointer", display: "flex", flexShrink: 0 }}
    >
      <CloseIcon size={12} color={colors.muted} />
    </div>
    <div style={{ padding: "4px", display: "flex", flexShrink: 0 }}>
      <DragHandleIcon />
    </div>
  </div>
);

// ─── Sortable wrapper — provides drag behavior via dnd-kit's useSortable ───────
const SortableTrackRow = ({ id, track, index, onTap, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: "relative",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <PlaylistTrackRow track={track} index={index} onTap={onTap} onRemove={onRemove} isBeingDragged={isDragging} />
    </div>
  );
};

// ─── Playlist Panel — bottom-rising sheet. `playlist` prop absent = creation form;
// `playlist` prop present = jump straight into the search-and-build view for it. ──
export default function PlaylistPanel({ isOpen, onClose, onCreated, playlist }) {
  const [view, setView] = useState('details'); // 'details' | 'build'
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const { playTrack, currentTrack, isPlaying, togglePlay, addTracksToQueue } = usePlayer();

  // ── Details (creation/edit) form state ──
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const nameInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // ── Build (search + tracks) state ──
  const [builtPlaylist, setBuiltPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingKey, setAddingKey] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const debounceRef = useRef(null);
  const justDraggedRef = useRef(false);

  // ── "…" action sheet state ──
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [queueFeedback, setQueueFeedback] = useState(null);
  const queueFeedbackTimerRef = useRef(null);

  // ── Artist/Album drill-down from search results — same panelStack pattern as SearchScreen.jsx ──
  const [panelStack, setPanelStack] = useState([]);
  const openArtist = (artistName) => setPanelStack(prev => [...prev, { type: 'artist', artist: artistName }]);
  const openAlbum = (artist, album) => setPanelStack(prev => [...prev, { type: 'album', artist, album }]);
  const closeTopPanel = () => setPanelStack(prev => prev.slice(0, -1));

  const displayTitle = builtPlaylist?.title || builtPlaylist?.name || 'Playlist';
  const headerCoverUrl = builtPlaylist?.cover_art_url || builtPlaylist?.coverUrl || null;
  const headerDescription = builtPlaylist?.description || null;
  const headerIsPublic = builtPlaylist?.is_public ?? true;
  const headerCreator = builtPlaylist?.creator_username || null;
  const isThisPlaylistPlaying = Boolean(
    isPlaying && currentTrack && tracks.some(t => t.title === currentTrack.title && t.artist === currentTrack.artist)
  );

  // ── Reset/initialize whenever the panel opens ──
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setQuery("");
    setResults([]);
    setSearching(false);
    setIsEditingExisting(false);
    setIsMenuOpen(false);
    setConfirmingDelete(false);
    setDeleting(false);
    setQueueFeedback(null);
    clearTimeout(queueFeedbackTimerRef.current);
    setPanelStack([]);

    if (playlist) {
      // Jump straight into build mode for an existing playlist.
      setView('build');
      setBuiltPlaylist(playlist);
      setTracks([]);
      setLoadingTracks(true);
      getPlaylistDetail(playlist.id)
        .then((detail) => {
          setBuiltPlaylist(detail);
          setTracks(detail.tracks || []);
        })
        .catch((err) => console.log('Failed to load playlist detail:', err))
        .finally(() => setLoadingTracks(false));
    } else {
      // Fresh creation form.
      setView('details');
      setBuiltPlaylist(null);
      setTracks([]);
      setName("");
      setDescription("");
      setIsPublic(true);
      setCoverFile(null);
      setCoverPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setSubmitting(false);
      const t = setTimeout(() => nameInputRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [isOpen, playlist?.id]);

  // ── Release the cover preview object URL whenever it's replaced or unmounted ──
  useEffect(() => {
    return () => {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    };
  }, [coverPreviewUrl]);

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && !submitting;

  const handleCoverPick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Please choose a JPG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image must be under 5MB.');
      return;
    }

    setError(null);
    setCoverFile(file);
    setCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const handleRemoveCover = (e) => {
    e.stopPropagation();
    setCoverFile(null);
    setCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  // ── Create a new playlist, or save edits to an existing one — same form, two outcomes ──
  const handleSubmitDetails = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      if (isEditingExisting && builtPlaylist?.id) {
        const updated = await updatePlaylist(builtPlaylist.id, {
          title: trimmedName,
          description: description.trim() || null,
          is_public: isPublic,
          coverImage: coverFile,
        });
        setBuiltPlaylist(prev => ({ ...prev, ...updated }));
        setIsEditingExisting(false);
        setView('build');
      } else {
        const created = await createPlaylist({
          title: trimmedName,
          description: description.trim() || null,
          is_public: isPublic,
          coverImage: coverFile,
        });
        onCreated?.(created);
        setBuiltPlaylist(created);
        setTracks([]);
        setView('build');
      }
    } catch (err) {
      console.log('Failed to save playlist:', err);
      setError(isEditingExisting ? 'Could not save changes. Please try again.' : 'Could not create your playlist. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitDetails();
    }
  };

  // ── Open the details form pre-filled with the current playlist, in edit mode ──
  const handleEditDetails = () => {
    setIsMenuOpen(false);
    setName(displayTitle === 'Playlist' ? '' : displayTitle);
    setDescription(headerDescription || "");
    setIsPublic(headerIsPublic);
    setCoverFile(null);
    setCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return headerCoverUrl;
    });
    setError(null);
    setIsEditingExisting(true);
    setView('details');
  };

  const handleCancelEdit = () => {
    setIsEditingExisting(false);
    setCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCoverFile(null);
    setError(null);
    setView('build');
  };

  // ── Quick action — flip public/private without opening the full edit form ──
  const handleToggleVisibility = async () => {
    if (!builtPlaylist?.id) return;
    const nextIsPublic = !headerIsPublic;
    setIsMenuOpen(false);
    try {
      const updated = await updatePlaylist(builtPlaylist.id, { is_public: nextIsPublic });
      setBuiltPlaylist(prev => ({ ...prev, ...updated }));
    } catch (err) {
      console.log('Failed to update visibility:', err);
    }
  };

  // ── Play the whole playlist from the top, or pause if it's already playing ──
  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    if (isThisPlaylistPlaying) { togglePlay(); return; }
    const mapped = tracks.map(t => ({
      title: t.title, artist: t.artist, album: t.album, genre: t.genre,
      coverUrl: t.coverUrl, audioUrl: t.audioUrl,
    }));
    playTrack(mapped[0], mapped, 0);
  };

  const handleShuffle = () => {
    if (tracks.length === 0) return;
    const mapped = tracks.map(t => ({
      title: t.title, artist: t.artist, album: t.album, genre: t.genre,
      coverUrl: t.coverUrl, audioUrl: t.audioUrl,
    }));
    const shuffled = [...mapped];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    playTrack(shuffled[0], shuffled, 0);
  };

  const handleAddToQueue = () => {
    setIsMenuOpen(false);
    if (tracks.length === 0) return;
    const mapped = tracks.map(t => ({
      title: t.title, artist: t.artist, album: t.album, genre: t.genre,
      coverUrl: t.coverUrl, audioUrl: t.audioUrl,
    }));
    addTracksToQueue(mapped);
    setQueueFeedback(`Added ${mapped.length} track${mapped.length === 1 ? '' : 's'} to queue`);
    clearTimeout(queueFeedbackTimerRef.current);
    queueFeedbackTimerRef.current = setTimeout(() => setQueueFeedback(null), 2200);
  };

  const handleDeleteRequest = () => setConfirmingDelete(true);
  const handleCancelDelete = () => setConfirmingDelete(false);

  const handleConfirmDelete = async () => {
    if (!builtPlaylist?.id) return;
    setDeleting(true);
    try {
      await deletePlaylist(builtPlaylist.id);
      setIsMenuOpen(false);
      setConfirmingDelete(false);
      onClose?.();
    } catch (err) {
      console.log('Failed to delete playlist:', err);
      setDeleting(false);
    }
  };

  // ── Search — tracks, artists, and albums, so a user who only remembers the artist
  // or album can still find their way to a track ──
  const runSearch = async (q) => {
    if (!q || q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const found = await searchAll(q);
      setResults(found);
    } catch (err) {
      console.log('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 350);
  };

  const isTrackInPlaylist = (result) =>
    tracks.some(t => t.title === result.title && t.artist === result.artist);

  const handleAddTrack = async (result) => {
    if (!builtPlaylist || isTrackInPlaylist(result)) return;
    const key = `${result.title}|${result.artist}`;
    setAddingKey(key);
    try {
      const track = await addTrackToPlaylist(builtPlaylist.id, result);
      setTracks(prev => [...prev, track]);
    } catch (err) {
      console.log('Failed to add track:', err);
    } finally {
      setAddingKey(null);
    }
  };

  const handleRemoveTrack = async (trackRowId) => {
    const prevTracks = tracks;
    setTracks(prev => prev.filter(t => t.id !== trackRowId));
    try {
      await removeTrackFromPlaylist(builtPlaylist.id, trackRowId);
    } catch (err) {
      console.log('Failed to remove track:', err);
      setTracks(prevTracks);
    }
  };

  const handleTrackTap = (index) => {
    if (justDraggedRef.current) return;
    const mapped = tracks.map(t => ({
      title: t.title, artist: t.artist, album: t.album, genre: t.genre,
      coverUrl: t.coverUrl, audioUrl: t.audioUrl,
    }));
    playTrack(mapped[index], mapped, index);
  };

  // ── dnd-kit sensors — press-and-hold before drag activates, same as QueuePanel ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tracks.findIndex(t => t.id === active.id);
    const newIndex = tracks.findIndex(t => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(tracks, oldIndex, newIndex);
    setTracks(reordered);
    reorderPlaylistTracks(builtPlaylist.id, reordered.map(t => t.id))
      .catch(err => console.log('Failed to persist reorder:', err));

    justDraggedRef.current = true;
    setTimeout(() => { justDraggedRef.current = false; }, 150);
  };

  const handleClose = () => {
    if (submitting) return;
    onClose?.();
  };

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      zIndex: 1150,
      pointerEvents: isOpen ? "all" : "none",
    }}>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={handleClose}
          style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)" }}
        />
      )}

      {/* Panel — rises from the bottom */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundColor: colors.bg,
        transform: isOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* ── Header bar ── */}
        <div style={{
          padding: "16px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}>
          <button
            onClick={handleClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}
          >
            <ChevronDown />
          </button>
          <div style={{
            fontSize: "14px", fontWeight: "600", color: colors.text,
            fontFamily: "'Kanit', sans-serif", letterSpacing: "0.3px",
            maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {view === 'build' ? displayTitle : (isEditingExisting ? "Edit Details" : "New Playlist")}
          </div>
          <div style={{ minWidth: 28, display: "flex", justifyContent: "flex-end" }}>
            {view === 'details' && isEditingExisting && (
              <button
                onClick={handleCancelEdit}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
              >
                <span style={{ fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>Cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 0" }}>

          {view === 'details' && (
            <>
              {/* ── Cover picker ── */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
                <div
                  onClick={() => !submitting && coverInputRef.current?.click()}
                  style={{
                    position: "relative", width: 96, height: 96, borderRadius: "14px",
                    cursor: submitting ? "default" : "pointer",
                    overflow: "hidden",
                    background: coverPreviewUrl ? "transparent" : `linear-gradient(135deg, hsl(200, 45%, 28%), hsl(240, 35%, 20%))`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  }}
                >
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverPick}
                    disabled={submitting}
                    style={{ display: "none" }}
                  />

                  {coverPreviewUrl ? (
                    <img
                      src={coverPreviewUrl}
                      alt="Playlist cover"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <MusicNoteIcon size={36} />
                  )}

                  {/* Camera badge */}
                  <div style={{
                    position: "absolute", bottom: 4, right: 4,
                    width: 26, height: 26, borderRadius: "50%",
                    backgroundColor: colors.teal,
                    border: `2px solid ${colors.bg}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <CameraIcon />
                  </div>

                  {/* Remove button — only for a freshly-picked file, not the existing saved cover
                  (clearing the saved cover isn't wired up server-side yet) */}
                  {coverPreviewUrl && coverFile && !submitting && (
                    <div
                      onClick={handleRemoveCover}
                      style={{
                        position: "absolute", top: 4, right: 4,
                        width: 22, height: 22, borderRadius: "50%",
                        backgroundColor: "rgba(0,0,0,0.65)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <CloseIcon />
                    </div>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "center", marginBottom: "24px", fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
                {coverPreviewUrl ? "Tap to change cover" : "Add a cover photo (optional)"}
              </div>

              {/* ── Name field ── */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{
                  fontSize: "11px", fontWeight: "600", color: colors.muted,
                  fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px",
                  textTransform: "uppercase", marginBottom: "8px",
                }}>
                  Name
                </div>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
                  onKeyDown={handleKeyDown}
                  placeholder="My Playlist"
                  disabled={submitting}
                  style={{
                    width: "100%", padding: "12px 14px",
                    backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`,
                    borderRadius: "10px", color: colors.text,
                    fontSize: "15px", fontFamily: "'Kanit', sans-serif",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>

              {/* ── Description field ── */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{
                  fontSize: "11px", fontWeight: "600", color: colors.muted,
                  fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px",
                  textTransform: "uppercase", marginBottom: "8px",
                }}>
                  Description <span style={{ textTransform: "none", fontWeight: 400 }}>(optional)</span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
                  placeholder="Give listeners a sense of the vibe"
                  disabled={submitting}
                  rows={3}
                  style={{
                    width: "100%", padding: "12px 14px",
                    backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`,
                    borderRadius: "10px", color: colors.text,
                    fontSize: "14px", fontFamily: "'Kanit', sans-serif",
                    outline: "none", resize: "none", boxSizing: "border-box",
                  }}
                />
                <div style={{ textAlign: "right", fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "4px" }}>
                  {description.length}/{MAX_DESCRIPTION_LENGTH}
                </div>
              </div>

              {/* ── Visibility toggle ── */}
              <div style={{
                display: "flex", alignItems: "center", gap: "14px",
                backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`,
                borderRadius: "12px", padding: "14px 16px",
                marginBottom: "24px",
              }}>
                {isPublic ? <GlobeIcon /> : <LockIcon />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif" }}>
                    {isPublic ? "Public playlist" : "Private playlist"}
                  </div>
                  <div style={{ fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "2px" }}>
                    {isPublic ? "Anyone can find and share this" : "Only visible to you"}
                  </div>
                </div>
                <Toggle checked={isPublic} onChange={setIsPublic} />
              </div>

              {/* ── Error message ── */}
              {error && (
                <div style={{
                  fontSize: "12px", color: colors.danger, fontFamily: "'Kanit', sans-serif",
                  marginBottom: "16px", textAlign: "center",
                }}>
                  {error}
                </div>
              )}

              <div style={{ height: "20px" }} />
            </>
          )}

          {view === 'build' && (
            <>
              {/* ── Playlist header — cover, name, description, visibility, creator ── */}
              <div style={{ display: "flex", gap: "14px", marginBottom: "18px" }}>
                <div style={{
                  width: 88, height: 88, borderRadius: "12px", flexShrink: 0, overflow: "hidden",
                  background: headerCoverUrl ? "transparent" : `linear-gradient(135deg, hsl(200, 45%, 28%), hsl(240, 35%, 20%))`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
                }}>
                  {headerCoverUrl ? (
                    <img src={headerCoverUrl} alt={displayTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <MusicNoteIcon size={32} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{
                    fontSize: "18px", fontWeight: "800", color: colors.text,
                    fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.3px",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {displayTitle}
                  </div>
                  {headerDescription && (
                    <div style={{
                      fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "4px",
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {headerDescription}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                    {headerIsPublic ? <GlobeIcon /> : <LockIcon />}
                    <span style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
                      {headerIsPublic ? "Public" : "Private"}
                    </span>
                  </div>
                  {headerCreator && (
                    <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "4px" }}>
                      By {headerCreator}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Play / Shuffle / More ── */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "10px" }}>
                <button
                  onClick={handlePlayAll}
                  disabled={tracks.length === 0}
                  style={{
                    width: 52, height: 52, borderRadius: "50%",
                    backgroundColor: tracks.length === 0 ? colors.bgCardHover : colors.teal,
                    border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: tracks.length === 0 ? "default" : "pointer",
                    boxShadow: tracks.length === 0 ? "none" : "0 0 24px rgba(93,235,215,0.35)",
                  }}
                >
                  {isThisPlaylistPlaying ? (
                    <div style={{ display: "flex", gap: "4px" }}>
                      <div style={{ width: 4, height: 16, backgroundColor: "#1a1a1a", borderRadius: 2 }} />
                      <div style={{ width: 4, height: 16, backgroundColor: "#1a1a1a", borderRadius: 2 }} />
                    </div>
                  ) : (
                    <div style={{
                      width: 0, height: 0,
                      borderTop: "9px solid transparent",
                      borderBottom: "9px solid transparent",
                      borderLeft: `15px solid ${tracks.length === 0 ? colors.muted : "#1a1a1a"}`,
                      marginLeft: 3,
                    }} />
                  )}
                </button>

                <button
                  onClick={handleShuffle}
                  disabled={tracks.length === 0}
                  style={{
                    width: 40, height: 40, borderRadius: "50%",
                    backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: tracks.length === 0 ? "default" : "pointer",
                    opacity: tracks.length === 0 ? 0.4 : 1,
                  }}
                >
                  <ShuffleIcon />
                </button>

                <button
                  onClick={() => setIsMenuOpen(true)}
                  style={{
                    width: 40, height: 40, borderRadius: "50%",
                    backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <MoreIcon />
                </button>
              </div>

              {queueFeedback && (
                <div style={{ textAlign: "center", fontSize: "12px", color: colors.teal, fontFamily: "'Kanit', sans-serif", marginBottom: "12px" }}>
                  {queueFeedback}
                </div>
              )}

              {/* ── Search bar ── */}
              <div style={{ position: "relative", marginBottom: "8px" }}>
                <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <SearchIcon color={searchFocused ? colors.teal : colors.muted} />
                </div>
                <input
                  value={query}
                  onChange={handleQueryChange}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Find a track to add"
                  style={{
                    width: "100%", padding: "12px 40px",
                    borderRadius: "12px", backgroundColor: colors.bgCard,
                    border: `1.5px solid ${searchFocused ? colors.teal : "transparent"}`,
                    color: colors.text, fontSize: "14px", outline: "none",
                    fontFamily: "'Kanit', sans-serif", boxSizing: "border-box",
                    boxShadow: searchFocused ? `0 0 0 3px rgba(93,235,215,0.1)` : "none",
                    transition: "all 0.2s ease",
                  }}
                />
                {query.length > 0 && (
                  <button
                    onClick={() => { setQuery(""); setResults([]); }}
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "4px" }}
                  >
                    <CloseIcon size={13} color={colors.muted} />
                  </button>
                )}
              </div>

              {/* ── Search results ── */}
              {query.trim().length >= 2 && (
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "10px" }}>
                    {searching ? "Searching…" : "Results"}
                  </div>

                  {!searching && results.length === 0 && (
                    <div style={{ textAlign: "center", color: colors.muted, fontFamily: "'Kanit', sans-serif", fontSize: "13px", padding: "12px 0" }}>
                      No results for "{query}"
                    </div>
                  )}

                  {results.map((result, i) => {
                    const isTrack = result.type === 'track';
                    // Search results come back as { name, artist, ... } — normalize tracks to the
                    // { title, artist, ... } shape addTrackToPlaylist/isTrackInPlaylist expect.
                    const mappedTrack = isTrack ? {
                      title: result.name, artist: result.artist, album: result.album,
                      genre: result.genre, coverUrl: result.coverUrl, audioUrl: result.audioUrl,
                    } : null;
                    const key = isTrack ? `${mappedTrack.title}|${mappedTrack.artist}` : `${result.type}-${result.name}`;

                    return (
                      <div
                        key={i}
                        onClick={() => {
                          if (result.type === 'artist') openArtist(result.name);
                          else if (result.type === 'album') openAlbum(result.artist, result.name);
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: "12px",
                          padding: "9px 0", borderBottom: `1px solid ${colors.border}`,
                          cursor: isTrack ? "default" : "pointer",
                        }}
                      >
                        <div style={{
                          width: 38, height: 38, borderRadius: "6px", flexShrink: 0,
                          backgroundColor: colors.bgCard, overflow: "hidden",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {result.coverUrl ? (
                            <img src={result.coverUrl} alt={result.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <MusicNoteIcon size={16} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {result.name}
                          </div>
                          <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {isTrack
                              ? `${result.artist ? result.artist : ""}${result.album ? ` · ${result.album}` : ""}`
                              : result.genre}
                          </div>
                        </div>
                        {isTrack ? (
                          <AddButton
                            onPress={() => handleAddTrack(mappedTrack)}
                            added={isTrackInPlaylist(mappedTrack)}
                            loading={addingKey === key}
                          />
                        ) : (
                          <div style={{
                            fontSize: "10px", color: colors.teal, fontFamily: "'Kanit', sans-serif",
                            backgroundColor: colors.tealGlow, border: `1px solid ${colors.teal}`,
                            padding: "2px 8px", borderRadius: "20px",
                            textTransform: "capitalize", flexShrink: 0,
                          }}>
                            {result.type}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Playlist tracks ── */}
              <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "8px" }}>
                Tracks{tracks.length > 0 ? ` (${tracks.length})` : ""}
              </div>

              {loadingTracks ? (
                <div style={{ textAlign: "center", color: colors.muted, fontFamily: "'Kanit', sans-serif", fontSize: "13px", padding: "20px 0" }}>
                  Loading…
                </div>
              ) : tracks.length === 0 ? (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: "8px", padding: "20px 0 32px",
                }}>
                  <ArrowUpIcon />
                  <div style={{ fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif", textAlign: "center" }}>
                    Start adding bangers by searching
                  </div>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={tracks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tracks.map((track, i) => (
                      <SortableTrackRow
                        key={track.id}
                        id={track.id}
                        track={track}
                        index={i}
                        onTap={() => handleTrackTap(i)}
                        onRemove={() => handleRemoveTrack(track.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}

              <div style={{ height: "20px" }} />
            </>
          )}

        </div>

        {/* ── Footer — Create button, details view only ── */}
        {view === 'details' && (
          <div style={{
            padding: "16px 20px calc(20px + env(safe-area-inset-bottom, 0px))",
            borderTop: `1px solid ${colors.border}`,
            flexShrink: 0,
          }}>
            <button
              onClick={handleSubmitDetails}
              disabled={!canSubmit}
              style={{
                width: "100%", padding: "14px",
                backgroundColor: canSubmit ? colors.teal : colors.bgCardHover,
                border: "none", borderRadius: "12px",
                color: canSubmit ? "#1a1a1a" : colors.muted,
                fontSize: "15px", fontWeight: "700", fontFamily: "'Kanit', sans-serif",
                cursor: canSubmit ? "pointer" : "default",
                transition: "background-color 0.2s ease, color 0.2s ease",
              }}
            >
              {submitting
                ? (isEditingExisting ? "Saving…" : "Creating…")
                : (isEditingExisting ? "Save Changes" : "Create Playlist")}
            </button>
          </div>
        )}

      </div>

      {/* ── "…" action sheet — always mounted so it can slide up/down, like the main panel ── */}
      <div style={{
        position: "absolute", inset: 0,
        pointerEvents: isMenuOpen ? "all" : "none",
      }}>
        {isMenuOpen && (
          <div
            onClick={() => { if (!deleting) { setIsMenuOpen(false); setConfirmingDelete(false); } }}
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)" }}
          />
        )}
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          backgroundColor: colors.bgCard,
          borderRadius: "20px 20px 0 0",
          padding: "8px 0 calc(20px + env(safe-area-inset-bottom, 0px))",
          boxShadow: "0 -8px 30px rgba(0,0,0,0.5)",
          transform: isMenuOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        }}>
            {!confirmingDelete ? (
              <>
                <MenuRow icon={<EditIcon />} label="Edit Details" onPress={handleEditDetails} />
                <MenuRow
                  icon={headerIsPublic ? <LockIcon /> : <GlobeIcon />}
                  label={headerIsPublic ? "Make Private" : "Make Public"}
                  onPress={handleToggleVisibility}
                />
                <MenuRow
                  icon={<QueueIcon />}
                  label="Add to Queue"
                  onPress={handleAddToQueue}
                  disabled={tracks.length === 0}
                />
                <MenuRow icon={<TrashIcon />} label="Delete Playlist" danger onPress={handleDeleteRequest} />
              </>
            ) : (
              <div style={{ padding: "10px 20px 4px" }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", marginBottom: "4px" }}>
                  Delete this playlist?
                </div>
                <div style={{ fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginBottom: "16px" }}>
                  This can't be undone.
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={handleCancelDelete}
                    disabled={deleting}
                    style={{
                      flex: 1, padding: "12px", borderRadius: "10px",
                      border: `1px solid ${colors.border}`, backgroundColor: "transparent",
                      color: colors.text, fontFamily: "'Kanit', sans-serif", fontWeight: "600",
                      fontSize: "14px", cursor: deleting ? "default" : "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={deleting}
                    style={{
                      flex: 1, padding: "12px", borderRadius: "10px",
                      border: "none", backgroundColor: colors.danger,
                      color: "#fff", fontFamily: "'Kanit', sans-serif", fontWeight: "700",
                      fontSize: "14px", cursor: deleting ? "default" : "pointer",
                    }}
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* ── Artist/Album drill-down from search results — same panelStack pattern as SearchScreen.jsx ── */}
      {panelStack.map((panel, index) => {
        const zIndex = 1160 + index;
        if (panel.type === 'artist') {
          return (
            <ArtistPanel
              key={`${panel.type}-${index}`}
              artistName={panel.artist}
              isOpen={true}
              zIndexOverride={zIndex}
              onClose={closeTopPanel}
              onAlbumTap={(albumObj) => openAlbum(albumObj.artist, albumObj.album)}
            />
          );
        }
        if (panel.type === 'album') {
          return (
            <AlbumPanel
              key={`${panel.type}-${index}`}
              artistName={panel.artist}
              albumName={panel.album}
              isOpen={true}
              zIndexOverride={zIndex}
              onClose={closeTopPanel}
              onArtistTap={openArtist}
              onAddTrack={handleAddTrack}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
