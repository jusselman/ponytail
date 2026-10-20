import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Mock payments ────────────────────────────────────────────────────────────
// Ponytail will take payments through Stripe. For the demo nothing is charged:
// this file walks through the same steps a Stripe checkout does (check the
// card, confirm the payment, get back a payment id) and behaves like Stripe's
// test mode, so only Stripe's published test cards are accepted.
//
//   4242 4242 4242 4242   succeeds
//   4000 0000 0000 0002   declined
//   4000 0000 0000 9995   declined, insufficient funds
//
// Swapping in real Stripe later means replacing confirmCardPayment with
// @stripe/stripe-js (web) or @stripe/stripe-react-native, with the backend
// creating the PaymentIntent. The rest of the app only sees the
// { ref, brand, last4 } this returns, so it does not need to change.
//
// The full card number never leaves this file. Only the brand and last four
// digits are sent to our server or saved on the device, the same as Stripe.
// ─────────────────────────────────────────────────────────────────────────────

export const TEST_CARD = { number: '4242 4242 4242 4242', exp: '12 / 34', cvc: '123', zip: '94110' };

const TEST_CARD_RESULTS = {
  '4242424242424242': null,
  '4000056655665556': null, // Visa debit
  '5555555555554444': null, // Mastercard
  '378282246310005': null,  // Amex
  '4000000000000002': 'Your card was declined.',
  '4000000000009995': 'Your card has insufficient funds.',
};

const SAVED_CARD_KEY = 'ponytail_saved_card';

export const digitsOnly = (s) => String(s || '').replace(/\D/g, '');

export const detectBrand = (number) => {
  const n = digitsOnly(number);
  if (/^4/.test(n)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^6(011|5)/.test(n)) return 'discover';
  return 'unknown';
};

export const BRAND_LABELS = { visa: 'VISA', mastercard: 'Mastercard', amex: 'AMEX', discover: 'Discover', unknown: 'Card' };

// "4242424242424242" -> "4242 4242 4242 4242" (Amex groups 4-6-5)
export const formatCardNumber = (value) => {
  const n = digitsOnly(value);
  if (detectBrand(n) === 'amex') {
    const d = n.slice(0, 15);
    return [d.slice(0, 4), d.slice(4, 10), d.slice(10)].filter(Boolean).join(' ');
  }
  return n.slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
};

export const formatExpiry = (value) => {
  const n = digitsOnly(value).slice(0, 4);
  return n.length > 2 ? `${n.slice(0, 2)} / ${n.slice(2)}` : n;
};

const luhn = (n) => {
  let sum = 0;
  for (let i = 0; i < n.length; i += 1) {
    let d = Number(n[n.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return n.length >= 13 && sum % 10 === 0;
};

// Returns { number, exp, cvc, zip } with a message for each field that's wrong
export const validateCard = ({ number, exp, cvc, zip }) => {
  const errors = {};
  const n = digitsOnly(number);
  const brand = detectBrand(n);
  if (!luhn(n)) errors.number = 'Your card number is incomplete.';

  const e = digitsOnly(exp);
  const month = Number(e.slice(0, 2));
  const year = 2000 + Number(e.slice(2, 4));
  const now = new Date();
  if (e.length !== 4 || month < 1 || month > 12) errors.exp = "Your card's expiration date is incomplete.";
  else if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) errors.exp = "Your card's expiration date is in the past.";

  const c = digitsOnly(cvc);
  if (c.length !== (brand === 'amex' ? 4 : 3)) errors.cvc = "Your card's security code is incomplete.";

  if (digitsOnly(zip).length !== 5) errors.zip = 'Your ZIP is incomplete.';
  return errors;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mockPaymentRef = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 24; i += 1) id += chars[Math.floor(Math.random() * chars.length)];
  return `pi_mock_${id}`;
};

export class PaymentError extends Error {}

// Confirm a payment with a newly entered card. Resolves { ref, brand, last4 };
// rejects with a PaymentError holding a message to show the person.
export const confirmCardPayment = async ({ amountCents, card }) => {
  const errors = validateCard(card);
  if (Object.keys(errors).length) throw new PaymentError(Object.values(errors)[0]);
  if (!Number.isInteger(amountCents) || amountCents < 100) throw new PaymentError('Tips start at $1.');

  const n = digitsOnly(card.number);
  await wait(1300); // the round trip to Stripe
  if (!(n in TEST_CARD_RESULTS)) {
    throw new PaymentError('Demo mode only takes test cards. Use 4242 4242 4242 4242.');
  }
  if (TEST_CARD_RESULTS[n]) throw new PaymentError(TEST_CARD_RESULTS[n]);

  return { ref: mockPaymentRef(), brand: detectBrand(n), last4: n.slice(-4), exp: card.exp };
};

// Pay again with the card saved on this device
export const confirmSavedCardPayment = async ({ amountCents, savedCard }) => {
  if (!savedCard?.last4) throw new PaymentError('Add a card to pay.');
  if (!Number.isInteger(amountCents) || amountCents < 100) throw new PaymentError('Tips start at $1.');
  await wait(1000);
  return { ref: mockPaymentRef(), brand: savedCard.brand, last4: savedCard.last4 };
};

// Saved card: just the brand, last four and expiry, like a Stripe saved card
export const getSavedCard = async () => {
  try {
    const raw = await AsyncStorage.getItem(SAVED_CARD_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveCard = async ({ brand, last4, exp }) => {
  try {
    await AsyncStorage.setItem(SAVED_CARD_KEY, JSON.stringify({ brand, last4, exp }));
  } catch {
    // Not saving the card is fine, they'll just type it again next time
  }
};

export const forgetSavedCard = async () => {
  try { await AsyncStorage.removeItem(SAVED_CARD_KEY); } catch { /* ignore */ }
};

// Stripe's standard US pricing, 2.9% + 30c. Kept in sync with feeFor in
// backend/src/controllers/tipController.js.
export const cardFeeCents = (cents) => Math.round(cents * 0.029) + 30;

export const formatCents = (cents) => `$${(cents / 100).toFixed(2)}`;
