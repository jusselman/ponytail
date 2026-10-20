import { useState, useEffect } from "react";
import { useUI } from '../context/UIContext';
import { getTipRecipient, sendTip } from '../services/tipService';
import {
  TEST_CARD, BRAND_LABELS, detectBrand, formatCardNumber, formatExpiry, digitsOnly, validateCard,
  confirmCardPayment, confirmSavedCardPayment, getSavedCard, saveCard, forgetSavedCard,
  cardFeeCents, formatCents,
} from '../services/paymentService';

// ─── Tip Panel ────────────────────────────────────────────────────────────────
// Slides up from the bottom when someone taps Tip. Open it from any screen with
// openTip(target) from UIContext and mount <TipPanel /> inside that screen's
// phone frame (Home does this). target is what prompted the tip:
//   { type: 'track', title, artist, album, coverUrl }
//   { type: 'playlist', playlistId, title, coverUrl }
//   { type: 'post', postId, excerpt }
// The server works out who actually gets the tip from the target.
//
// Payment is a mock Stripe checkout (see services/paymentService.js): nothing
// is charged, only Stripe test cards work, and the tip is saved for real so
// it shows up in the recipient's Profile.
// ─────────────────────────────────────────────────────────────────────────────

const colors = {
  bg: "#222222",
  bgCard: "#2a2a2a",
  bgInput: "#1c1c1c",
  teal: "#5DEBD7",
  tealGlow: "rgba(93,235,215,0.15)",
  text: "#ffffff",
  textSecondary: "#aaaaaa",
  muted: "#666666",
  danger: "#ff6b6b",
  testMode: "#f5a623",
  border: "rgba(255,255,255,0.07)",
  borderInput: "rgba(255,255,255,0.14)",
};
const kanit = "'Kanit', sans-serif";

const CLOSE_MS = 260;
const PRESETS = [100, 300, 500, 1000];
const DEFAULT_CENTS = 300;
const MIN_CENTS = 100;
const MAX_CENTS = 50000;
const MAX_MESSAGE = 200;

