const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const countsFromSearch = (searchParams) => ({
  adults: Math.max(1, toNumber(searchParams?.adults) ?? 1),
  children: Math.max(0, toNumber(searchParams?.children) ?? 0),
  infants: Math.max(0, toNumber(searchParams?.infants) ?? 0),
});

export const passengerCountLabel = (counts) => {
  const parts = [];
  if (counts.adults) {
    parts.push(`${counts.adults} adult${counts.adults === 1 ? "" : "s"}`);
  }
  if (counts.children) {
    parts.push(`${counts.children} child${counts.children === 1 ? "" : "ren"}`);
  }
  if (counts.infants) {
    parts.push(`${counts.infants} infant${counts.infants === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
};

export const buildPriceBreakdown = ({
  journey,
  breakdown,
  counts,
  currency,
} = {}) => {
  const stored = breakdown ?? {};
  const display = journey?.pricing?.display ?? {};
  const perPassenger = display?.perPassenger ?? {};
  const adults = Math.max(1, toNumber(counts?.adults) ?? 1);
  const children = Math.max(0, toNumber(counts?.children) ?? 0);
  const infants = Math.max(0, toNumber(counts?.infants) ?? 0);

  const computedBase =
    (toNumber(perPassenger?.adult?.base) ?? 0) * adults +
    (toNumber(perPassenger?.child?.base) ?? 0) * children +
    (toNumber(perPassenger?.infant?.base) ?? 0) * infants;
  const computedTaxes =
    (toNumber(perPassenger?.adult?.taxes) ?? 0) * adults +
    (toNumber(perPassenger?.child?.taxes) ?? 0) * children +
    (toNumber(perPassenger?.infant?.taxes) ?? 0) * infants;
  const base = toNumber(stored.base) ?? computedBase;
  const taxes = toNumber(stored.taxes) ?? computedTaxes;

  const subtotal =
    toNumber(stored.subtotal) ??
    toNumber(display?.total) ??
    toNumber(stored.total) ??
    0;
  const seats = toNumber(stored.seats) ?? 0;
  const baggage = toNumber(stored.baggage) ?? 0;
  const total = toNumber(stored.total) ?? subtotal + seats + baggage;
  const hasSplit =
    stored.hasSplit === true ||
    (base > 0 && base + taxes <= subtotal + 0.01);
  const serviceFee = hasSplit
    ? toNumber(stored.serviceFee) ?? Math.max(0, subtotal - base - taxes)
    : 0;

  return {
    currency:
      stored.currency ?? currency ?? display?.currency ?? "AED",
    base: hasSplit ? base : null,
    taxes: hasSplit ? taxes : null,
    serviceFee,
    subtotal,
    seats,
    baggage,
    total,
    hasSplit,
  };
};
