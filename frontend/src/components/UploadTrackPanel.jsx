import { useState, useRef } from "react";
import { uploadTrack } from '../services/authService';

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

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // matches backend multer limit
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/aac', 'audio/ogg'];
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

const CloseIcon = ({ size = 12, color = colors.text }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

// ─── Upload Track Panel — bottom-rising sheet, musician-only. Collects title
// (required), album/genre (optional), an audio file (required), and an optional
// cover image, then POSTs to /api/auth/tracks/upload. ──
export default function UploadTrackPanel({ isOpen, onClose, onUploaded }) {
  const [title, setTitle] = useState("");
  const [album, setAlbum] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const audioInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const resetForm = () => {
    setTitle("");
    setAlbum("");
    setAudioFile(null);
    setCoverFile(null);
    setCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setError(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose?.();
  };

  const handleAudioPick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      setError('Please choose an MP3, WAV, AAC, or OGG file.');
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      setError('Audio file must be under 25MB.');
      return;
    }
    setError(null);
    setAudioFile(file);
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
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const trimmedTitle = title.trim();
  const canSubmit = trimmedTitle.length > 0 && Boolean(audioFile) && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const track = await uploadTrack({
        title: trimmedTitle,
        album: album.trim() || null,
        audioFile,
        coverFile,
      });
      onUploaded?.(track);
      resetForm();
      onClose?.();
    } catch (err) {
      console.log('Failed to upload track:', err);
      setError(err.response?.data?.error || 'Could not upload your track. Please try again.');
      setSubmitting(false);
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
          }}>
            Upload Track
          </div>
          <div style={{ width: "28px" }} />
        </div>

        {/* ── Scrollable content ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 0" }}>

          {/* ── Cover picker (optional) ── */}
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
            {coverPreviewUrl ? "Tap to change cover" : "Add cover art (optional)"}
          </div>

          {/* ── Audio file picker (required) ── */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "8px" }}>
              Audio File
            </div>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioPick}
              disabled={submitting}
              style={{ display: "none" }}
            />
            <div
              onClick={() => !submitting && audioInputRef.current?.click()}
              style={{
                width: "100%", padding: "14px", boxSizing: "border-box",
                backgroundColor: colors.bgCard, border: `1.5px dashed ${audioFile ? colors.teal : colors.border}`,
                borderRadius: "10px", cursor: submitting ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}
            >
              <span style={{ fontSize: "14px", color: audioFile ? colors.teal : colors.muted, fontFamily: "'Kanit', sans-serif", fontWeight: audioFile ? "600" : "400" }}>
                {audioFile ? audioFile.name : "Choose an audio file"}
              </span>
            </div>
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

          {/* ── Genre/subgenre/mood/location aren't asked here — they come from the
          artist profile set up during onboarding, and apply to every upload. ── */}
          <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginBottom: "16px", lineHeight: 1.5 }}>
            Genre, mood, and location are pulled from your artist profile and applied automatically.
          </div>

          {error && (
            <div style={{ fontSize: "12px", color: colors.danger, fontFamily: "'Kanit', sans-serif", marginBottom: "16px", textAlign: "center" }}>
              {error}
            </div>
          )}

          <div style={{ height: "20px" }} />
        </div>

        {/* ── Footer — Upload button ── */}
        <div style={{
          padding: "16px 20px calc(20px + env(safe-area-inset-bottom, 0px))",
          borderTop: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}>
          <button
            onClick={handleSubmit}
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
            {submitting ? "Uploading..." : "Upload Track"}
          </button>
        </div>

      </div>
    </div>
  );
}
