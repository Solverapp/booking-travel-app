import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import PageLoader from "../loaders/PageLoader";
import FlightSearchForm from "./FlightSearchForm";
import MobileFlightSearch from "./MobileFlightSearch";
import FilterDrawer from "../filterdrawer/FilterDrawer";
import FlightFilters from "./FlightFilters";
import useMediaQuery from "../../utils/useMediaQuery";
import { fetchFlightsRates } from "../../services/flights/flightApiService";
import { flightsBookingService } from "../../services/flights/flightBookingService";
import {
  buildRatesRequest,
  buildFlightsParams,
  parseFlightsParams,
  flightFormInitial,
  FLIGHT_TIME_SLOTS,
} from "../../utils/flightSearch";
import { formatDuration, formatTimeHM, dayChangeLabel } from "../../utils/flightFormatters";
import { DEFAULT_CURRENCY, getStoredCurrency, isCurrencyError } from "../../utils/currency";
import {
  journeyOffer,
  journeyPrice,
  durationMinutes,
  minutesBetween,
  dayOffset,
  legsOf,
  carriersOf,
  segmentFlightLabel,
} from "../../utils/flightJourneys";
import "./style.css";

const SORTERS = [
  { id: "cheapest", label: "Cheapest" },
  { id: "fastest", label: "Fastest" },
  { id: "earliest", label: "Earliest" },
];

const fetchRatesWithCurrencyFallback = async (params) => {
  try {
    return await fetchFlightsRates(buildRatesRequest(params));
  } catch (err) {
    if (getStoredCurrency() !== DEFAULT_CURRENCY && isCurrencyError(err)) {
      console.warn(
        `Currency ${getStoredCurrency()} is not supported by the provider, falling back to ${DEFAULT_CURRENCY}`,
      );
      return fetchFlightsRates(buildRatesRequest(params, { currency: DEFAULT_CURRENCY }));
    }
    throw err;
  }
};

// Пересадки journey для фильтра (максимум по направлениям)
const stopsCategory = (journey) => {
  const legs = legsOf(journey);
  if (legs.length === 0) return null;
  const maxStops = Math.max(...legs.map((leg) => leg.length - 1));
  if (maxStops === 0) return "direct";
  if (maxStops === 1) return "one";
  return "two_plus";
};

const journeyCarrierCodes = (journey) => {
  const codes = new Set();
  legsOf(journey).forEach((leg) => {
    carriersOf(leg).forEach((carrier) => codes.add(carrier.code));
  });
  return Array.from(codes);
};

const hourInSlots = (isoDateTime, slotIds) => {
  const date = new Date(isoDateTime ?? "");
  if (Number.isNaN(date.getTime())) return false;
  const hour = date.getHours();
  return slotIds.some((id) => {
    const slot = FLIGHT_TIME_SLOTS.find((item) => item.id === id);
    return slot ? hour >= slot.from && hour < slot.to : false;
  });
};

const DEFAULT_FLIGHT_FILTERS = {
  stops: [],
  airlines: [],
  departTime: [],
  arriveTime: [],
  priceMin: "",
  priceMax: "",
  handBaggage: false,
  checkedBaggage: false,
  refundableOnly: false,
};

const LegRow = ({ segments, expanded, onToggle }) => {
  const first = segments[0] ?? {};
  const last = segments[segments.length - 1] ?? {};
  const stops = segments.length - 1;
  const duration = minutesBetween(first?.departureTime, last?.arrivalTime);
  const carriers = carriersOf(segments);
  const dayChange = dayChangeLabel(
    dayOffset(first?.departureTime, last?.arrivalTime),
  );

  return (
    <div className="fleg">
      <div className="fleg-time">
        <p>{formatTimeHM(first?.departureTime) || "--:--"}</p>
        <span>{first?.originCode ?? "—"}</span>
      </div>
      <button
        type="button"
        className="fleg-mid"
        onClick={onToggle}
        title={expanded ? "Hide details" : "Show details"}
      >
        <span className="fleg-duration">{formatDuration(duration)}</span>
        <div className="fleg-line" />
        <span className={`fleg-stops ${stops === 0 ? "is-direct" : ""}`}>
          {stops === 0 ? "Direct" : stops === 1 ? "1 stop" : `${stops} stops`}
        </span>
        <span className="fleg-expand">
          {expanded ? (
            <ExpandLessIcon fontSize="inherit" />
          ) : (
            <ExpandMoreIcon fontSize="inherit" />
          )}
        </span>
      </button>
      <div className="fleg-time">
        <p>
          {formatTimeHM(last?.arrivalTime) || "--:--"}
          {dayChange ? ` ${dayChange}` : ""}
        </p>
        <span>{last?.destinationCode ?? "—"}</span>
      </div>
      <div className="fleg-carriers">
        {carriers.map((carrier) =>
          carrier.logo ? (
            <img key={carrier.code} src={carrier.logo} alt="" loading="lazy" />
          ) : null,
        )}
        <span>{carriers.map((carrier) => carrier.name).filter(Boolean).join(", ")}</span>
      </div>
    </div>
  );
};

