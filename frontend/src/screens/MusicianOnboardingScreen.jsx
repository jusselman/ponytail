import { useState } from "react";
import { register } from '../services/authService';
import PonyMoodBg from '../assets/images/PonyMood.png';
import PonyRockBg from '../assets/images/PonyRock.png';

// ─── Colors — matches OnboardingScreen.jsx's palette ──────────────────────────
const colors = {
  bg: "#222222",
  teal: "#5DEBD7",
  tealDark: "#3ecfba",
  tealGlow: "rgba(93,235,215,0.15)",
  gold: "#f5cf00",
  text: "#ffffff",
  muted: "#888888",
  inputBg: "#2c2c2c",
  bgCard: "#2a2a2a",
};

// ─── Genre list (Tag 1/Tag 2 in enriched_db.csv) — same 32 genres SearchScreen.jsx
// uses, duplicated here per this file's existing convention of not sharing internal
// pieces across files. Order doesn't matter here (unlike SearchScreen's picker),
// since this step filters/searches rather than showing a fixed top-5. ──
const GENRE_LIST = [
  "Rock", "Jazz", "Pop", "Hip-Hop", "Electronic", "Folk", "Classical",
  "Country", "Metal", "Soul", "Punk", "R&B", "Funk", "World", "Reggae",
  "Soundtrack", "Latin", "Blues", "Brazilian", "Dance", "Experimental",
  "Industrial", "Ska", "Indie", "Vocal", "Musical", "Afrobeat", "Alternative",
  "Acoustic", "Chanson", "MPB", "Flamenco",
];

