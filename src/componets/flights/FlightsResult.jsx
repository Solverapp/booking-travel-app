import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageLoader from "../loaders/PageLoader";
import FlightSearchForm from "./FlightSearchForm";
import MobileFlightSearch from "./MobileFlightSearch";
import FilterDrawer from "../filterdrawer/FilterDrawer";
import FlightFilters from "./FlightFilters";
import FlightCard from "./FlightCard";
import FlightDetailsDrawer from "./FlightDetailsDrawer";
import FlightFaresModal from "./FlightFaresModal";
import useMediaQuery from "../../utils/useMediaQuery";
import { useAuth } from "../../context/AuthContext";
import { useAuthPrompt } from "../../context/authPrompt";
import { useFlightRates } from "../../hooks/queries/useFlightRates";
import { useVerifyFlight } from "../../hooks/mutations/useFlightBookingMutations";
import {
  buildRatesRequest,
  buildFlightsParams,
  parseFlightsParams,
  flightFormInitial,
  FLIGHT_TIME_SLOTS,
} from "../../utils/flightSearch";
import { fareOptions } from "../../utils/flightOffers";
import { getStoredCurrency } from "../../utils/currency";
import { resolveNationality } from "../../utils/nationality";
import {
  journeyOffer,
  journeyPrice,
  durationMinutes,
  legsOf,
  carriersOf,
} from "../../utils/flightJourneys";
import "./style.css";

const SORTERS = [
  { id: "cheapest", label: "Cheapest" },
  { id: "fastest", label: "Fastest" },
  { id: "earliest", label: "Earliest" },
];

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

const FlightsResult = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useMediaQuery("(max-width: 968px)");
  const { user } = useAuth();
  const { openAuthPrompt } = useAuthPrompt();

  const nationality = resolveNationality(user?.nationality);
  const params = useMemo(
    () => ({ ...parseFlightsParams(searchParams), nationality }),
    [searchParams, nationality],
  );
  const searchKey = searchParams.toString();

  const [sort, setSort] = useState("cheapest");
  const [modifyOpen, setModifyOpen] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FLIGHT_FILTERS);
  const [panel, setPanel] = useState(null);

  const validSearch = Boolean(params.origin && params.destination && params.depart);
  const ratesQuery = useFlightRates({ params, enabled: validSearch });
  const verifyFlight = useVerifyFlight();

  const journeys = useMemo(() => {
    const root = ratesQuery.data?.data?.[0] ?? {};
    return Array.isArray(root?.journeys) ? root.journeys : [];
  }, [ratesQuery.data]);
  const loading = ratesQuery.isLoading;
  const error = ratesQuery.error?.message || null;
  const verifyingOfferId = verifyFlight.isPending
    ? verifyFlight.variables?.offer?.offerId ?? null
    : null;

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
    if (!offer?.offerId || verifyFlight.isPending) return;
    if (!user) {
      openAuthPrompt({ service: "flight", from: `/flights?${searchKey}` });
      return;
    }
    setBookingError(null);
    try {
      const verified = await verifyFlight.mutateAsync({
        offer,
        searchParams: buildRatesRequest(params),
      });
      navigate(`/flightpage/${verified.sessionId}`);
    } catch (err) {
      if (err?.code === "UNAUTHORIZED") {
        openAuthPrompt({ service: "flight", from: `/flights?${searchKey}` });
        return;
      }
      setBookingError(
        err?.code === "OFFER_EXPIRED"
          ? "This offer has expired — please pick another flight."
          : err?.code === "OFFER_SOLD_OUT"
            ? "This flight just sold out — please pick another offer from the results."
            : err?.message || "Could not check the offer, please try again.",
      );
    }
  };

  const openDetails = (journey, offer) => {
    setBookingError(null);
    setPanel({ type: "details", journey, offer });
  };

  const openFares = (journey, offer) => {
    setBookingError(null);
    setPanel({ type: "fares", journey, offer });
  };

  const closePanel = () => setPanel(null);

  const showFaresFromDetails = () =>
    setPanel((current) =>
      current ? { ...current, type: "fares" } : current,
    );

  const activeJourney = panel?.journey ?? null;
  const activeOffer = panel?.offer ?? null;
  const activeFareList = useMemo(
    () => (activeJourney ? fareOptions(activeJourney) : []),
    [activeJourney],
  );

  const routeLabels = useMemo(
    () => ({
      origin: params.originLabel || params.origin || "",
      destination: params.destinationLabel || params.destination || "",
    }),
    [params],
  );

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
              onClick={() => ratesQuery.refetch()}
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
            {filtered.map(({ journey, offer }) => (
              <FlightCard
                key={offer.offerId}
                journey={journey}
                offer={offer}
                fareCount={fareOptions(journey).length}
                onDetails={() => openDetails(journey, offer)}
                onViewFares={() => openFares(journey, offer)}
              />
            ))}
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
        <FilterDrawer
          resultCount={validSearch ? filtered.length : null}
          resultNoun="flight"
        >
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

      <FlightDetailsDrawer
        open={panel?.type === "details"}
        onClose={closePanel}
        journey={activeJourney}
        offer={activeOffer}
        routeLabels={routeLabels}
        title={routeTitle}
        hasMultipleFares={activeFareList.length > 1}
        onViewFares={showFaresFromDetails}
      />

      <FlightFaresModal
        open={panel?.type === "fares"}
        onClose={closePanel}
        journey={activeJourney}
        offers={activeFareList}
        routeLabels={routeLabels}
        onSelect={handleSelectOffer}
        verifyingOfferId={verifyingOfferId}
        error={bookingError}
      />
    </div>
  );
};

export default FlightsResult;