const TimelinePoint = ({ time, code, name, meta, isArrival = false }) => (
  <div className="ftl-point">
    <span className="ftl-time">{time}</span>
    <span className="ftl-linecol">
      <span className={`ftl-dot${isArrival ? " is-arrival" : ""}`} />
    </span>
    <div className="ftl-body">
      <p className="ftl-place">
        <span className="ftl-code">{code}</span>
        <span className="ftl-name">{name}</span>
      </p>
      {meta ? <span className="ftl-meta">{meta}</span> : null}
    </div>
  </div>
);

// Раскрытая детализация маршрута: вертикальный таймлайн по направлениям
const JourneyDetails = ({ journey }) => {
  const legs = legsOf(journey);
  if (legs.length === 0) return null;
  const showLabels = legs.length > 1;

  return (
    <div className="fdetails">
      {legs.map((leg, legIndex) => (
        <div className="fdetails-leg" key={legIndex}>
          {showLabels && (
            <p className="fdetails-leg-label">
              {legIndex === 0 ? "Outbound" : "Return"}
            </p>
          )}
          <div className="ftimeline">
            {leg.map((segment, index) => {
              const next = leg[index + 1] ?? null;
              const layover = next
                ? minutesBetween(segment?.arrivalTime, next?.departureTime)
                : null;
              return (
                <Fragment key={segment?.segmentKey ?? index}>
                  <TimelinePoint
                    time={formatTimeHM(segment?.departureTime) || "--:--"}
                    code={segment?.originCode ?? "—"}
                    name={segment?.originName ?? ""}
                    meta={[segmentFlightLabel(segment), formatDuration(segment?.duration)]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                  <TimelinePoint
                    time={formatTimeHM(segment?.arrivalTime) || "--:--"}
                    code={segment?.destinationCode ?? "—"}
                    name={segment?.destinationName ?? ""}
                    isArrival
                  />
                  {next && Number.isFinite(layover) && layover > 0 && (
                    <div className="ftl-point ftl-point--layover">
                      <span className="ftl-time" />
                      <span className="ftl-linecol" />
                      <div className="ftl-body">
                        <span className="ftl-layover">
                          Layover {formatDuration(layover)} in{" "}
                          {segment?.destinationCode ?? ""}
                        </span>
                      </div>
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const FlightsResult = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useMediaQuery("(max-width: 968px)");

  const params = useMemo(() => parseFlightsParams(searchParams), [searchParams]);
  const searchKey = searchParams.toString();

  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState("cheapest");
  const [reloadKey, setReloadKey] = useState(0);
  const [modifyOpen, setModifyOpen] = useState(false);
  const [verifyingOfferId, setVerifyingOfferId] = useState(null);
  const [bookingError, setBookingError] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FLIGHT_FILTERS);
  const [expandedOfferId, setExpandedOfferId] = useState(null);

  const validSearch = Boolean(params.origin && params.destination && params.depart);

  useEffect(() => {
    if (!validSearch) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchRatesWithCurrencyFallback(params);
        const root = data?.data?.[0] ?? {};
        const list = Array.isArray(root?.journeys) ? root.journeys : [];
        if (!cancelled) setJourneys(list);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load flights");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [params, validSearch, reloadKey]);

  const sorted = useMemo(() => {
    const list = journeys
      .map((journey) => ({ journey, offer: journeyOffer(journey) }))
      .filter((item) => item.offer);

    if (sort === "cheapest") {
      list.sort((a, b) => journeyPrice(a.offer) - journeyPrice(b.offer));
    } else if (sort === "fastest") {
      list.sort(
        (a, b) =>
          (durationMinutes(a.journey) ?? Infinity) -
          (durationMinutes(b.journey) ?? Infinity),
      );
    } else if (sort === "earliest") {
      const departure = (item) => {
        const legs = legsOf(item.journey);
        return Date.parse(legs[0]?.[0]?.departureTime ?? "") || Infinity;
      };
      list.sort((a, b) => departure(a) - departure(b));
    }
    return list;
  }, [journeys, sort]);

  const airlineOptions = useMemo(() => {
    const map = new Map();
    journeys.forEach((journey) => {
      legsOf(journey).forEach((leg) => {
        carriersOf(leg).forEach((carrier) => {
          if (!map.has(carrier.code)) {
            map.set(carrier.code, {
              code: carrier.code,
              name: carrier.name || carrier.code,
              count: 0,
            });
          }
          map.get(carrier.code).count += 1;
        });
      });
    });
    return Array.from(map.values()).sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    );
  }, [journeys]);

  const filtered = useMemo(() => {
    const parsePrice = (value) => {
      const num = Number(value);
      return Number.isFinite(num) && num > 0 ? num : null;
    };
    const minPrice = parsePrice(filters.priceMin);
    const maxPrice = parsePrice(filters.priceMax);

    return sorted.filter(({ journey, offer }) => {
      if (filters.stops.length > 0) {
        const category = stopsCategory(journey);
        if (!category || !filters.stops.includes(category)) return false;
      }

      if (filters.airlines.length > 0) {
        const codes = journeyCarrierCodes(journey);
        if (!codes.some((code) => filters.airlines.includes(code))) return false;
      }

      const outbound = legsOf(journey)[0] ?? [];
      if (
        filters.departTime.length > 0 &&
        !hourInSlots(outbound[0]?.departureTime, filters.departTime)
      ) {
        return false;
      }
      if (
        filters.arriveTime.length > 0 &&
        !hourInSlots(outbound[outbound.length - 1]?.arrivalTime, filters.arriveTime)
      ) {
        return false;
      }

      const price = journeyPrice(offer);
      if (minPrice !== null && price < minPrice) return false;
      if (maxPrice !== null && price > maxPrice) return false;

      if (filters.handBaggage && !offer?.baggage?.hasCarryOnBag) return false;
      if (filters.checkedBaggage && !offer?.baggage?.hasCheckedBag) return false;
      if (filters.refundableOnly && offer?.terms?.refundable !== true) return false;

      return true;
    });
  }, [sorted, filters]);

  const filtersActive =
    filters.stops.length > 0 ||
    filters.airlines.length > 0 ||
    filters.departTime.length > 0 ||
    filters.arriveTime.length > 0 ||
    Number(filters.priceMin) > 0 ||
    Number(filters.priceMax) > 0 ||
    filters.handBaggage ||
    filters.checkedBaggage ||
    filters.refundableOnly;

  const handleNewSearch = (values) => {
    setSearchParams(buildFlightsParams(values));
    setModifyOpen(false);
    setFilters(DEFAULT_FLIGHT_FILTERS);
  };

  const handleSelectOffer = async (offer) => {
    if (!offer?.offerId || verifyingOfferId !== null) return;
    setVerifyingOfferId(offer.offerId);
    setBookingError(null);
    try {
      const verified = await flightsBookingService.verifyFlight({
        offerId: offer.offerId,
        searchParams: buildRatesRequest(params),
      });
      navigate(`/flightpage/${verified.sessionId}`);
    } catch (err) {
      if (err?.code === "UNAUTHORIZED") {
        navigate("/login", { state: { from: `/flights?${searchKey}` } });
        return;
      }
      setBookingError(
        err?.code === "OFFER_EXPIRED"
          ? "This offer has expired — please pick another flight."
          : err?.code === "OFFER_SOLD_OUT"
            ? "This flight just sold out — please pick another offer from the results."
            : err?.message || "Could not check the offer, please try again.",
      );
    } finally {
      setVerifyingOfferId(null);
    }
  };

  const routeTitle = `${params.originLabel || params.origin || "—"} → ${
    params.destinationLabel || params.destination || "—"
  }`;
  // Валюта фактической выдачи (провайдер мог откатиться на AED), fallback — валюта профиля
  const resultCurrency = useMemo(() => {
    for (const journey of journeys) {
      const currency = journeyOffer(journey)?.pricing?.display?.currency;
      if (currency) return currency;
    }
    return getStoredCurrency();
  }, [journeys]);
  const metaText = [
    params.depart ? `${params.depart}${params.trip === "round" && params.returnDate ? ` – ${params.returnDate}` : ""}` : null,
    `${params.adults + params.children + params.infants} pax`,
    params.trip === "round" ? "Round trip" : "One way",
  ]
    .filter(Boolean)
    .join("  ·  ");

  const renderBody = () => {
    if (!validSearch) {
      return (
        <div className="flights-status">
          <p>Search parameters are missing — choose a route and dates.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flights-status">
          <p>{error}</p>
          {validSearch && (
            <button
              type="button"
              className="fselect-btn"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Retry
            </button>
          )}
        </div>
      );
    }

    if (sorted.length === 0) {
      return (
        <div className="flights-status">
          <p>No flights found. Try different dates or another route.</p>
        </div>
      );
    }

    return (
      <>
        <div className="flights-toolbar">
          <span className="flights-count">
            {filtersActive
              ? `${filtered.length} of ${sorted.length} flights`
              : `${sorted.length} flight${sorted.length === 1 ? "" : "s"} found`}
          </span>
          <div className="fsort">
            {SORTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`fsort-btn ${sort === option.id ? "is-active" : ""}`}
                onClick={() => setSort(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {bookingError && <p className="flights-error">{bookingError}</p>}

        {filtered.length === 0 ? (
          <div className="flights-status">
            <p>No flights match your filters.</p>
            <button
              type="button"
              className="fselect-btn"
              onClick={() => setFilters(DEFAULT_FLIGHT_FILTERS)}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="flights-list">
            {filtered.map(({ journey, offer }, index) => {
              const isExpanded =
                Boolean(offer?.offerId) && expandedOfferId === offer.offerId;
              const toggleExpanded = () =>
                setExpandedOfferId(isExpanded ? null : offer.offerId);
              return (
                <div className="fjourney" key={offer?.offerId ?? index}>
                  <div className="fjourney-main">
                    {legsOf(journey).map((leg, legIndex) => (
                      <LegRow
                        key={legIndex}
                        segments={leg}
                        expanded={isExpanded}
                        onToggle={toggleExpanded}
                      />
                    ))}
                    {isExpanded && <JourneyDetails journey={journey} />}
                  </div>
                  <div className="fjourney-price">
                    <div>
                      <p>
                        {Math.round(journeyPrice(offer))}{" "}
                        {offer?.pricing?.display?.currency ?? ""}
                      </p>
                      <span>incl. taxes</span>
                    </div>
                    <button
                      type="button"
                      className="fselect-btn"
                      disabled={verifyingOfferId !== null}
                      onClick={() => handleSelectOffer(offer)}
                    >
                      {verifyingOfferId === offer?.offerId ? "Checking..." : "Select"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  };

  // Лоадер страницы — как на /hotels (полноэкранный, без карточки)
  if (loading && validSearch) {
    return <PageLoader />;
  }

  return (
    <div className="flights-page">
      <div className="flights-head">
        <div className="flights-head-route">{routeTitle}</div>
        <div className="flights-head-meta">{metaText}</div>
        {!isMobile && (
          <button
            type="button"
            className="fmodify-btn"
            onClick={() => setModifyOpen((open) => !open)}
          >
            {modifyOpen ? "Close" : "Modify search"}
          </button>
        )}
      </div>

      {isMobile ? (
        <MobileFlightSearch
          key={searchKey}
          variant="results"
          initial={flightFormInitial(params)}
          onSearch={handleNewSearch}
        />
      ) : (
        modifyOpen && (
          <div className="flights-modify">
            <FlightSearchForm
              key={searchKey}
              initial={flightFormInitial(params)}
              onSearch={handleNewSearch}
            />
          </div>
        )
      )}

      <div className="flights-layout">
        <FilterDrawer>
          <FlightFilters
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(DEFAULT_FLIGHT_FILTERS)}
            airlines={airlineOptions}
            currency={resultCurrency}
          />
        </FilterDrawer>
        <div className="flights-results">{renderBody()}</div>
      </div>
    </div>
  );
};

export default FlightsResult;
