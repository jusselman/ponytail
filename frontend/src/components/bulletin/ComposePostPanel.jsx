import { useState, useEffect, useRef } from "react";
import { createBulletinPost } from '../../services/bulletinService';
import { searchAll } from '../../services/playlistService';
import { tagsFor, TAG_HINTS, TAG_FIELDS, MAX_POST_LENGTH, tagColor } from '../../constants/bulletinTags';
import {
  colors, kanit, Avatar, TagPill, MusicCard, PostDetails, XIcon, PhotoIcon, NoteIcon, DiscIcon,
} from './shared';

// ─── New Post panel ───────────────────────────────────────────────────────────
// Slides up over the Bulletin when the composer bar is tapped, and slides back
// down when closed. Everything a post can carry lives here: a tag (musicians
// and listeners get different sets), the text, the tag's extra fields (show
// date and venue, crowdfunding goal...), an optional photo and an optional
// track or album from the catalog.
//
// Props:
//   user      the signed-in user from getMe (username, display_name, is_artist, profile_picture)
//   onClose   () => void, called once the slide-down has finished
//   onPosted  (post) => void, the published post as the feed should show it
// ─────────────────────────────────────────────────────────────────────────────

const CLOSE_MS = 260;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const PLACEHOLDERS = {
  "New Release": "Tell people about the new music...",
  "Show": "Who's coming? Tell people about the show...",
  "Crowdfunding": "What are you raising money for?",
  "Milestone": "What are you celebrating?",
  "Looking For": "Describe what you need and what you're working on...",
  "Recommendation": "Who should everyone be listening to, and why?",
  "Show Recap": "How was it? Tell everyone what they missed...",
  "Discussion": "Start the conversation...",
  "Question": "What do you want to ask?",
  "General": "Share what's inspiring you...",
};

const fieldLabel = {
  fontSize: "11px", fontWeight: "600", color: colors.textSecondary, fontFamily: kanit,
  letterSpacing: "0.4px", textTransform: "uppercase", marginBottom: "6px",
};

const inputStyle = (invalid) => ({
  width: "100%", padding: "10px 12px", borderRadius: "10px",
  backgroundColor: colors.inputBg, border: `1.5px solid ${invalid ? colors.danger : "transparent"}`,
  color: colors.text, fontSize: "13px", outline: "none", fontFamily: kanit,
  boxSizing: "border-box", colorScheme: "dark",
});