// ─── Mood list (Tag 4 in enriched_db.csv) — every unique mood found across the
// catalogue (see backend/scripts/listMoods.js / moods_list.txt), alphabetical,
// no track counts shown since this is a search-only picker, not a chip grid. ──
const MOOD_LIST = [
  "Abrasive", "Abstract", "Absurd", "Adventurous", "Afterhours", "Aggressive",
  "Alienated", "Angry", "Angsty", "Angular", "Anthemic", "Anxious", "Apocalyptic",
  "Assertive", "Atmospheric", "Austere", "Awkward", "Bitter", "Bittersweet",
  "Bizarre", "Bleak", "Bluesy", "Bold", "Bombastic", "Bouncy", "Brash", "Brassy",
  "Bratty", "Breezy", "Bright", "Brooding", "Brutal", "Campy", "Cathartic",
  "Caustic", "Celebratory", "Cerebral", "Chaotic", "Charging", "Chopped",
  "Cinematic", "Claustrophobic", "Cockney", "Cold", "Collage", "Colorful",
  "Comforting", "Commanding", "Communal", "Compassionate", "Complex",
  "Confessional", "Confident", "Confrontational", "Conscious", "Contemplative",
  "Conversational", "Cool", "Cosmic", "Crude", "Cynical", "Dance", "Dangerous",
  "Dark", "Dazzling", "Decadent", "Defiant", "Delicate", "Deranged", "Desert",
  "Detached", "Determined", "Devotional", "Disturbing", "Dramatic", "Dreamy",
  "Driving", "Druggy", "Drunken", "Dusty", "Dynamic", "Dystopian", "Earnest",
  "Earthy", "Eccentric", "Eclectic", "Ecstatic", "Electric", "Electrifying",
  "Elegant", "Elliptical", "Empowered", "Energetic", "Epic", "Ethereal",
  "Euphoric", "Evocative", "Expansive", "Experimental", "Exploratory",
  "Explosive", "Expressive", "Exuberant", "Fast", "Feisty", "Feral", "Ferocious",
  "Festive", "Feverish", "Fierce", "Fiery", "Flamboyant", "Flashy", "Flirty",
  "Floating", "Fluid", "Focused", "Fragile", "Fragmented", "Frantic",
  "Freewheeling", "Frenetic", "Funky", "Furious", "Futuristic", "Fuzzy",
  "Gentle", "Glitchy", "Glossy", "Graceful", "Grand", "Grandiose", "Grave",
  "Greasy", "Gritty", "Groovy", "Hardboiled", "Harmonic", "Harrowing", "Harsh",
  "Haunted", "Haunting", "Hazy", "Heartbroken", "Heartland", "Heavy", "Heroic",
  "Homemade", "Homespun", "Hopeful", "Hostile", "Hushed", "Hypnotic", "Icy",
  "Immersive", "Incendiary", "Intellectual", "Intense", "Intimate", "Intricate",
  "Introspective", "Inventive", "Jagged", "Jangly", "Joyful", "Kaleidoscopic",
  "Kinetic", "Laid-Back", "Liquid", "Literate", "Live", "Lo-Fi", "Lonesome",
  "Loose", "Louche", "Lush", "Lyrical", "Macabre", "Majestic", "Manic",
  "Meditative", "Melancholic", "Melodic", "Menacing", "Mesmerizing", "Militant",
  "Minimal", "Mischievous", "Moody", "Mournful", "Murky", "Mysterious",
  "Mystical", "Mythic", "Narrative", "Neon", "Nervy", "Nimble", "Nocturnal",
  "Noir", "Nostalgic", "Oceanic", "Oddball", "Offbeat", "Organic", "Ornate",
  "Otherworldly", "Paranoid", "Party", "Passionate", "Pastoral", "Peaceful",
  "Percussive", "Playful", "Poetic", "Poised", "Polished", "Political",
  "Positive", "Precise", "Primitive", "Propulsive", "Psychedelic", "Punchy",
  "Quirky", "Ragged", "Rambling", "Raspy", "Raucous", "Raw", "Rebellious",
  "Reckless", "Reflective", "Relaxed", "Resilient", "Restless", "Reverent",
  "Rhythmic", "Roadhouse", "Roadworn", "Romantic", "Rowdy", "Rustic", "Sacred",
  "Sardonic", "Satirical", "Savage", "Scrappy", "Searching", "Seductive",
  "Seedy", "Sensual", "Serene", "Sharp", "Shimmering", "Silly", "Sinister",
  "Sketchy", "Sleazy", "Sleek", "Slick", "Smoky", "Smooth", "Snappy", "Snarling",
  "Snotty", "Solitary", "Somber", "Sophisticated", "Soulful", "Spacious",
  "Sparse", "Spiritual", "Spooky", "Sprightly", "Stark", "Stormy",
  "Storytelling", "Strange", "Stylish", "Subtle", "Sultry", "Sunny", "Surreal",
  "Swaggering", "Sweeping", "Sweet", "Swinging", "Symphonic", "Taut",
  "Technical", "Tender", "Tense", "Theatrical", "Tough", "Transcendent",
  "Trashy", "Tribal", "Trippy", "Triumphant", "Tropical", "Uncanny", "Uneasy",
  "Unhinged", "Unsettling", "Upbeat", "Uplifting", "Urgent", "Violent",
  "Virtuosic", "Visionary", "Volatile", "Volcanic", "Wandering", "Warm",
  "Weightless", "Weird", "Whimsical", "Wild", "Wistful", "Witty", "World-Weary",
  "Wounded", "Wry", "Yearning", "Youthful", "Zany",
];

// ─── Next Button — same component as OnboardingScreen.jsx, duplicated rather than
// imported since neither file exports its internal pieces (matches existing convention) ──
const NextButton = ({ onPress, label = "Next", disabled = false }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <button
        onClick={onPress}
        disabled={disabled}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          padding: "10px 24px",
          borderRadius: "50px",
          border: "none",
          backgroundColor: disabled
            ? "rgba(93,235,215,0.3)"
            : hovered ? colors.tealDark : colors.teal,
          color: disabled ? "rgba(26,26,26,0.5)" : "#1a1a1a",
          fontSize: "15px",
          fontWeight: "600",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
          transform: hovered && !disabled ? "translateY(-1px)" : "translateY(0)",
          boxShadow: hovered && !disabled
            ? "0 8px 24px rgba(93,235,215,0.35)"
            : "0 4px 12px rgba(93,235,215,0.2)",
          fontFamily: "'Kanit', sans-serif",
          letterSpacing: "0.2px",
        }}
      >
        {label}
      </button>
    </div>
  );
};

