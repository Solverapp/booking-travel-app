import defaultdates from "./defaultdates";
import { getStoredCurrency } from "./currency";

// URL-хелперы поиска перелётов: /flights?... — единственный источник истины

const CABIN_VALUES = ["economy", "business", "first"];

// Слоты времени для фильтров результатов (используются в UI и фильтрации)
export const FLIGHT_TIME_SLOTS = [
  { id: "early", label: "Before 06:00", from: 0, to: 6 },
  { id: "morning", label: "06:00 – 12:00", from: 6, to: 12 },
  { id: "afternoon", label: "12:00 – 18:00", from: 12, to: 18 },
  { id: "evening", label: "After 18:00", from: 18, to: 24 },
];

export const normalizeCabin = (value) =>
  CABIN_VALUES.includes(value) ? value : "all";

export const parseFlightsParams = (searchParams) => {
  const num = (key, fallback, min) => {
    const value = parseInt(searchParams.get(key), 10);
    if (Number.isNaN(value)) return fallback;
    return Math.max(min, value);
  };

  return {
    origin: searchParams.get("origin") || "",
    destination: searchParams.get("destination") || "",
    originLabel: searchParams.get("originLabel") || "",
    destinationLabel: searchParams.get("destinationLabel") || "",
    trip: searchParams.get("trip") === "oneway" ? "oneway" : "round",
    depart: searchParams.get("depart") || "",
    returnDate: searchParams.get("return") || "",
    adults: num("adults", 1, 1),
    children: num("children", 0, 0),
    infants: num("infants", 0, 0),
    cabin: normalizeCabin(searchParams.get("cabin")),
  };
};

export const parseDateParam = (value) => {
  if (!value) return null;
  const [y, m, d] = String(value).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

export const formatDateParam = (date) => {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const buildFlightsParams = ({ origin, destination, tripType, depart, returnDate, guests, cabin }) => {
  const params = new URLSearchParams();
  params.set("origin", origin?.iata || "");
  params.set("destination", destination?.iata || "");
  const originLabel = origin?.city || origin?.name;
  const destinationLabel = destination?.city || destination?.name;
  if (originLabel) params.set("originLabel", originLabel);
  if (destinationLabel) params.set("destinationLabel", destinationLabel);
  params.set("trip", tripType === "oneway" ? "oneway" : "round");
  if (depart) params.set("depart", depart);
  if (tripType !== "oneway" && returnDate) params.set("return", returnDate);
  params.set("adults", String(guests?.adults || 1));
  params.set("children", String(guests?.children || 0));
  params.set("infants", String(guests?.infants || 0));
  params.set("cabin", normalizeCabin(cabin));
  return params;
};

// Стартовые значения формы (панель Modify на /flights) из URL
export const flightFormInitial = (params) => ({
  origin: params.origin
    ? { iata: params.origin, city: params.originLabel, name: params.originLabel }
    : null,
  destination: params.destination
    ? { iata: params.destination, city: params.destinationLabel, name: params.destinationLabel }
    : null,
  tripType: params.trip,
  depart: parseDateParam(params.depart),
  returnDate: parseDateParam(params.returnDate),
  guests: { adults: params.adults, children: params.children, infants: params.infants },
  cabin: params.cabin,
});

// Даты для отправки: если пользователь не выбрал — дефолты проекта
export const resolveSearchDates = ({ tripType, depart, returnDate }) => {
  const isRound = tripType !== "oneway";
  return {
    depart: depart ? formatDateParam(depart) : defaultdates.tomorrow,
    returnDate: isRound
      ? returnDate
        ? formatDateParam(returnDate)
        : defaultdates.dayAfterTomorrow
      : "",
  };
};

// Тело запроса POST /flights/rates из URL-параметров
export const buildRatesRequest = (params, { currency } = {}) => {
  const legs = [
    {
      origin: params.origin,
      destination: params.destination,
      date: params.depart,
      direction: "OUTBOUND",
    },
  ];

  if (params.trip === "round" && params.returnDate) {
    legs.push({
      origin: params.destination,
      destination: params.origin,
      date: params.returnDate,
      direction: "INBOUND",
    });
  }

  // currency — из настроек профиля (fallback AED), country — sandbox аккаунт AE
  const request = {
    legs,
    adults: Math.max(1, params.adults || 1),
    currency: currency || getStoredCurrency(),
    country: "AE",
  };
  if (params.children > 0) request.children = params.children;
  if (params.infants > 0) request.infants = params.infants;
  if (params.cabin === "economy") request.cabinClass = "ECONOMY";
  if (params.cabin === "business") request.cabinClass = "BUSINESS";
  if (params.cabin === "first") request.cabinClass = "FIRST";
  return request;
};
