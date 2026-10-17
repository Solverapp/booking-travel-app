// Общие хелперы journey/segment для Flights UI (результаты + страницы бронирования)

// Самый дешёвый оффер journey (в списке у каждого рейса свой набор тарифов)
export const journeyOffer = (journey) => {
  const offers = Array.isArray(journey?.offers) ? journey.offers : [];
  if (offers.length === 0) return null;
  return offers.reduce((best, offer) => {
    const price = Number(offer?.pricing?.display?.total ?? Infinity);
    const bestPrice = Number(best?.pricing?.display?.total ?? Infinity);
    return price < bestPrice ? offer : best;
  }, offers[0]);
};

export const journeyPrice = (offer) => Number(offer?.pricing?.display?.total ?? 0);

export const durationMinutes = (journey) => {
  const candidates = [journey?.totalDuration, journey?.legDurations?.[0]];
  for (const candidate of candidates) {
    const minutes = typeof candidate === "number" ? candidate : candidate?.minutes;
    if (Number.isFinite(minutes)) return Number(minutes);
  }
  return null;
};

export const minutesBetween = (from, to) => {
  const t1 = Date.parse(from);
  const t2 = Date.parse(to);
  if (Number.isNaN(t1) || Number.isNaN(t2)) return null;
  return Math.round((t2 - t1) / 60000);
};

// +1/+2 при прибытии на следующий день (считаем по календарным датам)
export const dayOffset = (fromIso, toIso) => {
  if (!fromIso || !toIso) return 0;
  const from = Date.parse(fromIso.slice(0, 10));
  const to = Date.parse(toIso.slice(0, 10));
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.round((to - from) / 86400000));
};

// Сегменты одного направления (для round-trip — две «ноги»)
export const legsOf = (journey) => {
  const segments = Array.isArray(journey?.segments) ? journey.segments : [];
  const outbound = segments.filter((s) => s?.direction !== "INBOUND");
  const inbound = segments.filter((s) => s?.direction === "INBOUND");
  if (outbound.length === 0 && inbound.length === 0) return [];
  return [outbound, inbound].filter((leg) => leg.length > 0);
};

export const carriersOf = (segments) => {
  const map = new Map();
  segments.forEach((segment) => {
    const code = segment?.carrier?.marketingCode ?? segment?.carrier?.marketingName;
    if (code && !map.has(code)) {
      map.set(code, {
        code,
        name: segment?.carrier?.marketingName ?? segment?.carrier?.marketingCode ?? "",
        logo: segment?.carrier?.marketingLogo ?? null,
      });
    }
  });
  return Array.from(map.values()).slice(0, 3);
};

export const segmentFlightLabel = (segment) => {
  const name = segment?.carrier?.marketingName ?? "";
  const code = segment?.carrier?.marketingCode ?? "";
  const number = segment?.flight?.marketingNumber ?? "";
  const codeNumber = `${code}${number ? ` ${number}` : ""}`.trim();
  return [name, codeNumber].filter(Boolean).join(" · ");
};
