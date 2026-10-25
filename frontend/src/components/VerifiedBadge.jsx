// Verified artist badge: shown next to the name of an artist account the
// Ponytail team has confirmed is the real artist (see backend migration 019).
// Only ever driven by the server's artist_verified flag, never by a name.
const VerifiedBadge = ({ size = 16, style }) => (
  <span
    title="Verified artist"
    aria-label="Verified artist"
    role="img"
    style={{ display: "inline-flex", flexShrink: 0, verticalAlign: "middle", ...style }}
  >
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 1.5l2.6 1.9 3.2-.1 1 3.1 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3.1-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3.1-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3.1 3.2.1z"
        fill="#5DEBD7"
      />
      <path d="M7.8 12.2l2.8 2.8 5.6-5.8" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

export default VerifiedBadge;