// ─── Reusable Input ───────────────────────────────────────────────────────────
const PonytailInput = ({ name, focused, onFocus, onBlur, ...props }) => (
  <input
    style={{
      width: "100%",
      padding: "14px 16px",
      borderRadius: "14px",
      backgroundColor: colors.inputBg,
      border: `1.5px solid ${focused === name ? colors.teal : "transparent"}`,
      color: colors.text,
      fontSize: "15px",
      outline: "none",
      transition: "border 0.2s ease, box-shadow 0.2s ease",
      fontFamily: "'Kanit', sans-serif",
      boxSizing: "border-box",
      boxShadow: focused === name ? `0 0 0 4px rgba(93,235,215,0.1)` : "none",
    }}
    onFocus={() => onFocus(name)}
    onBlur={() => onBlur(null)}
    {...props}
  />
);

// ─── Step 1: Email ────────────────────────────────────────────────────────────
const EmailStep = ({ email, setEmail, onNext }) => {
  const [focused, setFocused] = useState(null);
  const [error, setError] = useState(null);

  const handleNext = () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    onNext();
  };

  return (
    <div style={{ width: "100%", animation: "fadeSlideUp 0.4s ease forwards" }}>
      <div style={{
        fontSize: "22px", fontWeight: "600", color: colors.text,
        fontFamily: "'Kanit', sans-serif", marginBottom: "28px",
        letterSpacing: "-0.2px", lineHeight: 1.3,
      }}>
        Enter your email address:
      </div>
      <PonytailInput
        name="email" focused={focused}
        onFocus={setFocused} onBlur={setFocused}
        placeholder="you@example.com" type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); setError(null); }}
      />
      {error && (
        <div style={{ color: "#ff6b6b", fontSize: "13px", fontFamily: "'Kanit', sans-serif", marginTop: "8px", marginLeft: "4px" }}>
          {error}
        </div>
      )}
      <div style={{ marginTop: "24px" }}>
        <NextButton onPress={handleNext} disabled={!email} />
      </div>
    </div>
  );
};

// ─── Step 2: Password ─────────────────────────────────────────────────────────
const PasswordStep = ({ password, setPassword, onNext }) => {
  const [focused, setFocused] = useState(null);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);

  const handleNext = () => {
    if (!password || password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match. Please try again."); return; }
    setError(null);
    onNext();
  };

  const inputStyle = (name) => ({
    width: "100%", padding: "14px 16px", borderRadius: "6px",
    backgroundColor: colors.inputBg, border: `1.5px solid #FFFFFF`,
    color: colors.text, fontSize: "15px", outline: "none",
    transition: "box-shadow 0.2s ease", fontFamily: "'Kanit', sans-serif",
    boxSizing: "border-box",
    boxShadow: focused === name ? `0 0 0 3px rgba(93,235,215,0.15)` : "none",
  });

  return (
    <div style={{ width: "100%", animation: "fadeSlideUp 0.4s ease forwards" }}>
      <div style={{ fontSize: "22px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", marginBottom: "12px", letterSpacing: "-0.2px", lineHeight: 1.3 }}>
        Enter a password:
      </div>
      <input style={inputStyle("password")} placeholder="" type="password" value={password}
        onChange={e => { setPassword(e.target.value); setError(null); }}
        onFocus={() => setFocused("password")} onBlur={() => setFocused(null)} />

      <div style={{ fontSize: "22px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", marginBottom: "12px", marginTop: "28px", letterSpacing: "-0.2px", lineHeight: 1.3 }}>
        One more time:
      </div>
      <input style={inputStyle("confirm")} placeholder="" type="password" value={confirm}
        onChange={e => { setConfirm(e.target.value); setError(null); }}
        onFocus={() => setFocused("confirm")} onBlur={() => setFocused(null)} />

      {error && (
        <div style={{ color: "#ff6b6b", fontSize: "13px", fontFamily: "'Kanit', sans-serif", marginTop: "10px", marginLeft: "2px" }}>
          {error}
        </div>
      )}
      <div style={{ marginTop: "24px" }}>
        <NextButton onPress={handleNext} disabled={!password || !confirm} />
      </div>
    </div>
  );
};

