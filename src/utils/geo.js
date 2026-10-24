const EARTH_RADIUS_KM = 6371;

const toRadians = (value) => (value * Math.PI) / 180;

export const isValidCoords = (coords) => {
  if (!coords) return false;
  const lat = Number(coords.lat);
  const lng = Number(coords.lng);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

export const haversineKm = (from, to) => {
  if (!isValidCoords(from) || !isValidCoords(to)) return null;

  const lat1 = toRadians(Number(from.lat));
  const lat2 = toRadians(Number(to.lat));
  const deltaLat = toRadians(Number(to.lat) - Number(from.lat));
  const deltaLng = toRadians(Number(to.lng) - Number(from.lng));

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const sortByDistance = (origin, items, { limit, maxKm } = {}) => {
  if (!isValidCoords(origin) || !Array.isArray(items)) return [];

  const withDistance = items
    .map((item) => {
      const distanceKm = haversineKm(origin, item);
      return distanceKm == null ? null : { ...item, distanceKm };
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const filtered =
    Number.isFinite(maxKm) && maxKm > 0
      ? withDistance.filter((item) => item.distanceKm <= maxKm)
      : withDistance;

  return Number.isFinite(limit) && limit > 0 ? filtered.slice(0, limit) : filtered;
};

export const nearestItems = (origin, items, options) =>
  sortByDistance(origin, items, options);
