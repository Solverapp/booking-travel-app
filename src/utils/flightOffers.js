const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value ?? "").replace(/,/g, "").trim();
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
};

const slug = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const weightLabel = (weight) => {
  if (!weight) return "";
  if (typeof weight === "object") {
    const value = weight.value ?? weight.amount ?? weight.quantity;
    const unit = weight.unit ?? weight.units ?? "";
    return [value, unit].filter(Boolean).join(" ");
  }
  return String(weight);
};

export const offerDisplay = (offer) => offer?.pricing?.display ?? null;

export const offerPrice = (offer) => toNumber(offerDisplay(offer)?.total);

export const offerCurrency = (offer) => offerDisplay(offer)?.currency ?? "";

export const offerPerAdult = (offer) =>
  toNumber(offerDisplay(offer)?.perPassenger?.adult?.total);

export const offerFareFamily = (offer) => {
  const direct = offer?.fare?.family;
  if (direct) return direct;
  const segmentFare = Array.isArray(offer?.segmentFares)
    ? offer.segmentFares.find((fare) => fare?.fareFamily)
    : null;
  return segmentFare?.fareFamily ?? "Standard";
};

export const offerCabin = (offer) => {
  const segmentFare = Array.isArray(offer?.segmentFares)
    ? offer.segmentFares.find((fare) => fare?.cabin)
    : null;
  return segmentFare?.cabin ?? "";
};

export const offerSeatsRemaining = (offer) => {
  const remaining = toNumber(offer?.seats?.remaining);
  return remaining && remaining > 0 ? remaining : null;
};

export const offerAmenities = (offer) => {
  const segments = Array.isArray(offer?.segmentAmenities)
    ? offer.segmentAmenities
    : [];
  const amenities = new Map();

  segments.forEach((segment) => {
    const items = Array.isArray(segment?.amenities)
      ? segment.amenities
      : segment
        ? [segment]
        : [];

    items.forEach((amenity) => {
      if (!amenity || amenity.available === false) return;
      const category = String(amenity.category ?? "").trim();
      const name = String(amenity.name ?? "").trim();
      if (!category && !name) return;
      const key = `${category.toLowerCase()}|${name.toLowerCase()}`;
      const previous = amenities.get(key);

      if (!previous) {
        amenities.set(key, { ...amenity, category, name });
        return;
      }

      amenities.set(key, {
        ...previous,
        ...amenity,
        category: previous.category || category,
        name: previous.name || name,
        details: previous.details || amenity.details,
        chargeable:
          previous.chargeable === false || amenity.chargeable === false
            ? false
            : amenity.chargeable,
      });
    });
  });

  return Array.from(amenities.values());
};

export const offerIncludedAmenities = (offer) =>
  offerAmenities(offer).filter((amenity) => amenity.chargeable !== true);

const baggageKind = (item) => String(item?.bagType ?? "").toLowerCase();
const BAG_LABELS = {
  personal: "Personal item",
  cabin: "Carry-on bag",
  checked: "Checked bag",
};

const baggageWeightText = (item) => {
  const direct = toNumber(item?.weightKg);
  if (direct !== null) return `${direct} kg`;
  const weight = item?.weight;
  if (typeof weight === "object" && weight) {
    const value = toNumber(weight.value ?? weight.amount ?? weight.quantity);
    if (value !== null) return `${value} ${weight.unit ?? weight.units ?? "kg"}`;
  }
  return weightLabel(weight);
};

const baggageText = (item, kind) => {
  const description =
    typeof item?.description === "string" ? item.description.trim() : "";
  const base = BAG_LABELS[kind] ?? "Bag";
  const pieces = toNumber(item?.pieces);
  const weight = baggageWeightText(item);
  const size = typeof item?.size === "string" ? item.size.trim() : "";
  let text = description || base;

  if (!description && pieces && pieces > 1) {
    text = `${pieces} ${text.toLowerCase()}s`;
  }
  if (weight && !/\d+(?:\.\d+)?\s*kg\b/i.test(text)) {
    text = `${text} · ${weight}`;
  }
  if (size && !text.toLowerCase().includes(size.toLowerCase())) {
    text = `${text} · ${size}`;
  }
  return text;
};