// ─── Step 3: Artist / Stage Name — musician-specific, replaces the favorite-artists
// picker since that step doesn't apply to an account that will be uploading, not
// discovering, music. This becomes the artist name attached to every uploaded track. ──
const ArtistNameStep = ({ artistName, setArtistName, onNext }) => {
  const [focused, setFocused] = useState(null);

  return (
    <div style={{ width: "100%", animation: "fadeSlideUp 0.4s ease forwards" }}>
      <div style={{
        fontSize: "22px", fontWeight: "600", color: colors.text,
        fontFamily: "'Kanit', sans-serif", marginBottom: "8px",
        letterSpacing: "-0.2px", lineHeight: 1.3,
      }}>
        What name do you release music under?
      </div>
      <div style={{ fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginBottom: "24px" }}>
        This is the artist name listeners will see on your tracks
      </div>
      <PonytailInput
        name="artistName" focused={focused}
        onFocus={setFocused} onBlur={setFocused}
        placeholder="Your artist or band name"
        value={artistName}
        onChange={e => setArtistName(e.target.value)}
      />
      <div style={{ marginTop: "24px" }}>
        <NextButton onPress={onNext} disabled={!artistName.trim()} />
      </div>
    </div>
  );
};

// ─── Step 4: Location — a plain city string, no geocoding/lat-long anywhere in
// the app yet. Feeds "Hot in Here" (nearby musicians), which starts out doing a
// same-city text match as an interim stand-in for real geo-radius matching later. ──
const LocationStep = ({ location, setLocation, onNext }) => {
  const [focused, setFocused] = useState(null);

  return (
    <div style={{ width: "100%", animation: "fadeSlideUp 0.4s ease forwards" }}>
      <div style={{
        fontSize: "22px", fontWeight: "600", color: colors.text,
        fontFamily: "'Kanit', sans-serif", marginBottom: "8px",
        letterSpacing: "-0.2px", lineHeight: 1.3,
      }}>
        What city are you based out of?
      </div>
      <div style={{ fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginBottom: "24px" }}>
        This connects you with nearby musicians and listeners in Hot in Here
      </div>
      <PonytailInput
        name="location" focused={focused}
        onFocus={setFocused} onBlur={setFocused}
        placeholder="Your city"
        value={location}
        onChange={e => setLocation(e.target.value)}
      />
      <div style={{ marginTop: "24px" }}>
        <NextButton onPress={onNext} disabled={!location.trim()} />
      </div>
    </div>
  );
};

