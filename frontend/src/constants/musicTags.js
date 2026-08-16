// ─── Shared genre/mood vocabulary ──────────────────────────────────────────────
// Pulled out of MusicianOnboardingScreen.jsx so EditProfilePanel (which needs to
// let an artist re-pick these same onboarding answers later) doesn't have to
// duplicate the ~400-line mood list a third time. MusicianOnboardingScreen.jsx
// and SearchScreen.jsx keep their own copies untouched — this file only backs
// new code, so nothing already working depends on it.

// Genre list (Tag 1/Tag 2 in enriched_db.csv) — same 32 genres used at onboarding
// and in SearchScreen's Browse-by-Genre.
export const GENRE_LIST = [
  "Rock", "Jazz", "Pop", "Hip-Hop", "Electronic", "Folk", "Classical",
  "Country", "Metal", "Soul", "Punk", "R&B", "Funk", "World", "Reggae",
  "Soundtrack", "Latin", "Blues", "Brazilian", "Dance", "Experimental",
  "Industrial", "Ska", "Indie", "Vocal", "Musical", "Afrobeat", "Alternative",
  "Acoustic", "Chanson", "MPB", "Flamenco",
];

// Mood list (Tag 4 in enriched_db.csv) — every unique mood found across the
// catalogue (see backend/scripts/listMoods.js / moods_list.txt), alphabetical.
export const MOOD_LIST = [
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
