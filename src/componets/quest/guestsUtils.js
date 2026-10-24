import { cabinLabel } from "../../utils/flightFormatters";

export const MAX_GUESTS = 10;

export const parseChildrenAges = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((age) => parseInt(age, 10))
      .filter((age) => !Number.isNaN(age));
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((age) => parseInt(age, 10))
      .filter((age) => !Number.isNaN(age));
  }

  return [];
};

export const normalizeHotelGuests = (value) => ({
  adults: value?.adults || 1,
  children: value?.children || 0,
  childrenAges: parseChildrenAges(value?.childrenAges),
});

export const normalizeTourGuests = (value) => ({
  adults: value?.adults || 1,
  children: value?.children || 0,
  infants: value?.infants || 0,
});

export const guestsDisplayText = (value) => {
  const adults = value?.adults || 1;
  const children = value?.children || 0;
  const infants = value?.infants || 0;
  const total = adults + children + infants;

  const guestText = `${total} ${total === 1 ? "guest" : "guests"}`;
  const childText =
    children > 0
      ? `, ${children} ${children === 1 ? "child" : "children"}`
      : ", no children";
  const infantText =
    infants > 0 ? `, ${infants} ${infants === 1 ? "infant" : "infants"}` : "";

  return guestText + childText + infantText;
};

export const hotelGuestsDisplayText = (value) => guestsDisplayText(value);

export const flightGuestsDisplayText = (value, cabin = "all") => {
  const total =
    (value?.adults || 1) + (value?.children || 0) + (value?.infants || 0);
  return `${total} ${total === 1 ? "passenger" : "passengers"}, ${cabinLabel(cabin)}`;
};