// ── The same heart-and-plus as the Tip button on Home ──
export const TipHeartIcon = ({ size = 13, color = colors.teal, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 21C12 21 3 16 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-9 12-9 12z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 10v4M10 12h4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"/>
  </svg>
);

const XIcon = ({ color = colors.textSecondary, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const LockIcon = ({ color = colors.muted, size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const Spinner = ({ color = "#102a26" }) => (
  <div style={{
    width: 16, height: 16, borderRadius: "50%",
    border: `2px solid ${color}`, borderTopColor: "transparent",
    animation: "tipSpin 0.8s linear infinite",
  }} />
);

const BrandBadge = ({ brand }) => (
  <div style={{
    minWidth: 38, height: 22, padding: "0 6px", borderRadius: 4,
    backgroundColor: brand === 'unknown' ? "#3a3a3a" : "#f4f4f4",
    color: brand === 'visa' ? "#1a1f71" : brand === 'mastercard' ? "#eb001b" : brand === 'amex' ? "#2e77bc" : brand === 'discover' ? "#e55c20" : colors.textSecondary,
    fontSize: brand === 'visa' ? 11 : 8.5, fontWeight: 800, fontStyle: brand === 'visa' ? "italic" : "normal",
    display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial, sans-serif",
    letterSpacing: brand === 'visa' ? 0.5 : 0, flexShrink: 0,
  }}>
    {BRAND_LABELS[brand] || 'Card'}
  </div>
);

// ── Recipient avatar: track/playlist cover, their profile photo, or initials ──
const RecipientAvatar = ({ name, imageUrl, size = 48, rounded }) => {
  const [failed, setFailed] = useState(false);
  const initials = (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const hue = (name || "?").charCodeAt(0) * 37 % 360;
  const radius = rounded ? "50%" : "10px";
  if (imageUrl && !failed) {
    return (
      <div style={{ width: size, height: size, borderRadius: radius, overflow: "hidden", flexShrink: 0 }}>
        <img src={imageUrl} alt={name} onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: `linear-gradient(135deg, hsl(${hue}, 60%, 45%), hsl(${hue + 40}, 70%, 35%))`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, color: "#fff", fontFamily: kanit,
    }}>
      {initials}
    </div>
  );
};

const fieldStyle = (hasError) => ({
  width: "100%", boxSizing: "border-box",
  backgroundColor: colors.bgInput, color: colors.text,
  border: `1px solid ${hasError ? colors.danger : colors.borderInput}`,
  borderRadius: "10px", padding: "11px 12px",
  fontSize: "14px", fontFamily: kanit, outline: "none",
});

const Label = ({ children, right }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
    <div style={{ fontSize: "11px", fontWeight: 600, color: colors.muted, fontFamily: kanit, letterSpacing: "0.8px", textTransform: "uppercase" }}>
      {children}
    </div>
    {right}
  </div>
);

const targetLabelFor = (target) => (
  target.type === 'track' ? target.title : target.type === 'playlist' ? target.title : target.excerpt
);
const targetKindFor = (target) => (
  target.type === 'track' ? 'track' : target.type === 'playlist' ? 'playlist' : 'post'
);

export default function TipPanel() {
  const { tipTarget, closeTip, user } = useUI();
  if (!tipTarget) return null;
  // Keyed on the target so every tip starts from a clean form
  const key = tipTarget.type === 'track' ? `t|${tipTarget.title}|${tipTarget.artist}` : `${tipTarget.type}|${tipTarget.playlistId || tipTarget.postId}`;
  return <TipSheet key={key} target={tipTarget} onClosed={closeTip} user={user} />;
}

function TipSheet({ target, onClosed, user }) {
  const [closing, setClosing] = useState(false);
  const [recipient, setRecipient] = useState(null);
  const [recipientError, setRecipientError] = useState(null);

  const [preset, setPreset] = useState(DEFAULT_CENTS); // cents, or 'custom'
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  const [savedCard, setSavedCard] = useState(null);
  const [useSaved, setUseSaved] = useState(false);
  const [card, setCard] = useState({ number: "", exp: "", cvc: "", zip: "" });
  const [cardErrors, setCardErrors] = useState({});
  const [rememberCard, setRememberCard] = useState(true);

  const [status, setStatus] = useState('idle'); // idle | paying | done
  const [payError, setPayError] = useState(null);
  const [sentTip, setSentTip] = useState(null);

  const close = () => {
    if (closing || status === 'paying') return;
    setClosing(true);
    setTimeout(onClosed, CLOSE_MS);
  };

  useEffect(() => {
    getTipRecipient(target)
      .then(setRecipient)
      .catch((err) => setRecipientError(err?.response?.data?.error || "Couldn't load who this tip goes to."));
    getSavedCard().then((saved) => {
      if (saved?.last4) { setSavedCard(saved); setUseSaved(true); }
    });
  }, []);

  // Escape closes, like the other sheets
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const amountCents = preset === 'custom'
    ? Math.round((Number(customAmount.replace(/[^0-9.]/g, '')) || 0) * 100)
    : preset;
  const amountValid = amountCents >= MIN_CENTS && amountCents <= MAX_CENTS;
  const feeCents = amountValid ? cardFeeCents(amountCents) : 0;

  const recipientName = recipient?.name || (target.type === 'track' ? target.artist : '');
  const label = targetLabelFor(target);
  const blocked = !!recipientError || recipient?.isYou;
  const canPay = !!recipient && !blocked && amountValid && status === 'idle';

  const updateCard = (field, value) => {
    setPayError(null);
    setCardErrors(prev => ({ ...prev, [field]: undefined }));
    if (field === 'number') value = formatCardNumber(value);
    if (field === 'exp') value = formatExpiry(value);
    if (field === 'cvc') value = digitsOnly(value).slice(0, 4);
    if (field === 'zip') value = digitsOnly(value).slice(0, 5);
    setCard(prev => ({ ...prev, [field]: value }));
  };

  const fillTestCard = () => {
    setPayError(null);
    setCardErrors({});
    setCard({ ...TEST_CARD });
  };

  const handlePay = async () => {
    if (!canPay) return;
    setPayError(null);

    if (!useSaved) {
      const errors = validateCard(card);
      if (Object.keys(errors).length) { setCardErrors(errors); return; }
    }

    setStatus('paying');
    try {
      const payment = useSaved
        ? await confirmSavedCardPayment({ amountCents, savedCard })
        : await confirmCardPayment({ amountCents, card });
      const tip = await sendTip({ target, amountCents, message: message.trim(), anonymous, payment });
      if (!useSaved && rememberCard) saveCard(payment);
      setSentTip({ ...tip, last4: payment.last4, brand: payment.brand });
      setStatus('done');
    } catch (err) {
      setPayError(err?.response?.data?.error || err?.message || "That tip didn't go through. Try again.");
      setStatus('idle');
    }
  };

  const handleForgetCard = async () => {
    await forgetSavedCard();
    setSavedCard(null);
    setUseSaved(false);
  };

  const brand = detectBrand(card.number);
  const tipperName = user?.display_name || user?.username || 'you';

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 1300, backgroundColor: "rgba(0,0,0,0.55)",
      animation: closing ? `tipFadeOut ${CLOSE_MS}ms ease forwards` : "tipFadeIn 0.2s ease",
    }}>
      <style>{`
        @keyframes tipSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes tipSheetDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
        @keyframes tipFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tipFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes tipSpin { to { transform: rotate(360deg); } }
        @keyframes tipPop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); } }
        @keyframes tipRing { from { transform: scale(0.8); opacity: 0.7; } to { transform: scale(1.9); opacity: 0; } }
        .tip-input::placeholder { color: #5a5a5a; }
      `}</style>
      <div onClick={close} style={{ position: "absolute", inset: 0 }} />

      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "92%",
        backgroundColor: colors.bg, borderRadius: "24px 24px 0 0",
        boxShadow: "0 -12px 40px rgba(0,0,0,0.6)",
        animation: closing
          ? `tipSheetDown ${CLOSE_MS}ms cubic-bezier(0.4, 0, 1, 1) forwards`
          : "tipSheetUp 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${colors.border}`, flexShrink: 0,
        }}>
          <div style={{ width: "26px" }} />
          <div style={{ fontSize: "14px", fontWeight: 600, color: colors.text, fontFamily: kanit, display: "flex", alignItems: "center", gap: "6px" }}>
            <TipHeartIcon size={15} /> Send a Tip
          </div>
          <button onClick={close} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", width: "26px", justifyContent: "flex-end" }}>
            <XIcon />
          </button>
        </div>

        {status === 'done' ? (
          <SuccessView tip={sentTip} recipientName={recipientName} label={label} anonymous={anonymous} onDone={close} />
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px 20px" }}>

            {/* Who gets it */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", backgroundColor: colors.bgCard, borderRadius: "14px", padding: "12px" }}>
              <RecipientAvatar
                name={recipientName || label}
                imageUrl={target.coverUrl || recipient?.avatarUrl}
                rounded={!target.coverUrl}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "15px", fontWeight: 600, color: colors.text, fontFamily: kanit, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {recipientName ? `Tip ${recipientName}` : 'Loading...'}
                </div>
                <div style={{ fontSize: "12px", color: colors.textSecondary, fontFamily: kanit, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  for {targetKindFor(target) === 'track' ? '' : `the ${targetKindFor(target)} `}{label}
                </div>
              </div>
            </div>
            {recipient && !recipient.onPonytail && (
              <div style={{ fontSize: "11.5px", color: colors.textSecondary, fontFamily: kanit, lineHeight: 1.4, marginTop: "8px", padding: "0 4px" }}>
                {recipientName} isn't on Ponytail yet. We'll hold your tip for them until they join.
              </div>
            )}
            {(recipientError || recipient?.isYou) && (
              <div style={{ fontSize: "12px", color: colors.danger, fontFamily: kanit, marginTop: "8px", padding: "0 4px" }}>
                {recipientError || `This is your own ${targetKindFor(target)}, so you can't tip it.`}
              </div>
            )}

            {/* Amount */}
            <div style={{ marginTop: "20px" }}>
              <Label>Amount</Label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
                {[...PRESETS, 'custom'].map((p) => {
                  const active = preset === p;
                  return (
                    <button
                      key={p}
                      onClick={() => { setPreset(p); setPayError(null); }}
                      style={{
                        padding: "10px 0", borderRadius: "20px", cursor: "pointer",
                        border: `1.5px solid ${active ? colors.teal : colors.borderInput}`,
                        backgroundColor: active ? colors.tealGlow : "transparent",
                        color: active ? colors.teal : colors.text,
                        fontSize: p === 'custom' ? "12px" : "14px", fontWeight: 600, fontFamily: kanit,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {p === 'custom' ? 'Other' : `$${p / 100}`}
                    </button>
                  );
                })}
              </div>
              {preset === 'custom' && (
                <div style={{ position: "relative", marginTop: "10px" }}>
                  <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: colors.textSecondary, fontSize: "16px", fontFamily: kanit }}>$</div>
                  <input
                    className="tip-input"
                    autoFocus
                    inputMode="decimal"
                    placeholder="Any amount from $1 to $500"
                    value={customAmount}
                    onChange={(e) => { setPayError(null); setCustomAmount(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').replace(/(\.\d{2})\d+/, '$1')); }}
                    style={{ ...fieldStyle(customAmount && !amountValid), paddingLeft: "26px", fontSize: "16px" }}
                  />
                  {customAmount && !amountValid && (
                    <div style={{ fontSize: "11.5px", color: colors.danger, fontFamily: kanit, marginTop: "6px" }}>
                      Tips can be from $1 to $500.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Note */}
            <div style={{ marginTop: "20px" }}>
              <Label right={<div style={{ fontSize: "11px", color: colors.muted, fontFamily: kanit }}>{message.length}/{MAX_MESSAGE}</div>}>
                Note (optional)
              </Label>
              <textarea
                className="tip-input"
                rows={2}
                maxLength={MAX_MESSAGE}
                placeholder={recipientName ? `Say something to ${recipientName}` : 'Say something nice'}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ ...fieldStyle(false), resize: "none", lineHeight: 1.4 }}
              />
            </div>

            {/* Show name or anonymous */}
            <div style={{ marginTop: "20px" }}>
              <Label>Send as</Label>
              <div style={{ display: "flex", backgroundColor: colors.bgInput, borderRadius: "12px", padding: "4px", border: `1px solid ${colors.borderInput}` }}>
                {[{ value: false, text: tipperName }, { value: true, text: 'Anonymous' }].map((opt) => {
                  const active = anonymous === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      onClick={() => setAnonymous(opt.value)}
                      style={{
                        flex: 1, padding: "9px 8px", borderRadius: "9px", border: "none", cursor: "pointer",
                        backgroundColor: active ? colors.bgCard : "transparent",
                        boxShadow: active ? "0 1px 4px rgba(0,0,0,0.4)" : "none",
                        color: active ? colors.teal : colors.textSecondary,
                        fontSize: "13px", fontWeight: 600, fontFamily: kanit,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {opt.text}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: "11.5px", color: colors.muted, fontFamily: kanit, marginTop: "6px", padding: "0 4px" }}>
                {anonymous
                  ? `${recipientName || 'They'} will see the tip, but not who sent it.`
                  : `${recipientName || 'They'} will see your name with the tip. Only they can see it.`}
              </div>
            </div>

            {/* Payment */}
            <div style={{ marginTop: "20px" }}>
              <Label right={
                <div style={{
                  fontSize: "9.5px", fontWeight: 700, color: colors.testMode, fontFamily: kanit,
                  border: `1px solid ${colors.testMode}`, borderRadius: "4px", padding: "1px 6px", letterSpacing: "0.6px",
                }}>
                  TEST MODE
                </div>
              }>
                Payment
              </Label>

              {useSaved && savedCard ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: colors.bgInput, border: `1px solid ${colors.borderInput}`, borderRadius: "10px", padding: "12px" }}>
                  <BrandBadge brand={savedCard.brand} />
                  <div style={{ flex: 1, fontSize: "14px", color: colors.text, fontFamily: kanit, letterSpacing: "0.5px" }}>
                    •••• {savedCard.last4}
                    {savedCard.exp && <span style={{ fontSize: "12px", color: colors.muted, marginLeft: "8px", letterSpacing: 0 }}>exp {savedCard.exp.replace(/\s/g, '')}</span>}
                  </div>
                  <button onClick={() => setUseSaved(false)} style={{ background: "none", border: "none", color: colors.teal, fontSize: "12px", fontFamily: kanit, cursor: "pointer", padding: 0 }}>
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ position: "relative" }}>
                    <input
                      className="tip-input"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="Card number"
                      value={card.number}
                      onChange={(e) => updateCard('number', e.target.value)}
                      style={{ ...fieldStyle(cardErrors.number), paddingRight: "58px", letterSpacing: "0.5px" }}
                    />
                    <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
                      <BrandBadge brand={brand} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "8px", marginTop: "8px" }}>
                    <input className="tip-input" inputMode="numeric" autoComplete="off" placeholder="MM / YY" value={card.exp} onChange={(e) => updateCard('exp', e.target.value)} style={fieldStyle(cardErrors.exp)} />
                    <input className="tip-input" inputMode="numeric" autoComplete="off" placeholder="CVC" value={card.cvc} onChange={(e) => updateCard('cvc', e.target.value)} style={fieldStyle(cardErrors.cvc)} />
                    <input className="tip-input" inputMode="numeric" autoComplete="off" placeholder="ZIP" value={card.zip} onChange={(e) => updateCard('zip', e.target.value)} style={fieldStyle(cardErrors.zip)} />
                  </div>
                  {Object.values(cardErrors).find(Boolean) && (
                    <div style={{ fontSize: "11.5px", color: colors.danger, fontFamily: kanit, marginTop: "6px" }}>
                      {Object.values(cardErrors).find(Boolean)}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: colors.textSecondary, fontFamily: kanit, cursor: "pointer" }}>
                      <input type="checkbox" checked={rememberCard} onChange={(e) => setRememberCard(e.target.checked)} style={{ accentColor: colors.teal }} />
                      Save card for next time
                    </label>
                    <button onClick={fillTestCard} style={{ background: "none", border: "none", color: colors.testMode, fontSize: "12px", fontFamily: kanit, cursor: "pointer", padding: 0 }}>
                      Use test card
                    </button>
                  </div>
                  {savedCard && (
                    <div style={{ display: "flex", gap: "14px", marginTop: "8px" }}>
                      <button onClick={() => setUseSaved(true)} style={{ background: "none", border: "none", color: colors.teal, fontSize: "12px", fontFamily: kanit, cursor: "pointer", padding: 0 }}>
                        Use saved card •••• {savedCard.last4}
                      </button>
                      <button onClick={handleForgetCard} style={{ background: "none", border: "none", color: colors.muted, fontSize: "12px", fontFamily: kanit, cursor: "pointer", padding: 0 }}>
                        Remove it
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* What the artist gets */}
            {amountValid && recipientName && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: colors.textSecondary, fontFamily: kanit, marginTop: "18px", padding: "0 2px" }}>
                <span>{recipientName} gets</span>
                <span>{formatCents(amountCents - feeCents)} <span style={{ color: colors.muted }}>after {formatCents(feeCents)} card fee</span></span>
              </div>
            )}

            {payError && (
              <div style={{ fontSize: "12.5px", color: colors.danger, fontFamily: kanit, marginTop: "12px", textAlign: "center", lineHeight: 1.4 }}>
                {payError}
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={!canPay}
              style={{
                width: "100%", marginTop: "14px", padding: "14px", borderRadius: "12px", border: "none",
                backgroundColor: canPay || status === 'paying' ? colors.teal : "#3a3a3a",
                color: canPay || status === 'paying' ? "#102a26" : colors.muted,
                fontSize: "15px", fontWeight: 600, fontFamily: kanit,
                cursor: canPay ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}
            >
              {status === 'paying'
                ? (<><Spinner /> Processing...</>)
                : amountValid ? `Tip ${formatCents(amountCents)}` : 'Tip'}
            </button>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", marginTop: "10px", fontSize: "11px", color: colors.muted, fontFamily: kanit }}>
              <LockIcon /> Secure checkout · Demo only, no real charge
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SuccessView({ tip, recipientName, label, anonymous, onDone }) {
  return (
    <div style={{ padding: "34px 24px 26px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ position: "relative", width: 84, height: 84, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${colors.teal}`, animation: "tipRing 1.1s ease-out 0.15s forwards", opacity: 0 }} />
        <div style={{
          width: 84, height: 84, borderRadius: "50%", backgroundColor: colors.tealGlow,
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "tipPop 0.5s cubic-bezier(0.32, 0.72, 0, 1) forwards",
        }}>
          <TipHeartIcon size={42} strokeWidth={1.6} />
        </div>
      </div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: colors.text, fontFamily: kanit, marginTop: "18px" }}>
        Tip sent!
      </div>
      <div style={{ fontSize: "15px", color: colors.textSecondary, fontFamily: kanit, marginTop: "6px", lineHeight: 1.4 }}>
        You sent <span style={{ color: colors.teal, fontWeight: 600 }}>{formatCents(tip?.amountCents || 0)}</span> to {recipientName}
        <br />for {label}
      </div>
      <div style={{ fontSize: "12px", color: colors.muted, fontFamily: kanit, marginTop: "14px", lineHeight: 1.5 }}>
        {anonymous ? 'Sent anonymously. ' : ''}
        {tip?.onPonytail === false ? `We're holding it until ${recipientName} joins Ponytail.` : `${recipientName} can see it in their Profile.`}
        {tip?.last4 && <><br />Charged to •••• {tip.last4} (test mode)</>}
      </div>
      <button
        onClick={onDone}
        style={{
          width: "100%", marginTop: "26px", padding: "14px", borderRadius: "12px", border: "none",
          backgroundColor: colors.teal, color: "#102a26", fontSize: "15px", fontWeight: 600, fontFamily: kanit, cursor: "pointer",
        }}
      >
        Done
      </button>
    </div>
  );
}
