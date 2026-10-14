// ─── Bulletin post tags ───────────────────────────────────────────────────────
// Musicians and listeners get different tag sets, plus General for everyone.
// Keep in sync with backend/src/controllers/bulletinController.js, which
// validates the tag against the author's role and cleans the detail fields.

export const MUSICIAN_TAGS = ['New Release', 'Show', 'Crowdfunding', 'Milestone', 'Looking For'];
export const LISTENER_TAGS = ['Recommendation', 'Show Recap', 'Discussion', 'Question'];
export const SHARED_TAGS = ['General'];

export const tagsFor = (isArtist) => (
  isArtist ? [...MUSICIAN_TAGS, ...SHARED_TAGS] : [...LISTENER_TAGS, ...SHARED_TAGS]
);

// Accent per tag so the purpose of a post reads at a glance in the feed
export const TAG_COLORS = {
  'New Release': '#5DEBD7',
  'Show': '#f5cf00',
  'Crowdfunding': '#7ee081',
  'Milestone': '#c79bff',
  'Looking For': '#ff9f5a',
  'Recommendation': '#5DEBD7',
  'Show Recap': '#f5cf00',
  'Discussion': '#7fb4ff',
  'Question': '#ff8fb8',
  'General': '#aaaaaa',
};

export const tagColor = (tag) => TAG_COLORS[tag] || '#5DEBD7';

// One line under the tag picker explaining what the tag is for
export const TAG_HINTS = {
  'New Release': 'Announce a single, EP or album. Attach it so people can play it right here.',
  'Show': 'Tell people where and when to see you play.',
  'Crowdfunding': 'Share a campaign and how close you are to the goal.',
  'Milestone': 'Celebrate plays, signings, sold out shows and other wins.',
  'Looking For': 'Find bandmates, collaborators, gigs or a producer.',
  'Recommendation': 'Put someone on to music you love.',
  'Show Recap': 'Tell everyone what they missed.',
  'Discussion': 'Start a conversation with the community.',
  'Question': 'Ask the community anything.',
  'General': 'Anything else on your mind.',
};

// ── Extra inputs a tag adds to the composer. type: text | date | money | url | chips ──
export const TAG_FIELDS = {
  'Show': [
    { key: 'date', label: 'Date', type: 'date', required: true },
    { key: 'venue', label: 'Venue', type: 'text', placeholder: 'e.g. The Independent', required: true },
    { key: 'city', label: 'City', type: 'text', placeholder: 'e.g. San Francisco' },
    { key: 'ticketUrl', label: 'Ticket link', type: 'url', placeholder: 'https://' },
  ],
  'Crowdfunding': [
    { key: 'goal', label: 'Goal ($)', type: 'money', placeholder: '5000', required: true },
    { key: 'raised', label: 'Raised so far ($)', type: 'money', placeholder: '0' },
    { key: 'endDate', label: 'Ends', type: 'date' },
    { key: 'link', label: 'Campaign link', type: 'url', placeholder: 'https://' },
  ],
  'Looking For': [
    {
      key: 'role', label: 'Looking for', type: 'chips', required: true,
      options: ['Bassist', 'Drummer', 'Guitarist', 'Vocalist', 'Keys', 'Producer', 'Collaborator', 'Gig', 'Opening act'],
    },
    { key: 'location', label: 'Location', type: 'text', placeholder: 'e.g. Oakland or remote' },
  ],
  'New Release': [
    { key: 'releaseDate', label: 'Release date', type: 'date' },
  ],
  'Show Recap': [
    { key: 'artist', label: 'Artist', type: 'text', placeholder: 'Who played?' },
    { key: 'venue', label: 'Venue', type: 'text', placeholder: 'Where?' },
  ],
};

export const MAX_POST_LENGTH = 1000;
export const MAX_REPLY_LENGTH = 500;
