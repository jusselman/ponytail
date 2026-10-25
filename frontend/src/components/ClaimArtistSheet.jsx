import { useState, useEffect } from "react";
import { createClaim, getMyClaims } from "../services/claimService";

const colors = {
  bg: "#222222",
  bgCard: "#2a2a2a",
  teal: "#5DEBD7",
  tealGlow: "rgba(93,235,215,0.15)",
  text: "#ffffff",
  textSecondary: "#aaaaaa",
  muted: "#666666",
  border: "rgba(255,255,255,0.07)",
  error: "#ff6b6b",
};

const font = "'Kanit', sans-serif";
const same = (a, b) => String(a || "").normalize("NFC").toLowerCase() === String(b || "").normalize("NFC").toLowerCase();

// ─── Claim this artist ────────────────────────────────────────────────────────
// For an artist account that is really an artist from the catalog. They tell us
// where we can check, get a one-off code to post there, and the Ponytail team
// confirms it. Until then nothing changes: no badge, no name, no held tips.
const ClaimArtistSheet = ({ artistName, isOpen, onClose }) => {
  const [claim, setClaim] = useState(null);       // this artist's latest claim, if any
  const [evidence, setEvidence] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setEvidence("");
    setCopied(false);
    setLoading(true);
    getMyClaims()
      .then((claims) => setClaim(claims.find((c) => same(c.artistName, artistName)) || null))
      .catch(() => setClaim(null))
      .finally(() => setLoading(false));
  }, [isOpen, artistName]);

  const handleSend = async () => {
    if (evidence.trim().length < 10) {
      setError("Add a link we can check, like your Bandcamp, Instagram or website.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      setClaim(await createClaim(artistName, evidence.trim()));
    } catch (err) {
      setError(err.response?.data?.error || "Could not send your claim. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(claim.verificationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard not available; the code is on screen */ }
  };

  const showForm = !claim || claim.status === "rejected";

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute", inset: 0, zIndex: 20,
        background: isOpen ? "rgba(0,0,0,0.55)" : "transparent",
        transition: "background 0.3s",
        pointerEvents: isOpen ? "all" : "none",
        display: "flex", alignItems: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxHeight: "85%", overflowY: "auto",
          background: colors.bg, borderTop: `1px solid ${colors.border}`,
          borderRadius: "20px 20px 0 0", padding: "22px 20px 28px",
          transform: isOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
          fontFamily: font,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "#444", margin: "0 auto 18px" }} />
        <div style={{ fontSize: "20px", fontWeight: 700, color: colors.text, letterSpacing: "-0.3px" }}>
          Are you {artistName}?
        </div>

        {loading ? (
          <div style={{ color: colors.muted, fontSize: "14px", padding: "24px 0" }}>Loading...</div>
        ) : (
          <>
            {claim?.status === "approved" && (
              <p style={{ color: colors.textSecondary, fontSize: "14px", lineHeight: 1.5, marginTop: "10px" }}>
                You're verified as {artistName}. Your account carries the badge and receives this artist's tips.
              </p>
            )}

            {claim?.status === "pending" && (
              <>
                <p style={{ color: colors.textSecondary, fontSize: "14px", lineHeight: 1.5, marginTop: "10px" }}>
                  Thanks. To prove it's you, add this code to the bio or about section of a page only {artistName} controls,
                  such as your Bandcamp, Instagram or website. The Ponytail team checks it and lets you know.
                </p>
                <button
                  onClick={copyCode}
                  style={{
                    marginTop: "14px", width: "100%", padding: "14px",
                    background: colors.tealGlow, border: `1px dashed ${colors.teal}`, borderRadius: "12px",
                    color: colors.teal, fontFamily: "monospace", fontSize: "18px", letterSpacing: "1px", cursor: "pointer",
                  }}
                >
                  {claim.verificationCode}
                </button>
                <div style={{ textAlign: "center", fontSize: "11px", color: colors.muted, marginTop: "6px" }}>
                  {copied ? "Copied" : "Tap to copy"}
                </div>
                <p style={{ color: colors.muted, fontSize: "12px", lineHeight: 1.5, marginTop: "14px" }}>
                  You can remove the code once you're verified. Tips sent to {artistName} are held safely until then.
                </p>
              </>
            )}

            {claim?.status === "rejected" && (
              <div style={{
                marginTop: "12px", padding: "12px", borderRadius: "10px",
                background: "rgba(255,107,107,0.08)", color: colors.textSecondary, fontSize: "13px", lineHeight: 1.5,
              }}>
                Your last claim wasn't approved{claim.reviewerNote ? `: ${claim.reviewerNote}` : "."} You can try again below.
              </div>
            )}

            {showForm && (
              <>
                <p style={{ color: colors.textSecondary, fontSize: "14px", lineHeight: 1.5, marginTop: "10px" }}>
                  If this is your music, claim the profile. Once the Ponytail team confirms it's you, your account takes the
                  name {artistName}, gets a verified badge, and receives any tips fans have sent.
                </p>
                <div style={{ fontSize: "12px", color: colors.muted, margin: "16px 0 6px", fontWeight: 500 }}>
                  Where can we check it's you?
                </div>
                <textarea
                  value={evidence}
                  maxLength={1000}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder="Links to your Bandcamp, Instagram or website, and anything else that helps"
                  rows={4}
                  style={{
                    width: "100%", resize: "none", padding: "12px", borderRadius: "12px",
                    background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.text,
                    fontFamily: font, fontSize: "14px", outline: "none",
                  }}
                />
                {error && <div style={{ color: colors.error, fontSize: "13px", marginTop: "8px" }}>{error}</div>}
                <button
                  onClick={handleSend}
                  disabled={sending}
                  style={{
                    marginTop: "14px", width: "100%", padding: "14px", borderRadius: "999px", border: "none",
                    background: colors.teal, color: "#1a1a1a", fontFamily: font, fontSize: "15px", fontWeight: 600,
                    cursor: sending ? "default" : "pointer", opacity: sending ? 0.6 : 1,
                  }}
                >
                  {sending ? "Sending..." : "Claim this artist"}
                </button>
              </>
            )}

            <button
              onClick={onClose}
              style={{
                marginTop: "10px", width: "100%", padding: "12px", background: "none", border: "none",
                color: colors.textSecondary, fontFamily: font, fontSize: "14px", cursor: "pointer",
              }}
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ClaimArtistSheet;
