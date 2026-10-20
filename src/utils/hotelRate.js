// Хелперы для карточки отеля: рейтинг, условия тарифа, цена

export const MEMBER_SAVE_PERCENT = 10;

export const ratingLabel = (score) => {
  const value = Number(score);
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value >= 9) return "Superb";
  if (value >= 8) return "Excellent";
  if (value >= 7) return "Very good";
  if (value >= 6) return "Good";
  if (value >= 5) return "Pleasant";
  return "Guest rating";
};

export const ratingTone = (score) => {
  const value = Number(score) || 0;
  if (value >= 8) return "green";
  if (value >= 6) return "amber";
  return "red";
};

export const formatScore = (score) => {
  const value = Number(score);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

export const formatNumber = (value, digits = 0) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const BOARD_LABELS = {
  RO: "No meals",
  BB: "Breakfast included",
  HB: "Half board",
  FB: "Full board",
};

export const boardLabel = (boardType, boardName) =>
  BOARD_LABELS[String(boardType || "").toUpperCase()] || boardName || null;

export const mealsIncluded = (boardType, boardName) => {
  const type = String(boardType || "").trim().toUpperCase();
  if (type && type !== "RO") return true;
  if (type === "RO") return false;
  return /breakfast|half board|full board|all inclusive|dinner|lunch/i.test(
    boardName || "",
  );
};

export const cancellationLabel = (rate) => {
  const tag = rate?.cancellationPolicies?.refundableTag;
  if (!tag) return null;
  return tag === "RFN" ? "Free cancellation" : "No free cancellation";
};

const ONLINE_PAYMENT_TYPES = ["NUITEE_PAY", "CREDIT_CARD", "PAY_ONLINE"];
const PROPERTY_PAYMENT_TYPES = [
  "PAY_AT_HOTEL",
  "HOTEL_PAY",
  "PAY_AT_PROPERTY",
  "PROPERTY_PAY",
];

export const paymentLabel = (paymentTypes) => {
  const types = (Array.isArray(paymentTypes) ? paymentTypes : []).map((type) =>
    String(type).toUpperCase(),
  );
  if (types.some((type) => ONLINE_PAYMENT_TYPES.includes(type))) return "Pay online";
  if (types.some((type) => PROPERTY_PAYMENT_TYPES.includes(type))) return "Pay at hotel";
  return null;
};

export const taxesAndFeesSummary = (rate) => {
  const fees = Array.isArray(rate?.retailRate?.taxesAndFees)
    ? rate.retailRate.taxesAndFees
    : [];
  const excluded = fees.filter((fee) => fee?.included === false);
  const amount = excluded.reduce((sum, fee) => sum + (Number(fee?.amount) || 0), 0);
  if (!(amount > 0)) return null;
  const currency =
    excluded[0]?.currency || rate?.retailRate?.total?.[0]?.currency || "";
  return { amount, currency };
};

export const ratePriceInfo = (rate) => {
  const totalEntry = rate?.retailRate?.total?.[0] ?? null;
  const suggestedEntry = rate?.retailRate?.suggestedSellingPrice?.[0] ?? null;
  const amount = Number(totalEntry?.amount);
  const suggested = Number(suggestedEntry?.amount);
  const currency =
    totalEntry?.currency || suggestedEntry?.currency || "";
  return {
    amount: Number.isFinite(amount) ? amount : null,
    suggested:
      Number.isFinite(suggested) && Number.isFinite(amount) && suggested > amount
        ? suggested
        : null,
    currency,
  };
};
