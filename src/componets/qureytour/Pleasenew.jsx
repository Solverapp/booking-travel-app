import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import LocationCityOutlined from "@mui/icons-material/LocationCityOutlined";
import HotelOutlined from "@mui/icons-material/HotelOutlined";
import AnchoredPopover from "../searchfields/AnchoredPopover";
import SuggestionItem from "../searchfields/SuggestionItem";
import {
  NEARBY_RADIUS_KM,
  POPULAR_HOTEL_DESTINATIONS,
} from "../../mock/searchDestinations";
import { nearestItems } from "../../utils/geo";
import useGeolocation from "../../utils/useGeolocation";
import { placesService } from "../../services/placesService";
import "./style.css";

const HOTEL_TYPES = new Set([
  "lodging",
  "hotel",
  "motel",
  "resort",
  "guest_house",
  "hostel",
]);

const isHotelPlace = (place) => {
  const types = Array.isArray(place?.types) ? place.types : [];
  if (types.some((type) => HOTEL_TYPES.has(type))) return true;
  return types.includes("establishment") && !types.includes("locality");
};

const distanceLabel = (km) => {
  if (!Number.isFinite(km)) return "";
  if (km < 1) return "<1 km";
  return `${Math.round(km)} km`;
};

const toPopularPlace = (item) => ({
  placeId: item.placeId,
  displayName: item.name,
  formattedAddress: item.country,
  types: ["locality"],
  distanceKm: item.distanceKm,
});

const PleaseSearch = ({
  onCityChange,
  onCityEdit,
  initialCity,
  variant = "popup",
  active = false,
}) => {
  const [destination, setDestination] = useState(() => initialCity || "");
  const [places, setPlaces] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const inputRef = useRef(null);
  const controlRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const requestIdRef = useRef(0);
  const { coords, status, request } = useGeolocation();

  const nearby = useMemo(
    () =>
      coords
        ? nearestItems(POPULAR_HOTEL_DESTINATIONS, coords, {
            limit: 5,
            maxKm: NEARBY_RADIUS_KM,
          })
        : [],
    [coords],
  );

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (variant === "sheet" && active) request();
  }, [variant, active, request]);

  const runSearch = useCallback((value) => {
    const query = String(value ?? "").trim();
    abortRef.current?.abort();

    if (query.length < 3) {
      setPlaces([]);
      setLoading(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setSearchError(null);

    placesService
      .fetchPlacesList({ query, signal: controller.signal })
      .then((data) => {
        if (requestIdRef.current !== requestId) return;
        setPlaces(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        if (requestIdRef.current !== requestId) return;
        setPlaces([]);
        setSearchError("Could not load destinations");
      })
      .finally(() => {
        if (requestIdRef.current !== requestId) return;
        setLoading(false);
      });
  }, []);

  const handleDestinationChange = (event) => {
    const value = event.target.value;
    abortRef.current?.abort();
    requestIdRef.current += 1;
    setDestination(value);
    setPlaces([]);
    setLoading(false);
    setOpen(true);
    onCityEdit?.();
    setSearchError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 3) {
      debounceRef.current = setTimeout(() => runSearch(value), 300);
    }
  };

  const handlePlaceSelect = (place) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    requestIdRef.current += 1;
    const name = place.displayName || place.name || "";
    setDestination(name);
    setPlaces([]);
    setLoading(false);
    setOpen(false);
    onCityChange?.(name, place.placeId);
  };

  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    requestIdRef.current += 1;
    setDestination("");
    setPlaces([]);
    setLoading(false);
    setSearchError(null);
    setOpen(true);
    onCityEdit?.();
    onCityChange?.("", "");
    inputRef.current?.focus();
  };

  const handleNearMe = () => {
    request({ force: true });
  };

  const renderSuggestion = (place) => {
    const name = place.displayName || place.name || "";
    const hotel = isHotelPlace(place);
    return (
      <SuggestionItem
        key={place.placeId || name}
        icon={hotel ? <HotelOutlined /> : <LocationCityOutlined />}
        iconVariant="boxed"
        title={name}
        subtitle={place.formattedAddress || place.country || ""}
        selected={destination === name}
        trailing={
          Number.isFinite(place.distanceKm)
            ? distanceLabel(place.distanceKm)
            : undefined
        }
        onClick={() => handlePlaceSelect(place)}
      />
    );
  };

  const renderSections = () => {
    const query = destination.trim();
    const isSearching = query.length >= 3;
    const nearMeAction = (
      <button
        type="button"
        className="search-popover__action"
        onClick={handleNearMe}
        disabled={status === "loading"}
      >
        {status === "loading" ? "Locating..." : "Near me"}
      </button>
    );

    if (isSearching) {
      return (
        <div className="search-popover__section">
          <div className="search-popover__section-head">
            <span className="search-popover__section-title">
              Search results
            </span>
          </div>
          {loading ? (
            <p className="search-popover__empty">Searching...</p>
          ) : null}
          {!loading && searchError ? (
            <p className="search-popover__empty">{searchError}</p>
          ) : null}
          {!loading && !searchError && places.length === 0 ? (
            <p className="search-popover__empty">No destinations found</p>
          ) : null}
          {!loading && !searchError ? places.map(renderSuggestion) : null}
        </div>
      );
    }

    return (
      <>
        {nearby.length > 0 ? (
          <div className="search-popover__section">
            <div className="search-popover__section-head">
              <span className="search-popover__section-title">Near you</span>
              {nearMeAction}
            </div>
            {nearby.map((item) => renderSuggestion(toPopularPlace(item)))}
          </div>
        ) : null}

        <div className="search-popover__section">
          <div className="search-popover__section-head">
            <span className="search-popover__section-title">
              Popular destinations
            </span>
            {nearby.length === 0 ? nearMeAction : null}
          </div>
          {POPULAR_HOTEL_DESTINATIONS.map((item) =>
            renderSuggestion(toPopularPlace(item)),
          )}
        </div>
      </>
    );
  };

  const control = (
    <div className="city-picker__control" ref={controlRef}>
      <SearchOutlined className="city-picker__icon" />
      <input
        ref={inputRef}
        type="text"
        className="city-picker__input"
        value={destination}
        onChange={handleDestinationChange}
        onFocus={() => setOpen(true)}
        placeholder="Search destination..."
        aria-label="Search destination"
        autoComplete="off"
      />
      {destination ? (
        <button
          type="button"
          className="city-picker__clear"
          onClick={handleClear}
          aria-label="Clear destination"
        >
          <CloseOutlined fontSize="inherit" />
        </button>
      ) : null}
    </div>
  );

  if (variant === "sheet") {
    return (
      <div className="city-picker city-picker--sheet">
        {control}
        {renderSections()}
      </div>
    );
  }

  return (
    <div className="sop-box-search city-picker">
      <p>Where to?</p>
      {control}
      <AnchoredPopover
        open={open}
        anchorRef={controlRef}
        onClose={() => setOpen(false)}
        preferredWidth={380}
        ariaLabel="Destinations"
      >
        {renderSections()}
      </AnchoredPopover>
    </div>
  );
};

export default PleaseSearch;