// ─── One tag-specific input ──────────────────────────────────────────────────
const TagField = ({ field, value, onChange, invalid, accent }) => {
  if (field.type === "chips") {
    return (
      <div>
        <div style={fieldLabel}>{field.label}{field.required && " *"}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {field.options.map(opt => {
            const on = value === opt;
            return (
              <button key={opt} onClick={() => onChange(on ? "" : opt)} style={{
                padding: "5px 11px", borderRadius: "14px", cursor: "pointer", fontFamily: kanit,
                fontSize: "12px", fontWeight: "500",
                border: `1px solid ${on ? accent : invalid ? colors.danger : "rgba(255,255,255,0.14)"}`,
                backgroundColor: on ? `${accent}22` : "transparent",
                color: on ? accent : colors.textSecondary,
              }}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={fieldLabel}>{field.label}{field.required && " *"}</div>
      <input
        type={field.type === "date" ? "date" : "text"}
        inputMode={field.type === "money" ? "numeric" : field.type === "url" ? "url" : undefined}
        value={value || ""}
        placeholder={field.placeholder}
        onChange={e => onChange(field.type === "money" ? e.target.value.replace(/[^0-9]/g, "") : e.target.value)}
        style={inputStyle(invalid)}
      />
    </div>
  );
};

// ─── Music picker: search the catalog for a track or an album ───────────────
const MusicPicker = ({ open, onPick, onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 320);
      return () => clearTimeout(t);
    }
    setQuery(""); setResults([]);
    return undefined;
  }, [open]);

  const trimmed = query.trim();
  useEffect(() => {
    if (trimmed.length < 2) { setResults([]); setSearching(false); return undefined; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const all = await searchAll(trimmed);
        if (!cancelled) setResults(all.filter(r => r.type === "track" || r.type === "album").slice(0, 30));
      } catch (err) {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [trimmed]);

  const pick = (r) => {
    if (r.type === "album") {
      onPick({ type: "album", item: { album: r.album || r.name, artist: r.artist, genre: r.genre, coverUrl: r.coverUrl } });
    } else {
      onPick({ type: "track", item: { title: r.name, artist: r.artist, album: r.album, genre: r.genre, coverUrl: r.coverUrl, audioUrl: r.audioUrl } });
    }
  };

  return (
    <>
      {open && <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 20, backgroundColor: "rgba(0,0,0,0.5)" }} />}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: "78%", zIndex: 21,
        backgroundColor: colors.sheet, borderTopLeftRadius: "20px", borderTopRightRadius: "20px",
        transform: open ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        pointerEvents: open ? "all" : "none", boxShadow: "0 -10px 40px rgba(0,0,0,0.4)",
      }}>
        <div style={{ padding: "10px 0 0", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#444" }} />
        </div>
        <div style={{ padding: "12px 20px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "15px", fontWeight: "600", color: colors.text, fontFamily: kanit }}>Add music</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}>
            <XIcon size={18} />
          </button>
        </div>
        <div style={{ padding: "0 20px 10px" }}>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search songs, albums, artists"
            style={inputStyle(false)}
          />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 16px" }}>
          {trimmed.length < 2 && (
            <div style={{ textAlign: "center", color: colors.muted, fontFamily: kanit, fontSize: "13px", padding: "24px 20px" }}>
              Attach a track or a whole album. People can play it straight from your post.
            </div>
          )}
          {searching && results.length === 0 && (
            <div style={{ textAlign: "center", color: colors.muted, fontFamily: kanit, fontSize: "13px", padding: "20px 0" }}>Searching...</div>
          )}
          {!searching && trimmed.length >= 2 && results.length === 0 && (
            <div style={{ textAlign: "center", color: colors.muted, fontFamily: kanit, fontSize: "13px", padding: "20px 0" }}>Nothing found.</div>
          )}
          {results.map((r, i) => (
            <div
              key={`${r.type}-${r.artist}-${r.name}-${i}`}
              onClick={() => pick(r)}
              style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px", borderRadius: "12px", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: r.type === "album" ? "6px" : "10px", overflow: "hidden", flexShrink: 0, backgroundColor: "#333", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {r.coverUrl ? <img src={r.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <DiscIcon />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: colors.text, fontFamily: kanit, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                <div style={{ fontSize: "12px", color: colors.textSecondary, fontFamily: kanit, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.type === "album" ? "Album" : "Track"} · {r.artist}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// ─── The panel ───────────────────────────────────────────────────────────────
export default function ComposePostPanel({ user, onClose, onPosted }) {
  const isArtist = Boolean(user?.is_artist);
  const tags = tagsFor(isArtist);
  const [tag, setTag] = useState("General");
  const [body, setBody] = useState("");
  const [details, setDetails] = useState({});
  const [music, setMusic] = useState(null); // { type, item }
  const [image, setImage] = useState(null); // { file, previewUrl }
  const [pickerOpen, setPickerOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);
  const [invalidKeys, setInvalidKeys] = useState([]);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [closing, setClosing] = useState(false);
  const textRef = useRef(null);
  const fileRef = useRef(null);

  const fields = TAG_FIELDS[tag] || [];
  const accent = tagColor(tag);
  const trimmed = body.trim();
  const dirty = Boolean(trimmed || music || image || Object.values(details).some(Boolean));
  const remaining = MAX_POST_LENGTH - body.length;

  // Focus the text once the slide-up is done (preventScroll: see CityPickerSheet)
  useEffect(() => {
    const t = setTimeout(() => textRef.current?.focus({ preventScroll: true }), 340);
    return () => clearTimeout(t);
  }, []);

  // Free the photo preview when it changes or the panel goes away
  useEffect(() => () => { if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl); }, [image]);

  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, CLOSE_MS);
  };
  const requestClose = () => {
    if (posting) return;
    if (dirty && !confirmDiscard) { setConfirmDiscard(true); return; }
    close();
  };

  const setDetail = (key, value) => {
    setDetails(d => ({ ...d, [key]: value }));
    setInvalidKeys(keys => keys.filter(k => k !== key));
    setError(null);
  };

  const pickImage = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) { setError("Photos need to be JPG, PNG, WEBP or GIF."); return; }
    if (file.size > MAX_IMAGE_BYTES) { setError("Photos can be up to 8MB."); return; }
    setError(null);
    setImage({ file, previewUrl: URL.createObjectURL(file) });
  };

  // Only the current tag's fields are sent
  const detailsForTag = () => {
    const out = {};
    for (const f of fields) {
      const v = typeof details[f.key] === "string" ? details[f.key].trim() : details[f.key];
      if (v) out[f.key] = v;
    }
    return Object.keys(out).length ? out : null;
  };

  const handlePost = async () => {
    if (posting) return;
    if (!trimmed) { setError("Write something before posting."); textRef.current?.focus(); return; }
    const missing = fields.filter(f => f.required && !String(details[f.key] || "").trim());
    if (missing.length) {
      setInvalidKeys(missing.map(f => f.key));
      setError(`Add ${missing.map(f => f.label.replace(/ \(\$\)$/, "").toLowerCase()).join(" and ")} for a ${tag} post.`);
      return;
    }
    setPosting(true);
    setError(null);
    try {
      const attachment = music
        ? (music.type === "album" ? { type: "album", album: music.item } : { type: "track", track: music.item })
        : null;
      const post = await createBulletinPost({ body: trimmed, tag, details: detailsForTag(), attachment, imageFile: image?.file });
      onPosted(post);
      close();
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't publish your post. Make sure the backend is running.");
      setPosting(false);
    }
  };

  const canPost = trimmed.length > 0 && remaining >= 0 && !posting;
  const displayName = user?.display_name || user?.username || "You";

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 1060, backgroundColor: "rgba(0,0,0,0.55)",
      animation: closing ? `bulletinFadeOut ${CLOSE_MS}ms ease forwards` : "bulletinFadeIn 0.2s ease",
    }}>
      <style>{`
        @keyframes bulletinFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bulletinFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes bulletinSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes bulletinSheetDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
        .bulletin-compose textarea::placeholder, .bulletin-compose input::placeholder { color: #666; }
      `}</style>
      <div onClick={requestClose} style={{ position: "absolute", inset: 0 }} />

      <div className="bulletin-compose" style={{
        position: "absolute", left: 0, right: 0, bottom: 0, top: "44px",
        backgroundColor: colors.bg, borderRadius: "24px 24px 0 0",
        boxShadow: "0 -12px 40px rgba(0,0,0,0.6)",
        animation: closing
          ? `bulletinSheetDown ${CLOSE_MS}ms cubic-bezier(0.4, 0, 1, 1) forwards`
          : "bulletinSheetUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* ── Header ── */}
        <div style={{
          padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${colors.border}`, flexShrink: 0,
        }}>
          <button onClick={requestClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", width: "60px" }}>
            <XIcon />
          </button>
          <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: kanit }}>New Post</div>
          <button onClick={handlePost} disabled={!canPost} style={{
            width: "60px", padding: "7px 0", borderRadius: "18px", border: "none",
            backgroundColor: canPost ? colors.teal : "rgba(93,235,215,0.15)",
            color: canPost ? "#1a1a1a" : "rgba(93,235,215,0.5)",
            fontSize: "13px", fontWeight: "700", fontFamily: kanit, cursor: canPost ? "pointer" : "default",
          }}>
            {posting ? "..." : "Post"}
          </button>
        </div>

        {/* ── Discard confirm ── */}
        {confirmDiscard && (
          <div style={{
            display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px",
            backgroundColor: "rgba(255,107,107,0.1)", borderBottom: `1px solid ${colors.border}`, flexShrink: 0,
          }}>
            <div style={{ flex: 1, fontSize: "12.5px", color: colors.text, fontFamily: kanit }}>Discard this post?</div>
            <button onClick={() => setConfirmDiscard(false)} style={smallBtn(false)}>Keep editing</button>
            <button onClick={close} style={smallBtn(true)}>Discard</button>
          </div>
        )}

        {/* ── Scrollable form ── */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 16px 20px" }}>
          {/* Author */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Avatar name={displayName} size={38} imageUrl={user?.profile_picture} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: colors.text, fontFamily: kanit }}>{displayName}</div>
              <div style={{ fontSize: "11px", color: colors.muted, fontFamily: kanit }}>
                Posting as a {isArtist ? "musician" : "listener"} to the Bulletin
              </div>
            </div>
          </div>

          {/* Tag */}
          <div style={{ marginTop: "18px" }}>
            <div style={fieldLabel}>Tag</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
              {tags.map(t => (
                <TagPill key={t} label={t} size="lg" selected={t === tag} onClick={() => { setTag(t); setInvalidKeys([]); setError(null); }} />
              ))}
            </div>
            <div style={{ fontSize: "11.5px", color: colors.textSecondary, fontFamily: kanit, marginTop: "8px", fontWeight: "300" }}>
              {TAG_HINTS[tag]}
            </div>
          </div>

          {/* Text */}
          <div style={{ marginTop: "16px", position: "relative" }}>
            <textarea
              ref={textRef}
              value={body}
              onChange={e => { setBody(e.target.value); setError(null); }}
              placeholder={PLACEHOLDERS[tag]}
              rows={5}
              style={{
                ...inputStyle(false), resize: "none", lineHeight: 1.5, fontSize: "14px",
                padding: "12px 12px 24px", minHeight: "120px",
              }}
            />
            <div style={{
              position: "absolute", right: "10px", bottom: "8px", fontSize: "10.5px", fontFamily: kanit,
              color: remaining < 0 ? colors.danger : remaining < 100 ? colors.gold : colors.muted,
            }}>
              {remaining < 200 ? remaining : ""}
            </div>
          </div>

          {/* Tag-specific fields */}
          {fields.length > 0 && (
            <div key={tag} style={{
              marginTop: "14px", padding: "14px", borderRadius: "14px",
              backgroundColor: colors.bgCard, border: `1px solid ${accent}33`,
              display: "flex", flexDirection: "column", gap: "12px",
              animation: "bulletinFadeIn 0.2s ease",
            }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: accent, fontFamily: kanit }}>{tag} details</div>
              {fields.map(f => (
                <TagField
                  key={f.key} field={f} accent={accent}
                  value={details[f.key]} onChange={v => setDetail(f.key, v)}
                  invalid={invalidKeys.includes(f.key)}
                />
              ))}
            </div>
          )}

          {/* Preview of how the details will look in the feed */}
          {fields.length > 0 && detailsForTag() && (
            <div style={{ marginTop: "8px" }}>
              <div style={{ ...fieldLabel, marginBottom: 0, marginTop: "6px" }}>Preview</div>
              <PostDetails tag={tag} details={detailsForTag()} />
            </div>
          )}

          {/* Attachments */}
          {image && (
            <div style={{ marginTop: "14px", position: "relative", borderRadius: "12px", overflow: "hidden" }}>
              <img src={image.previewUrl} alt="" style={{ width: "100%", maxHeight: "260px", objectFit: "cover", display: "block" }} />
              <button onClick={() => setImage(null)} style={{
                position: "absolute", top: "8px", right: "8px", width: 28, height: 28, borderRadius: "50%",
                backgroundColor: "rgba(0,0,0,0.65)", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <XIcon size={14} color="#fff" />
              </button>
            </div>
          )}
          {music && <MusicCard type={music.type} item={music.item} onRemove={() => setMusic(null)} />}

        </div>

        {/* ── Error, pinned above the toolbar so it is never scrolled out of view ── */}
        {error && (
          <div style={{ flexShrink: 0, padding: "8px 16px", fontSize: "12px", color: colors.danger, fontFamily: kanit, backgroundColor: "rgba(255,107,107,0.08)", borderTop: `1px solid ${colors.border}` }}>
            {error}
          </div>
        )}

        {/* ── Attach toolbar ── */}
        <div style={{
          flexShrink: 0, display: "flex", gap: "8px", padding: "10px 16px 16px",
          borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bg,
        }}>
          <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(",")} onChange={pickImage} style={{ display: "none" }} />
          <button onClick={() => fileRef.current?.click()} style={toolBtn(Boolean(image))}>
            <PhotoIcon size={16} color={image ? colors.teal : colors.textSecondary} />
            {image ? "Change photo" : "Photo"}
          </button>
          <button onClick={() => setPickerOpen(true)} style={toolBtn(Boolean(music))}>
            <NoteIcon size={16} color={music ? colors.teal : colors.textSecondary} />
            {music ? "Change music" : "Music"}
          </button>
        </div>

        <MusicPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onPick={(m) => { setMusic(m); setPickerOpen(false); }}
        />
      </div>
    </div>
  );
}

const smallBtn = (danger) => ({
  padding: "5px 11px", borderRadius: "14px", border: "none", cursor: "pointer",
  backgroundColor: danger ? colors.danger : "rgba(255,255,255,0.08)",
  color: danger ? "#1a1a1a" : colors.text, fontSize: "12px", fontWeight: "600", fontFamily: kanit,
});

const toolBtn = (active) => ({
  display: "flex", alignItems: "center", gap: "7px", padding: "8px 14px", borderRadius: "18px",
  border: `1px solid ${active ? colors.teal : "rgba(255,255,255,0.12)"}`,
  backgroundColor: active ? colors.tealGlow : "transparent",
  color: active ? colors.teal : colors.textSecondary,
  fontSize: "12.5px", fontWeight: "500", fontFamily: kanit, cursor: "pointer",
});
