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

export const formatMoney = (value, currency, digits = 2) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  const amount = formatNumber(num, digits);
  return currency ? `${amount} ${currency}` : amount;
};

export const formatPolicyDeadline = (dateTime, timezone) => {
  if (!dateTime) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(dateTime));
  const date = match
    ? new Date(Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5]))
    : new Date(dateTime);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  return `${day}, ${time}${timezone ? ` ${timezone}` : ""}`;
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
  return tag === "RFN" ? "Refundable" : "Non refund";
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

const sumTaxesByCurrency = (fees) => {
  const totals = new Map();
  fees.forEach((fee) => {
    const amount = Number(fee?.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const currency = fee?.currency || "";
    totals.set(currency, (totals.get(currency) || 0) + amount);
  });
  return [...totals.entries()].map(([currency, amount]) => ({ amount, currency }));
};

export const taxesAndFeesBreakdown = (input) => {
  const fees = Array.isArray(input)
    ? input
    : Array.isArray(input?.retailRate?.taxesAndFees)
      ? input.retailRate.taxesAndFees
      : [];
  const included = fees.filter((fee) => fee?.included === true);
  const excluded = fees.filter((fee) => fee?.included === false);
  return {
    included,
    excluded,
    includedTotals: sumTaxesByCurrency(included),
    excludedTotals: sumTaxesByCurrency(excluded),
  };
};

export const formatTaxTotals = (totals) =>
  (Array.isArray(totals) ? totals : [])
    .map((total) => formatMoney(total.amount, total.currency))
    .filter(Boolean)
    .join(" + ");

export const excludedTaxItems = (input) => {
  const { excluded } = taxesAndFeesBreakdown(input);
  const grouped = new Map();

  excluded.forEach((fee) => {
    const amount = Number(fee?.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const description =
      String(fee?.description || "").trim() || "Taxes and fees";
    const currency = fee?.currency || "";
    const key = `${description.toLowerCase()}|${currency}`;
    const current = grouped.get(key);

    if (current) {
      current.amount += amount;
    } else {
      grouped.set(key, { description, amount, currency });
    }
  });

  return [...grouped.values()];
};

export const formatTaxDescriptions = (items) => {
  const seen = new Set();

  return (Array.isArray(items) ? items : [])
    .map((item) => String(item?.description || "").trim())
    .filter((description) => {
      const key = description.toLowerCase();
      if (!description || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(", ");
};

export const rateCancelPolicies = (rate) => {
  const policies = rate?.cancellationPolicies?.cancelPolicyInfos;
  if (!Array.isArray(policies)) return [];
  return policies
    .filter(Boolean)
    .map((policy) => ({
      cancelTime: policy.cancelTime || "",
      amount: Number(policy.amount) || 0,
      currency: policy.currency || "",
      timezone: policy.timezone || "",
    }));
};

export const ratePerks = (rate) =>
  Array.isArray(rate?.perks) ? rate.perks.filter(Boolean) : [];

export const taxesAndFeesSummary = (rate) => {
  const { excludedTotals } = taxesAndFeesBreakdown(rate);
  if (!excludedTotals.length) return null;
  const total = excludedTotals[0];
  const items = excludedTaxItems(rate);
  return {
    amount: total.amount,
    currency: total.currency || rate?.retailRate?.total?.[0]?.currency || "",
    items,
    descriptions: formatTaxDescriptions(items),
  };
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
