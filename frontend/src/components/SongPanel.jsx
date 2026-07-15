import { useState, useEffect, useRef } from "react";
import { updateMyUpload, deleteMyUpload } from '../services/authService';

const colors = {
  bg: "#222222",
  bgCard: "#2a2a2a",
  bgCardHover: "#303030",
  teal: "#5DEBD7",
  tealDark: "#3ecfba",
  tealGlow: "rgba(93,235,215,0.15)",
  text: "#ffffff",
  muted: "#666666",
  border: "rgba(255,255,255,0.07)",
  danger: "#ff6b6b",
};

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ─── Icons ────────────────────────────────────────────────────────────────────
const ChevronDown = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <path d="M6 9l6 6 6-6" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MusicNoteIcon = ({ size = 36, color = colors.teal }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M9 18V6l12-2v12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="18" r="3" stroke={color} strokeWidth="1.5" />
    <circle cx="18" cy="16" r="3" stroke={color} strokeWidth="1.5" />
  </svg>
);

const CameraIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="13" r="4" stroke="#1a1a1a" strokeWidth="1.8" />
  </svg>
);

const TrashIcon = ({ color = colors.danger }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <polyline points="3 6 5 6 21 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// ─── Song Panel — bottom-rising sheet for a musician's own uploaded track.
// Opens instead of playback when a track is tapped in the "Your Uploads" row.
// Lets the musician edit title/album/genre/cover, or delete the track via an
// inline confirm step (no native browser dialogs). ──
export default function SongPanel({ isOpen, track, onClose, onSaved, onDeleted }) {
  const [title, setTitle] = useState("");
  const [album, setAlbum] = useState("");
  const [genre, setGenre] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const coverInputRef = useRef(null);

  // ── Reset/prefill whenever the panel opens for a (possibly new) track ──
  useEffect(() => {
    if (!isOpen || !track) return;
    setTitle(track.title || "");
    setAlbum(track.album || "");
    setGenre(track.genre || "");
    setCoverFile(null);
    setCoverPreviewUrl(track.coverUrl || null);
    setError(null);
    setSubmitting(false);
    setConfirmingDelete(false);
    setDeleting(false);
  }, [isOpen, track?.id]);

  const handleClose = () => {
    if (submitting || deleting) return;
    onClose?.();
  };

  const handleCoverPick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Please choose a JPG, PNG, WebP, or GIF image.');
      return;
    }
    setError(null);
    setCoverFile(file);
    setCoverPreviewUrl((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const trimmedTitle = title.trim();
  const canSubmit = trimmedTitle.length > 0 && !submitting && !deleting;

  const handleSave = async () => {
    if (!canSubmit || !track) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateMyUpload(track.id, {
        title: trimmedTitle,
        album: album.trim() || null,
        genre: genre.trim() || null,
        coverFile,
      });
      onSaved?.(updated);
      onClose?.();
    } catch (err) {
      console.log('Failed to update track:', err);
      setError(err.response?.data?.error || 'Could not save your changes. Please try again.');
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!track) return;
    setDeleting(true);
    try {
      await deleteMyUpload(track.id);
      onDeleted?.(track);
      onClose?.();
    } catch (err) {
      console.log('Failed to delete track:', err);
      setError('Could not delete this track. Please try again.');
      setDeleting(false);
      setConfirmingDelete(false);
    }
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
            maxWidth: "220px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {track?.title || "Track"}
          </div>
          <div style={{ width: "28px" }} />
        </div>

        {/* ── Scrollable content ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 0" }}>

          {/* ── Cover picker ── */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
            <div
              onClick={() => !submitting && !deleting && coverInputRef.current?.click()}
              style={{
                position: "relative", width: 96, height: 96, borderRadius: "14px",
                cursor: (submitting || deleting) ? "default" : "pointer",
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
                disabled={submitting || deleting}
                style={{ display: "none" }}
              />
              {coverPreviewUrl ? (
                <img src={coverPreviewUrl} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <MusicNoteIcon size={36} />
              )}
              <div style={{
                position: "absolute", bottom: 4, right: 4,
                width: 26, height: 26, borderRadius: "50%",
                backgroundColor: colors.teal,
                border: `2px solid ${colors.bg}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <CameraIcon />
              </div>
            </div>
          </div>
          <div style={{ textAlign: "center", marginBottom: "24px", fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
            Tap to change cover
          </div>

          {/* ── Title ── */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "8px" }}>
              Title
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Track title"
              disabled={submitting || deleting}
              style={{
                width: "100%", padding: "12px 14px",
                backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`,
                borderRadius: "10px", color: colors.text,
                fontSize: "15px", fontFamily: "'Kanit', sans-serif",
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* ── Album (optional) ── */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "8px" }}>
              Album <span style={{ textTransform: "none", fontWeight: 400 }}>(optional)</span>
            </div>
            <input
              type="text"
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
              placeholder="Album or single name"
              disabled={submitting || deleting}
              style={{
                width: "100%", padding: "12px 14px",
                backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`,
                borderRadius: "10px", color: colors.text,
                fontSize: "15px", fontFamily: "'Kanit', sans-serif",
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* ── Genre (optional) ── */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "8px" }}>
              Genre <span style={{ textTransform: "none", fontWeight: 400 }}>(optional)</span>
            </div>
            <input
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="e.g. Indie Pop"
              disabled={submitting || deleting}
              style={{
                width: "100%", padding: "12px 14px",
                backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`,
                borderRadius: "10px", color: colors.text,
                fontSize: "15px", fontFamily: "'Kanit', sans-serif",
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{ fontSize: "12px", color: colors.danger, fontFamily: "'Kanit', sans-serif", marginBottom: "16px", textAlign: "center" }}>
              {error}
            </div>
          )}

          {/* ── Delete — tapping swaps this block into an inline confirm, no native dialogs ── */}
          {!confirmingDelete ? (
            <div
              onClick={() => !submitting && !deleting && setConfirmingDelete(true)}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "14px 4px", cursor: (submitting || deleting) ? "default" : "pointer",
                opacity: (submitting || deleting) ? 0.5 : 1,
              }}
            >
              <TrashIcon />
              <span style={{ fontSize: "14px", fontWeight: "600", color: colors.danger, fontFamily: "'Kanit', sans-serif" }}>
                Delete Track
              </span>
            </div>
          ) : (
            <div style={{
              backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`,
              borderRadius: "12px", padding: "16px", marginBottom: "8px",
            }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", marginBottom: "4px" }}>
                Delete this track?
              </div>
              <div style={{ fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginBottom: "16px" }}>
                This can't be undone.
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setConfirmingDelete(false)}
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
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          )}

          <div style={{ height: "20px" }} />
        </div>

        {/* ── Footer — Save Changes ── */}
        <div style={{
          padding: "16px 20px calc(20px + env(safe-area-inset-bottom, 0px))",
          borderTop: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}>
          <button
            onClick={handleSave}
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
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>

      </div>
    </div>
  );
}
