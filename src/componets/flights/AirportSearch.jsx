import { useMemo, useRef, useState } from "react";
import LocalAirportOutlined from "@mui/icons-material/LocalAirportOutlined";
import AnchoredPopover from "../searchfields/AnchoredPopover";
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

const dedupeAirports = (items) => {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter((airport) => {
    const key = airport?.iata || airport?.name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const AirportSearch = ({ label = "From", value, onSelect, onEdit }) => {
  const [query, setQuery] = useState(null);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const { coords, status, request } = useGeolocation();

  const term = query === null ? "" : query.trim();
  const debouncedTerm = useDebouncedValue(term, 300);
  const isDebouncing = term !== debouncedTerm;
  const suggestionsQuery = useAirportSuggestions(debouncedTerm);
  const airports = useMemo(
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

  const handleChange = (event) => {
    setQuery(event.target.value);
    setOpen(true);
    onEdit?.();
  };

  const handleSelect = (airport) => {
    setQuery(null);
    setOpen(false);
    onSelect?.(airport);
  };

  const handleNearMe = () => {
    request({ force: true });
  };

  const renderAirport = (airport, keyPrefix) => (
    <SuggestionItem
      key={`${keyPrefix}${airport.iata || airport.name}`}
      icon={<LocalAirportOutlined />}
      iconVariant="boxed"
      title={airportTitle(airport)}
      subtitle={airport.country || airport.name || ""}
      selected={Boolean(value?.iata && value.iata === airport.iata)}
      onClick={() => handleSelect(airport)}
    />
  );

  const renderSections = () => {
    const isSearching = query !== null && query.trim().length >= 2;
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
          {!loading && !searchError && airports.length === 0 ? (
            <p className="search-popover__empty">No airports found</p>
          ) : null}
          {!loading && !searchError
            ? airports.map((airport) => renderAirport(airport, "result-"))
            : null}
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
            {nearby.map((airport) => renderAirport(airport, "near-"))}
          </div>
        ) : null}

        <div className="search-popover__section">
          <div className="search-popover__section-head">
            <span className="search-popover__section-title">
              Popular airports
            </span>
            {nearby.length === 0 ? nearMeAction : null}
          </div>
          {POPULAR_AIRPORTS.filter(
            (airport) => !nearby.some((item) => item.iata === airport.iata),
          ).map((airport) => renderAirport(airport, "popular-"))}
        </div>
      </>
    );
  };

  const text = query ?? airportValue(value);

  return (
    <div className="air-item" ref={anchorRef}>
      <div className="air-item-box">
        <p>{label}</p>
        <input
          type="text"
          className="airport-input"
          value={text}
          placeholder="City or airport"
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          aria-label={`${label} airport`}
          autoComplete="off"
        />
      </div>
      {value?.iata && <span className="gray">{value.iata}</span>}
      <AnchoredPopover
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        preferredWidth={372}
        ariaLabel={`${label} airports`}
      >
        {renderSections()}
      </AnchoredPopover>
    </div>
  );
};

export default AirportSearch;