// ─── Shared genre chip grid — used by both GenreStep and SubgenreStep. Filters
// by the current search text (substring match), so typing into the search box
// and tapping a chip are really the same interaction against the same list.
// Tapping the already-selected chip toggles it back off. ──
const GenreChipGrid = ({ genres, selected, onSelect }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
    {genres.map((genre, i) => {
      const hue = (GENRE_LIST.indexOf(genre) * 37 + 160) % 360;
      const isSelected = selected === genre;
      return (
        <div
          key={genre}
          onClick={() => onSelect(isSelected ? null : genre)}
          style={{
            padding: "8px 16px", borderRadius: "20px",
            background: isSelected
              ? colors.tealGlow
              : `linear-gradient(135deg, hsl(${hue}, 35%, 28%), hsl(${hue + 30}, 30%, 22%))`,
            border: isSelected ? `2px solid ${colors.teal}` : `2px solid transparent`,
            fontSize: "13px", fontWeight: "500",
            color: isSelected ? colors.teal : colors.text,
            fontFamily: "'Kanit', sans-serif",
            cursor: "pointer", transition: "opacity 0.2s ease",
          }}
        >
          {genre}
        </div>
      );
    })}
    {genres.length === 0 && (
      <div style={{ fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif", padding: "8px 0" }}>
        No genres match your search.
      </div>
    )}
  </div>
);

// ─── Step 5: Genre (Tag 1) — type into the search box to filter, or just tap a
// chip directly; both land on the same GenreChipGrid. Single-select, since a
// musician's profile carries exactly one primary genre. ──
const GenreStep = ({ genre, setGenre, onNext }) => {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(null);

  const filtered = GENRE_LIST.filter(g => g.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div style={{ width: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", animation: "fadeSlideUp 0.4s ease forwards" }}>
      <div style={{
        fontSize: "22px", fontWeight: "600", color: colors.text,
        fontFamily: "'Kanit', sans-serif", marginBottom: "8px",
        letterSpacing: "-0.2px", lineHeight: 1.3,
      }}>
        What genre best describes your music?
      </div>
      <div style={{ fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginBottom: "20px" }}>
        Search or tap to choose
      </div>
      <div style={{ marginBottom: "16px" }}>
        <PonytailInput
          name="genreSearch" focused={focused}
          onFocus={setFocused} onBlur={setFocused}
          placeholder="Search genres"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      {/* ── Fills whatever vertical space is left down to the Next button, instead
      of stopping partway down the card — scrolls internally if it overflows ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", marginBottom: "8px" }}>
        <GenreChipGrid genres={filtered} selected={genre} onSelect={setGenre} />
      </div>
      <div style={{ marginTop: "16px" }}>
        <NextButton onPress={onNext} disabled={!genre} />
      </div>
    </div>
  );
};

// ─── Step 6: Subgenre (Tag 2) — same list and interaction as GenreStep, but the
// already-chosen main genre is excluded (musician can't pick the same one twice). ──
const SubgenreStep = ({ genre, subgenre, setSubgenre, onNext }) => {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(null);

  const available = GENRE_LIST.filter(g => g !== genre);
  const filtered = available.filter(g => g.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div style={{ width: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", animation: "fadeSlideUp 0.4s ease forwards" }}>
      <div style={{
        fontSize: "22px", fontWeight: "600", color: colors.text,
        fontFamily: "'Kanit', sans-serif", marginBottom: "8px",
        letterSpacing: "-0.2px", lineHeight: 1.3,
      }}>
        What subgenre fits too?
      </div>
      <div style={{ fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginBottom: "20px" }}>
        Search or tap to choose — pick something different from {genre}
      </div>
      <div style={{ marginBottom: "16px" }}>
        <PonytailInput
          name="subgenreSearch" focused={focused}
          onFocus={setFocused} onBlur={setFocused}
          placeholder="Search genres"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      {/* ── Fills whatever vertical space is left down to the Next button, same
      treatment as GenreStep ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", marginBottom: "8px" }}>
        <GenreChipGrid genres={filtered} selected={subgenre} onSelect={setSubgenre} />
      </div>
      <div style={{ marginTop: "16px" }}>
        <NextButton onPress={onNext} disabled={!subgenre} />
      </div>
    </div>
  );
};

// ─── Step 7: Mood (Tag 4) — search only, no chip grid (327 options is too many
// to browse visually). Results appear as a scrollable list once the musician
// starts typing; tapping a result selects it and fills the search box. ──
const MoodStep = ({ mood, setMood, onNext }) => {
  const [query, setQuery] = useState(mood || "");
  const [focused, setFocused] = useState(null);

  const trimmedQuery = query.trim().toLowerCase();
  const showResults = trimmedQuery.length > 0 && query !== mood;
  const filtered = showResults
    ? MOOD_LIST.filter(m => m.toLowerCase().includes(trimmedQuery))
    : [];

  const handleSelect = (m) => {
    setMood(m);
    setQuery(m);
  };

  return (
    <div style={{ width: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", animation: "fadeSlideUp 0.4s ease forwards" }}>
      <div style={{
        fontSize: "22px", fontWeight: "600", color: colors.text,
        fontFamily: "'Kanit', sans-serif", marginBottom: "8px",
        letterSpacing: "-0.2px", lineHeight: 1.3,
      }}>
        What mood best fits your sound?
      </div>
      <div style={{ fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginBottom: "20px" }}>
        Start typing to search
      </div>
      <PonytailInput
        name="moodSearch" focused={focused}
        onFocus={setFocused} onBlur={setFocused}
        placeholder="Search moods"
        value={query}
        onChange={e => { setQuery(e.target.value); if (e.target.value !== mood) setMood(null); }}
      />
      {showResults && (
        <div style={{ maxHeight: "240px", overflowY: "auto", marginTop: "10px" }}>
          {filtered.length > 0 ? filtered.map(m => (
            <div
              key={m}
              onClick={() => handleSelect(m)}
              style={{
                padding: "12px 14px", borderRadius: "10px", marginBottom: "6px",
                backgroundColor: mood === m ? colors.tealGlow : colors.bgCard,
                border: mood === m ? `1.5px solid ${colors.teal}` : `1.5px solid transparent`,
                color: mood === m ? colors.teal : colors.text,
                fontSize: "14px", fontFamily: "'Kanit', sans-serif",
                cursor: "pointer",
              }}
            >
              {m}
            </div>
          )) : (
            <div style={{ fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif", padding: "8px 0" }}>
              No moods match your search.
            </div>
          )}
        </div>
      )}
      <div style={{ marginTop: "24px" }}>
        <NextButton onPress={onNext} disabled={!mood} />
      </div>
      {/* ── Fills only the empty space left below the button — never underlaps the
      title, input, results, or button above it ── */}
      <div style={{
        flex: 1, minHeight: "60px", marginTop: "20px",
        borderRadius: "20px", overflow: "hidden",
        backgroundImage: `url(${PonyMoodBg})`,
        backgroundSize: "cover", backgroundPosition: "center",
      }} />
    </div>
  );
};

// ─── Step 8: Sound description (Tag 5) — entirely free-form, capped at 30
// characters. Deliberately open-ended so a musician can name any niche they want. ──
const SoundDescriptionStep = ({ soundDescription, setSoundDescription, onNext, loading }) => {
  const [focused, setFocused] = useState(null);
  const remaining = 30 - soundDescription.length;

  return (
    <div style={{ width: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", animation: "fadeSlideUp 0.4s ease forwards" }}>
      <div style={{
        fontSize: "22px", fontWeight: "600", color: colors.text,
        fontFamily: "'Kanit', sans-serif", marginBottom: "8px",
        letterSpacing: "-0.2px", lineHeight: 1.3,
      }}>
        In your own words, how would you describe your sound? This part's entirely up to you.
      </div>
      <div style={{ fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginBottom: "24px" }}>
        Get as specific as you want
      </div>
      <PonytailInput
        name="soundDescription" focused={focused}
        onFocus={setFocused} onBlur={setFocused}
        placeholder="A few words about your sound"
        value={soundDescription}
        maxLength={30}
        onChange={e => setSoundDescription(e.target.value.slice(0, 30))}
      />
      <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "8px", textAlign: "right" }}>
        {remaining} characters left
      </div>
      <div style={{ marginTop: "16px" }}>
        <NextButton
          onPress={onNext}
          label={loading ? "Creating account..." : "Finish"}
          disabled={!soundDescription.trim() || loading}
        />
      </div>
      {/* ── Fills only the empty space left below the button — never underlaps the
      title, input, or button above it ── */}
      <div style={{
        flex: 1, minHeight: "60px", marginTop: "20px",
        borderRadius: "20px", overflow: "hidden",
        backgroundImage: `url(${PonyRockBg})`,
        backgroundSize: "cover", backgroundPosition: "center",
      }} />
    </div>
  );
};

// ─── Root Musician Onboarding Component — email, password, artist name, done.
// Deliberately skips the listener flow's favorite-artists picker and marketing
// slides (intro/artist/pony mode/goat mode); those exist to warm up a listener's
// personalized feed, which isn't relevant to an account whose purpose is uploading. ──
export default function MusicianOnboardingScreen({ setScreen }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [artistName, setArtistName] = useState("");
  // ── Board-requested additions: location, genre, subgenre, mood, and a free-text
  // sound description — captured once here, then used both as the musician's
  // profile (for the personalized radio station / Hot in Here) and as the default
  // tags stamped onto every track they upload (see authRoutes.js /tracks/upload). ──
  const [location, setLocation] = useState("");
  const [genre, setGenre] = useState(null);
  const [subgenre, setSubgenre] = useState(null);
  const [mood, setMood] = useState(null);
  const [soundDescription, setSoundDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFinishSignup = async () => {
    setLoading(true);
    try {
      const username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
      await register(email, username, password, true, artistName.trim(), {
        location: location.trim(),
        genre,
        subgenre,
        mood,
        soundDescription: soundDescription.trim(),
      }); // is_artist: true, display_name: artist name
      setScreen("home");
    } catch (err) {
      const message = err.response?.data?.error || 'Something went wrong.';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Kanit', sans-serif; }
        body { background: #222222; }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        input::placeholder { color: #555; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px #2c2c2c inset !important;
          -webkit-text-fill-color: white !important;
        }
      `}</style>

      <div style={{
        minHeight: "100vh", width: "100%", backgroundColor: colors.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Kanit', sans-serif", padding: "20px",
      }}>
        <div style={{
          width: "375px",
          // ── Fixed (not min) height, matching every other screen's 375x750 card —
          // this is also what lets the flex chain below (GenreStep/SubgenreStep's
          // flex:1 chip grid) actually cap and scroll internally instead of growing
          // the card taller, since flex-basis needs a definite parent height to
          // resolve against. ──
          height: "750px",
          backgroundColor: colors.bg,
          borderRadius: "40px",
          boxShadow: "0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
          display: "flex", flexDirection: "column",
          padding: "60px 32px 40px",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div style={{
              fontSize: "11px", fontWeight: "700", color: colors.gold,
              fontFamily: "'Kanit', sans-serif", letterSpacing: "1.5px",
              textTransform: "uppercase", marginBottom: "20px",
            }}>
              Musician Sign Up
            </div>

            {step === "email" && <EmailStep email={email} setEmail={setEmail} onNext={() => setStep("password")} />}
            {step === "password" && <PasswordStep password={password} setPassword={setPassword} onNext={() => setStep("artistName")} />}
            {step === "artistName" && (
              <ArtistNameStep
                artistName={artistName}
                setArtistName={setArtistName}
                onNext={() => setStep("location")}
              />
            )}
            {step === "location" && (
              <LocationStep location={location} setLocation={setLocation} onNext={() => setStep("genre")} />
            )}
            {step === "genre" && (
              <GenreStep genre={genre} setGenre={setGenre} onNext={() => setStep("subgenre")} />
            )}
            {step === "subgenre" && (
              <SubgenreStep genre={genre} subgenre={subgenre} setSubgenre={setSubgenre} onNext={() => setStep("mood")} />
            )}
            {step === "mood" && (
              <MoodStep mood={mood} setMood={setMood} onNext={() => setStep("soundDescription")} />
            )}
            {step === "soundDescription" && (
              <SoundDescriptionStep
                soundDescription={soundDescription}
                setSoundDescription={setSoundDescription}
                onNext={handleFinishSignup}
                loading={loading}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
