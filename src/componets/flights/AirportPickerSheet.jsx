import { useEffect, useMemo, useRef, useState } from "react";
import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import LocalAirportOutlined from "@mui/icons-material/LocalAirportOutlined";
import SuggestionItem from "../searchfields/SuggestionItem";
import { useAirportSuggestions } from "../../hooks/queries/useAirportSuggestions";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import {
  NEARBY_RADIUS_KM,
  POPULAR_AIRPORTS,
} from "../../mock/searchDestinations";
import { nearestItems } from "../../utils/geo";
import useGeolocation from "../../utils/useGeolocation";
import "../searchfields/searchUi.css";
import "./style.css";

const airportValue = (airport) =>
  airport?.city || airport?.name || airport?.iata || "";

const airportTitle = (airport) =>
  [airport?.city || airport?.name, airport?.iata].filter(Boolean).join(" · ");

const airportSubtitle = (airport) => airport?.country || airport?.name || "";

const dedupeAirports = (items) => {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter((airport) => {
    const key = airport?.iata || airport?.name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const AirportPickerSheet = ({
  open = false,
  field = "from",
  origin,
  destination,
  onFieldChange,
  onOriginChange,
  onDestinationChange,
  onClose,
}) => {
  const [query, setQuery] = useState(null);
  const inputRef = useRef(null);
  const { coords, status, request } = useGeolocation();

  const selectedAirport = field === "from" ? origin : destination;
  const selectedIata = selectedAirport?.iata;
  const inputValue = query ?? airportValue(selectedAirport);
  const term = query === null ? "" : query.trim();
  const debouncedTerm = useDebouncedValue(term, 300);
  const isDebouncing = term !== debouncedTerm;
  const suggestionsQuery = useAirportSuggestions(debouncedTerm);
  const results = useMemo(
    () => (term.length >= 2 && !isDebouncing ? dedupeAirports(suggestionsQuery.data) : []),
    [term, isDebouncing, suggestionsQuery.data],
  );
  const loading = term.length >= 2 && (isDebouncing || suggestionsQuery.isFetching);
  const searchError =
    term.length >= 2 && !isDebouncing && suggestionsQuery.isError
      ? "Could not load airports"
      : null;

  const nearby = useMemo(
    () =>
      coords
        ? nearestItems(POPULAR_AIRPORTS, coords, {
            limit: 3,
            maxKm: NEARBY_RADIUS_KM,
          })
        : [],
    [coords],
  );

  useEffect(() => {
    if (open) request();
  }, [open, request]);

  const resetSearch = () => {
    setQuery(null);
  };

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
  };

  const handleClear = () => {
    resetSearch();
    if (field === "from") onOriginChange?.(null);
    else onDestinationChange?.(null);
    inputRef.current?.focus();
  };

  const handleFieldChange = (nextField) => {
    if (nextField === field) return;
    resetSearch();
    onFieldChange?.(nextField);
  };

  const handleSelect = (airport) => {
    if (field === "from") {
      onOriginChange?.(airport);
      onFieldChange?.("to");
      resetSearch();
      inputRef.current?.focus();
      return;
    }

    onDestinationChange?.(airport);
    onClose?.();
  };

  const renderAirport = (airport, keyPrefix = "") => (
    <SuggestionItem
      key={`${keyPrefix}${airport.iata || airport.name}`}
      icon={<LocalAirportOutlined />}
      iconVariant="boxed"
      title={airportTitle(airport)}
      subtitle={airportSubtitle(airport)}
      selected={Boolean(selectedIata && selectedIata === airport.iata)}
      onClick={() => handleSelect(airport)}
    />
  );

  const isSearching = query !== null && query.trim().length >= 2;

  return (
    <div className="airport-picker">
      <div className="airport-tabs" role="group" aria-label="Airport field">
        <button
          type="button"
          className={`airport-tab${field === "from" ? " is-active" : ""}`}
          aria-pressed={field === "from"}
          onClick={() => handleFieldChange("from")}
        >
          From
        </button>
        <button
          type="button"
          className={`airport-tab${field === "to" ? " is-active" : ""}`}
          aria-pressed={field === "to"}
          onClick={() => handleFieldChange("to")}
        >
          To
        </button>
      </div>

      <div className="airport-picker__control">
        <LocationOnOutlined className="airport-picker__icon" />
        <input
          ref={inputRef}
          type="text"
          className="airport-picker__input"
          value={inputValue}
          onChange={handleQueryChange}
          placeholder={field === "from" ? "From where?" : "Where to?"}
          aria-label={field === "from" ? "Search departure airport" : "Search arrival airport"}
          autoComplete="off"
        />
        {inputValue ? (
          <button
            type="button"
            className="airport-picker__clear"
            onClick={handleClear}
            aria-label="Clear airport search"
          >
            <CloseOutlined fontSize="inherit" />
          </button>
        ) : null}
      </div>

      {isSearching ? (
        <section className="airport-section">
          <p className="airport-section__title">Search results</p>
          <div className="airport-section__list">
            {loading ? (
              <p className="search-popover__empty">Searching...</p>
            ) : null}
            {!loading && searchError ? (
              <p className="search-popover__empty">{searchError}</p>
            ) : null}
            {!loading && !searchError && results.length === 0 ? (
              <p className="search-popover__empty">No airports found</p>
            ) : null}
            {!loading && !searchError
              ? results.map((airport) => renderAirport(airport, "result-"))
              : null}
          </div>
        </section>
      ) : (
        <>
          {nearby.length > 0 ? (
            <section className="airport-section">
              <p className="airport-section__title">Near you</p>
              <div className="airport-section__list">
                {nearby.map((airport) => renderAirport(airport, "near-"))}
              </div>
            </section>
          ) : null}

          <section className="airport-section">
            <p className="airport-section__title">Popular airports</p>
            <div className="airport-section__list">
              {POPULAR_AIRPORTS.filter(
                (airport) =>
                  !nearby.some((item) => item.iata === airport.iata),
              ).map((airport) => renderAirport(airport, "popular-"))}
            </div>
          </section>

          {status === "loading" ? (
            <p className="airport-picker__status">Finding airports near you...</p>
          ) : null}
        </>
      )}
    </div>
  );
};

export default AirportPickerSheet;
