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

  const adultText = `${adults} ${adults === 1 ? "adult" : "adults"}`;
  const childText =
    children > 0
      ? `, ${children} ${children === 1 ? "child" : "children"}`
      : ", no children";
  const infantText =
    infants > 0 ? `, ${infants} ${infants === 1 ? "infant" : "infants"}` : "";

  return adultText + childText + infantText;
};