const baggageItems = (offer, kind, source = "included") => {
  const items = Array.isArray(offer?.baggage?.[source])
    ? offer.baggage[source]
    : [];
  const typed = items.filter((item) => baggageKind(item) === kind);
  const primary = typed.filter((item) => {
    const type = String(item?.passengerType ?? "").toUpperCase();
    return !type || type === "ADT" || type === "ALL";
  });
  return primary.length > 0 ? primary : typed;
};

export const offerBaggage = (offer) => {
  const personal = baggageItems(offer, "personal").map((item) =>
    baggageText(item, "personal"),
  );
  const carryOn = baggageItems(offer, "cabin").map((item) =>
    baggageText(item, "cabin"),
  );
  const checked = baggageItems(offer, "checked").map((item) =>
    baggageText(item, "checked"),
  );
  const paid = [].concat(
    baggageItems(offer, "personal", "paid"),
    baggageItems(offer, "cabin", "paid"),
    baggageItems(offer, "checked", "paid"),
  ).map((item) => ({
    kind: baggageKind(item),
    text: baggageText(item, baggageKind(item)),
    price: toNumber(item?.pricing?.display?.amount),
    currency: item?.pricing?.display?.currency ?? "",
  }));

  return {
    personal,
    carryOn,
    checked,
    paid,
    hasPersonal: personal.length > 0,
    hasCarryOn:
      offer?.baggage?.hasCarryOnBag === true || carryOn.length > 0,
    hasChecked:
      offer?.baggage?.hasCheckedBag === true || checked.length > 0,
  };
};

export const offerFlexibility = (offer) => {
  const terms = offer?.terms ?? {};
  const summary = Array.isArray(terms.summary)
    ? terms.summary
    : typeof terms.summary === "string"
      ? [{ message: terms.summary }]
      : [];
  const notes = summary
    .map((item) => item?.message)
    .filter((message) => typeof message === "string" && message.trim())
    .map((message) => message.trim());
  return {
    refundable: terms.refundable === true,
    changeable: terms.changeable === true,
    hasRefundable: typeof terms.refundable === "boolean",
    hasChangeable: typeof terms.changeable === "boolean",
    notes,
  };
};

export const offerSeat = (offer) => {
  const seat = offer?.seats?.seatReservation;
  if (!seat) return null;
  const status = String(seat.status ?? "").toLowerCase();
  const chargeable =
    seat.chargeable === true || status === "chargeable" || status === "paid";
  const included =
    seat.chargeable === false ||
    status === "included" ||
    status === "free";
  const description =
    seat.description ||
    (chargeable
      ? "Seat selection available for a fee"
      : included
        ? "Seat selection included"
        : "Seat selection unavailable");
  return { description, chargeable, included };
};

export const offerGroupKey = (offer) => {
  const baggage = offerBaggage(offer);
  const flexibility = offerFlexibility(offer);
  const seat = offerSeat(offer);
  return [
    slug(offerFareFamily(offer)),
    slug(offerCabin(offer)),
    baggage.personal.join("~").toLowerCase(),
    baggage.carryOn.join("~").toLowerCase(),
    baggage.checked.join("~").toLowerCase(),
    flexibility.hasRefundable
      ? flexibility.refundable
        ? "refundable"
        : "nonrefundable"
      : "refund-unknown",
    flexibility.hasChangeable
      ? flexibility.changeable
        ? "changeable"
        : "fixed"
      : "change-unknown",
    flexibility.notes.join("~").toLowerCase(),
    seat ? (seat.chargeable ? "seat-paid" : "seat-included") : "seat-none",
    offer?.fare?.mixedCabin ? "mixed-cabin" : "",
    offer?.fare?.mixedFareFamily ? "mixed-family" : "",
  ].join("|");
};

export const fareOptions = (journey) => {
  const offers = Array.isArray(journey?.offers)
    ? journey.offers.filter((offer) => offer?.offerId)
    : [];
  const groups = new Map();

  offers.forEach((offer) => {
    const key = offerGroupKey(offer);
    const price = offerPrice(offer);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { offer, count: 1 });
      return;
    }
    existing.count += 1;
    const existingPrice = offerPrice(existing.offer);
    if (
      price !== null &&
      (existingPrice === null || price < existingPrice)
    ) {
      existing.offer = offer;
    }
  });

  return Array.from(groups.values()).sort(
    (a, b) =>
      (offerPrice(a.offer) ?? Number.POSITIVE_INFINITY) -
      (offerPrice(b.offer) ?? Number.POSITIVE_INFINITY),
  );
};

export const cheapestFare = (journey) => fareOptions(journey)[0] ?? null;
