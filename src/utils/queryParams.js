const parseChildrenAges = (value) => {
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

export const normalizeHotelSearch = (searchParams) => {
  const adults = Math.max(1, parseInt(searchParams.get("adults") || "2", 10) || 2);
  const children = Math.max(0, parseInt(searchParams.get("children") || "0", 10) || 0);
  const parsedAges = parseChildrenAges(searchParams.get("childrenAges"));
  const childrenAges =
    children > 0
      ? parsedAges.length === children
        ? parsedAges
        : Array.from({ length: children }, (_, index) => parsedAges[index] ?? 5)
      : [];

  return {
    city: searchParams.get("city") || "",
    placeId: searchParams.get("pleaseId") || searchParams.get("placeId") || "",
    checkIn: searchParams.get("checkIn") || "",
    checkOut: searchParams.get("checkOut") || "",
    adults,
    children,
    childrenAges,
  };
};

export const normalizeHotelFilters = (filters = {}) => {
  const sortNumbers = (values) =>
    (Array.isArray(values) ? values : [])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);

  const sortStrings = (values) =>
    (Array.isArray(values) ? values : [])
      .map((value) => String(value))
      .filter(Boolean)
      .sort();

  return {
    starRating: sortNumbers(filters.starRating),
    minRating: Number(filters.minRating) > 0 ? Number(filters.minRating) : 0,
    minReviewsCount:
      Number(filters.minReviewsCount) > 0 ? Number(filters.minReviewsCount) : 0,
    facilities: sortStrings(filters.facilities),
    bedTypes: sortStrings(filters.bedTypes),
    boardType: sortStrings(filters.boardType),
    chainIds: sortNumbers(filters.chainIds),
    refundableOnly: Boolean(filters.refundableOnly),
  };
};

export const hotelFiltersKey = (filters) =>
  JSON.stringify(normalizeHotelFilters(filters));

export const hotelStayKey = ({ checkIn, checkOut }) => `${checkIn}_${checkOut}`;

export const hotelOccupancyKey = ({ adults, children, childrenAges }) =>
  `${adults}_${children}_${childrenAges.join(",")}`;

export const buildHotelRatesBody = ({
  search,
  filters,
  currency,
  hotelIds,
  maxRatesPerHotel,
  limit = 5000,
}) => {
  const occupancies = [{ adults: search.adults }];
  if (search.children > 0) {
    occupancies[0].children = search.childrenAges;
  }

  const normalizedFilters = normalizeHotelFilters(filters);
  const body = {
    occupancies,
    currency,
    guestNationality: "US",
    checkin: search.checkIn,
    checkout: search.checkOut,
    roomMapping: true,
    includeHotelData: true,
    margin: 10,
    ...(Array.isArray(hotelIds) && hotelIds.length > 0
      ? { hotelIds }
      : { placeId: search.placeId, limit }),
    ...(maxRatesPerHotel ? { maxRatesPerHotel } : {}),
  };

  if (normalizedFilters.starRating.length > 0) {
    body.starRating = normalizedFilters.starRating;
  }
  if (normalizedFilters.minRating > 0) {
    body.minRating = normalizedFilters.minRating;
  }
  if (normalizedFilters.minReviewsCount > 0) {
    body.minReviewsCount = normalizedFilters.minReviewsCount;
  }
  if (normalizedFilters.facilities.length > 0) {
    body.facilities = normalizedFilters.facilities;
  }
  if (normalizedFilters.bedTypes.length > 0) {
    body.bedTypes = normalizedFilters.bedTypes;
  }
  if (normalizedFilters.boardType.length > 0) {
    body.boardType = normalizedFilters.boardType.join(",");
  }
  if (normalizedFilters.chainIds.length > 0) {
    body.chainIds = normalizedFilters.chainIds;
  }
  if (normalizedFilters.refundableOnly) {
    body.refundableRatesOnly = true;
  }

  return body;
};
