import {
  NATIONALITY_SUGGESTIONS,
  PHONE_CODES,
  buildMobileNumber,
  normalizePhoneDigits,
} from "./countries";

export {
  NATIONALITY_SUGGESTIONS,
  PHONE_CODES,
  buildMobileNumber,
  normalizePhoneDigits,
};

const CHECKOUT_STORAGE_KEY = "bigkey.tourCheckout.item";

export const TOUR_PREFIXES = [
  { value: "Mr", label: "Mr." },
  { value: "Ms", label: "Ms." },
  { value: "Mrs", label: "Mrs." },
];

export const TRANSFER_IDS = {
  WITHOUT: 41865,
  SHARING: 41843,
  PRIVATE: 41844,
};

export const TRANSFER_LABELS = {
  without: "Without transfer",
  sharing: "Sharing transfer",
  private: "Private transfer",
  other: "Transfer",
};

export const transferTypeOf = (item = {}) => {
  const id = Number(item.transferId);
  if (id === TRANSFER_IDS.WITHOUT) return "without";
  if (id === TRANSFER_IDS.SHARING) return "sharing";
  if (id === TRANSFER_IDS.PRIVATE) return "private";

  const name = String(item.transferName || item.transferType || "").toLowerCase();
  if (
    name.includes("without") ||
    name.includes("no transfer") ||
    name.includes("без трансфер")
  ) {
    return "without";
  }
  if (
    name.includes("sharing") ||
    name.includes("shared") ||
    name.includes("группов")
  ) {
    return "sharing";
  }
  if (name.includes("private") || name.includes("индивидуаль")) {
    return "private";
  }

  return "other";
};

export const requiresPickup = (transferType) => transferType !== "without";

export const transferLabel = (transferType) =>
  TRANSFER_LABELS[transferType] || TRANSFER_LABELS.other;

export const tourGuestCount = (item = {}) =>
  Math.max(0, Number(item.adult) || 0) +
  Math.max(0, Number(item.child) || 0) +
  Math.max(0, Number(item.infant) || 0);

export const getTourB2cPricing = (item = {}) => {
  const adult = Math.max(0, Number(item.adult) || 0);
  const child = Math.max(0, Number(item.child) || 0);
  const adultUnit =
    Number(item.adultb2c) ||
    Math.round((Number(item.adultb2b) || 0) * 1.15 * 100) / 100;
  const childUnit =
    Number(item.childb2c) ||
    Math.round((Number(item.childb2b) || 0) * 1.15 * 100) / 100;
  const fallbackTotal =
    Math.round((adultUnit * adult + childUnit * child) * 100) / 100;
  const total = Number(item.b2cTotal) || fallbackTotal;

  return {
    adultUnit,
    childUnit,
    adultTotal: Math.round(adultUnit * adult * 100) / 100,
    childTotal: Math.round(childUnit * child * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
};

const aedFormatter = new Intl.NumberFormat("en-AE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatAedAmount = (value) =>
  aedFormatter.format(Number(value) || 0);

export const formatAed = (value) => `AED ${formatAedAmount(value)}`;

export const formatTourTime = (value) => {
  const match = String(value ?? "").match(/(\d{1,2}):(\d{2})/);
  if (!match) return String(value ?? "").trim() || "—";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
};

export const saveTourCheckoutItem = (item) => {
  try {
    window.sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(item));
  } catch (error) {
    console.warn("Failed to persist tour checkout item", error);
  }
};

export const readTourCheckoutItem = () => {
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearTourCheckoutItem = () => {
  try {
    window.sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
  } catch {
    // ignore
  }
};
