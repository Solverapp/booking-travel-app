import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import PeopleIcon from "@mui/icons-material/People";
import EventIcon from "@mui/icons-material/Event";
import AirlineStopsIcon from "@mui/icons-material/AirlineStops";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SecurityIcon from "@mui/icons-material/Security";
import BackpackOutlinedIcon from "@mui/icons-material/BackpackOutlined";
import LuggageOutlinedIcon from "@mui/icons-material/LuggageOutlined";
import PageLoader from "../loaders/PageLoader";
import FlightPriceBreakdown from "./FlightPriceBreakdown";
import { useFlightSession } from "../../hooks/queries/useFlightSession";
import { useAttachFlightServices } from "../../hooks/mutations/useFlightBookingMutations";
import {
  formatDateShort,
  formatDuration,
  formatPrice,
  formatTimeHM,
} from "../../utils/flightFormatters";
import {
  carriersOf,
  legDuration,
  legsOf,
} from "../../utils/flightJourneys";
import { offerBaggage } from "../../utils/flightOffers";
import {
  buildPriceBreakdown,
  countsFromSearch,
  passengerCountLabel,
} from "../../utils/flightPricing";
import "./style.css";

const passengerLabel = (index, counts) => {
  if (index < counts.adults) return `Adult ${index + 1}`;
  const childIndex = index - counts.adults;
  if (childIndex < counts.children) return `Child ${childIndex + 1}`;
  return `Infant ${index - counts.adults - counts.children + 1}`;
};

const seatKey = (passengerIndex, segmentKey) =>
  `${passengerIndex}:${segmentKey}`;

const servicesOf = (session) => {
  const groups =
    session?.servicesAttachable?.groups ??
    session?.verified?.servicesAttachable?.groups ??
    [];
  return groups.flatMap((group) => (Array.isArray(group?.services) ? group.services : []));
};

const baggageOptionId = (service) => {
  const bag = service?.baggage ?? {};
  return `${bag.bagType ?? "bag"}:${bag.weightKg ?? 0}:${bag.pieces ?? 1}`;
};

const baggageOptionLabel = (bag) => {
  const type = String(bag?.bagType ?? "").toLowerCase();
  const base = type === "cabin" ? "Extra cabin bag" : "Checked bag";
  return [base, bag?.weightKg ? `${bag.weightKg} kg` : ""].filter(Boolean).join(" · ");
};

const buildBaggageOptions = (services) => {
  const options = new Map();
  services.forEach((service) => {
    if (!service?.baggage) return;
    const key = baggageOptionId(service);
    const existing = options.get(key) ?? {
      key,
      bagType: service.baggage.bagType,
      weightKg: service.baggage.weightKg,
      pieces: service.baggage.pieces,
      label: baggageOptionLabel(service.baggage),
      price: 0,
      currency: service.currency ?? "",
      segments: [],
    };
    if (!existing.segments.some((item) => item.serviceId === service.serviceId)) {
      existing.segments.push(service);
      existing.price += Number(service.price) || 0;
    }
    options.set(key, existing);
  });
  return Array.from(options.values());
};

const buildSegmentTabs = (segments) => {
  const counters = { outbound: 0, inbound: 0 };
  return segments.map((segment, index) => {
    const inbound = segment?.direction === "INBOUND";
    counters[inbound ? "inbound" : "outbound"] += 1;
    const directionLabel = inbound ? "Return" : "Outbound";
    const count = counters[inbound ? "inbound" : "outbound"];
    return {
      ...segment,
      index,
      directionLabel,
      tabLabel: `${directionLabel} ${count}`,
      route: `${segment?.originCode ?? "—"} → ${segment?.destinationCode ?? "—"}`,
      dateLabel: formatDateShort(segment?.departureTime),
    };
  });
};

const SeatMap = ({
  services,
  selectedSeatId,
  selectedByOthers,
  onSelect,
  currency,
}) => {
  const columns = Array.from(
    new Set(
      services
        .map((service) => service?.seat?.seatColumn)
        .filter(Boolean),
    ),
  ).sort();
  const rows = Array.from(
    new Set(
      services
        .map((service) => service?.seat?.seatRow)
        .filter((row) => Number.isFinite(Number(row)) && Number(row) > 0)
        .map(Number),
    ),
  ).sort((a, b) => a - b);

  if (columns.length === 0 || rows.length === 0) {
    return (
      <p className="fseats-empty">
        Seat selection is not available for this flight.
      </p>
    );
  }

  const byPosition = new Map(
    services.map((service) => [
      `${service?.seat?.seatRow}:${service?.seat?.seatColumn}`,
      service,
    ]),
  );

  return (
    <div className="fseats-map-scroll">
      <div
        className="fseats-map"
        style={{ "--seat-columns": columns.length }}
      >
        <div className="fseats-map-head">
          <span />
          {columns.map((column) => (
            <span className="fseats-col" key={column}>
              {column}
            </span>
          ))}
          <span />
        </div>

        {rows.map((row) => (
          <div className="fseats-row" key={row}>
            <span className="fseats-row-number">{row}</span>
            {columns.map((column) => {
              const service = byPosition.get(`${row}:${column}`);
              if (!service) {
                return <span className="fseats-gap" key={`${row}-${column}`} />;
              }
              const seat = service.seat ?? {};
              const selected = service.serviceId === selectedSeatId;
              const taken = selectedByOthers.has(service.serviceId);
              const unavailable = seat.available === false || taken;
              const price = Number(service.price) || 0;
              const classes = [
                "fseats-seat",
                seat.seatType ? `is-${seat.seatType}` : "",
                selected ? "is-selected" : "",
                taken ? "is-taken" : "",
                unavailable && !taken ? "is-unavailable" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  type="button"
                  className={classes}
                  key={`${row}-${column}`}
                  disabled={unavailable}
                  onClick={() => onSelect(service)}
                  aria-pressed={selected}
                  aria-label={`${service.name || `Seat ${row}${column}`}${
                    price > 0
                      ? `, ${currency} ${formatPrice(price)}`
                      : ", free"
                  }`}
                  title={service.name || `Seat ${row}${column}`}
                >
                  <span>{column}</span>
                  <small>{price > 0 ? formatPrice(price) : "Free"}</small>
                </button>
              );
            })}
            <span className="fseats-row-number">{row}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const FlightSeats = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const sessionQuery = useFlightSession(sessionId);
  const attachServices = useAttachFlightServices();

  const session = sessionQuery.data?.session ?? null;
  const [submitError, setSubmitError] = useState("");
  const [selectionOverride, setSelectionOverride] = useState(null);

  const redirecting =
    session?.status === "CONFIRMED" || session?.status === "VERIFIED";
  const statusError =
    session?.status === "BOOKING"
      ? "Your booking is being processed. Check My Bookings in a moment."
      : session && session.status !== "PREBOOKED"
        ? "This booking session can no longer be used"
        : "";
  const loading = sessionQuery.isLoading;
  const loadError = sessionQuery.error?.message || statusError;
  const submitting = attachServices.isPending;

  const initialSelection = useMemo(() => {
    const journey = session?.verified?.journey ?? null;
    const segments = Array.isArray(journey?.segments) ? journey.segments : [];
    const catalog = servicesOf(session);
    const catalogById = new Map(
      catalog.map((service) => [service.serviceId, service]),
    );
    const hasSeatOptions = catalog.some(
      (service) =>
        service.category === "seat" &&
        service.seat &&
        service.seat.available !== false,
    );
    const requested = Array.isArray(session?.selectedServices)
      ? session.selectedServices
      : [];

    const nextSeats = {};
    const nextBags = {};
    let hasSeats = false;

    requested.forEach((item) => {
      const service = catalogById.get(item?.serviceId);
      if (!service) return;
      const passengerIndex = Number(item?.passengerIndex);
      if (!Number.isInteger(passengerIndex)) return;
      if (service.category === "seat" && service.segmentKey) {
        nextSeats[seatKey(passengerIndex, service.segmentKey)] = service.serviceId;
        hasSeats = true;
      }
      if (service.category === "baggage" && service.baggage) {
        nextBags[passengerIndex] = baggageOptionId(service);
      }
    });

    return {
      selectedSeats: nextSeats,
      selectedBags: nextBags,
      chooseSeats: hasSeats || hasSeatOptions,
      activePassenger: 0,
      activeSegmentKey: segments[0]?.segmentKey ?? "",
    };
  }, [session]);

  const selection = selectionOverride ?? initialSelection;
  const selectedSeats = selection.selectedSeats;
  const selectedBags = selection.selectedBags;
  const chooseSeats = selection.chooseSeats;
  const activePassenger = selection.activePassenger;
  const activeSegmentKey = selection.activeSegmentKey;

  const setSelectionValue = (key, value) =>
    setSelectionOverride((previous) => {
      const base = previous ?? initialSelection;
      return {
        ...base,
        [key]: typeof value === "function" ? value(base[key]) : value,
      };
    });
  const setSelectedSeats = (value) => setSelectionValue("selectedSeats", value);
  const setSelectedBags = (value) => setSelectionValue("selectedBags", value);
  const setChooseSeats = (value) => setSelectionValue("chooseSeats", value);
  const setActivePassenger = (value) => setSelectionValue("activePassenger", value);
  const setActiveSegmentKey = (value) =>
    setSelectionValue("activeSegmentKey", value);

  useEffect(() => {
    if (!session) return;

    if (session.status === "CONFIRMED") {
      navigate(`/flightconfirmation?sessionId=${sessionId}`, { replace: true });
      return;
    }
    if (session.status === "VERIFIED") {
      navigate(`/flightpage/${sessionId}`, { replace: true });
    }
  }, [session, sessionId, navigate]);

  if (loading || redirecting) {
    return <PageLoader text="Loading seats and baggage..." />;
  }

  if (loadError) {
    return (
      <main className="checkout-main-content">
        <div className="fpage-status form-card-ui animate-fade-in">
          <div className="error-banner">
            <p>{loadError}</p>
          </div>
          <button
            type="button"
            className="action-submit-btn"
            onClick={() => navigate("/flights")}
          >
            Search flights again
          </button>
        </div>
      </main>
    );
  }

  const counts = countsFromSearch(session?.searchParams);
  const journey = session?.verified?.journey ?? null;
  const legs = journey ? legsOf(journey) : [];
  const segments = Array.isArray(journey?.segments) ? journey.segments : [];
  const segmentTabs = buildSegmentTabs(segments);
  const segmentLabels = new Map(
    segmentTabs.map((segment) => [segment.segmentKey, segment.tabLabel]),
  );
  const currentSegment =
    segmentTabs.find((segment) => segment.segmentKey === activeSegmentKey) ??
    segmentTabs[0] ??
    null;
  const catalog = servicesOf(session);
  const seatServices = catalog.filter(
    (service) => service.category === "seat" && service.seat,
  );
  const availableSeatServices = seatServices.filter(
    (service) => service.seat.available !== false,
  );
  const baggageServices = catalog.filter(
    (service) => service.category === "baggage" && service.baggage,
  );
  const baggageOptions = buildBaggageOptions(baggageServices);
  const baggageOptionByKey = new Map(
    baggageOptions.map((option) => [option.key, option]),
  );
  const baggage = offerBaggage({ baggage: journey?.baggage });
  const currency = session?.currency || "AED";
  const fareFamily = journey?.fare?.family ?? "";
  const seatPassengerCount = counts.adults + counts.children;
  const seatPassengers = Array.from({ length: seatPassengerCount }, (_, index) => ({
    index,
    label: passengerLabel(index, counts),
  }));
  const activeSeatPassenger =
    seatPassengers.find((passenger) => passenger.index === activePassenger) ??
    seatPassengers[0] ??
    null;
  const activeSeatPassengerIndex = activeSeatPassenger?.index ?? 0;
  const activeSeatServiceId =
    selectedSeats[seatKey(activeSeatPassengerIndex, currentSegment?.segmentKey)] ??
    "";
  const selectedByOthers = new Set(
    Object.entries(selectedSeats)
      .filter(
        ([key]) =>
          key !== seatKey(activeSeatPassengerIndex, currentSegment?.segmentKey),
      )
      .map(([, serviceId]) => serviceId),
  );
  const currentSegmentSeats = seatServices.filter(
    (service) => service.segmentKey === currentSegment?.segmentKey,
  );

  const selectedSeatServices = Object.entries(selectedSeats)
    .map(([key, serviceId]) => {
      const service = catalog.find((item) => item.serviceId === serviceId);
      if (!service) return null;
      const passengerIndex = Number(key.split(":")[0]);
      return { passengerIndex, service };
    })
    .filter(Boolean);
  const selectedBagServices = Object.entries(selectedBags).flatMap(
    ([passengerIndex, optionKey]) => {
      const option = baggageOptionByKey.get(optionKey);
      if (!option) return [];
      return option.segments.map((service) => ({
        passengerIndex: Number(passengerIndex),
        service,
      }));
    },
  );
  const selectedServiceList = [
    ...selectedSeatServices.map(({ passengerIndex, service }) => ({
      passengerIndex,
      serviceId: service.serviceId,
      quantity: 1,
    })),
    ...selectedBagServices.map(({ passengerIndex, service }) => ({
      passengerIndex,
      serviceId: service.serviceId,
      quantity: 1,
    })),
  ];
  const selectedServiceKey = selectedServiceList
    .map((item) => `${item.passengerIndex}:${item.serviceId}:${item.quantity}`)
    .sort()
    .join("|");
  const previousServiceKey = (Array.isArray(session?.selectedServices)
    ? session.selectedServices
    : []
  )
    .map(
      (item) =>
        `${Number(item?.passengerIndex) || 0}:${item?.serviceId}:${Number(item?.quantity) || 1}`,
    )
    .sort()
    .join("|");
  const hasChanges = selectedServiceKey !== previousServiceKey;

  const baseBreakdown = buildPriceBreakdown({
    journey,
    breakdown: session?.priceBreakdown,
    counts,
    currency,
  });
  const seatsAmount = selectedSeatServices.reduce(
    (total, item) => total + (Number(item.service.price) || 0),
    0,
  );
  const baggageAmount = selectedBagServices.reduce(
    (total, item) => total + (Number(item.service.price) || 0),
    0,
  );
  const previewBreakdown = {
    ...baseBreakdown,
    seats: seatsAmount,
    baggage: baggageAmount,
    total: baseBreakdown.subtotal + seatsAmount + baggageAmount,
  };

  const outboundLeg = legs[0] ?? [];
  const firstSegment = outboundLeg[0] ?? {};
  const lastSegment = outboundLeg[outboundLeg.length - 1] ?? {};
  const routeTitle = `${firstSegment?.originCode ?? "—"} → ${
    lastSegment?.destinationCode ?? "—"
  }`;
  const carrierNames = carriersOf(journey?.segments ?? [])
    .map((carrier) => carrier.name)
    .filter(Boolean)
    .join(", ");

  const handleSeatSelect = (service) => {
    if (!currentSegment || !activeSeatPassenger) return;
    const key = seatKey(activeSeatPassenger.index, currentSegment.segmentKey);
    setSelectedSeats((previous) => {
      if (previous[key] === service.serviceId) {
        const next = { ...previous };
        delete next[key];
        return next;
      }
      return { ...previous, [key]: service.serviceId };
    });
  };

  const handleNoPreference = () => {
    setChooseSeats(false);
    setSelectedSeats({});
  };

  const handleContinue = async () => {
    if (submitting) return;
    setSubmitError("");
    if (!hasChanges) {
      navigate(`/flightcheckout/${sessionId}`);
      return;
    }
    try {
      await attachServices.mutateAsync({
        sessionId,
        selectedServices: selectedServiceList,
      });
      navigate(`/flightcheckout/${sessionId}`);
    } catch (err) {
      if (err?.code === "UNAUTHORIZED") {
        navigate("/login", { state: { from: `/flightseats/${sessionId}` } });
        return;
      }
      setSubmitError(
        err?.message || "Could not save your seats and baggage, please try again.",
      );
    }
  };

  return (
    <main className="checkout-main-content">
      <div className="checkout-layout-container">
        <div className="checkout-left-panel fcheckout-panel">
          <button
            type="button"
            className="back-nav-btn"
            onClick={() => navigate(`/flightpage/${sessionId}?edit=1`)}
          >
            <ChevronLeftIcon />
            <span>Back to passenger details</span>
          </button>

          <h1 className="page-main-title">Seats & baggage</h1>

          {submitError && (
            <div className="error-banner">
              <span className="error-icon">⚠️</span>
              <p>{submitError}</p>
            </div>
          )}

          <div className="form-card-ui animate-fade-in">
            <div className="form-card-header">
              <div className="step-badge">Step 2 of 3</div>
              <h2>Baggage</h2>
              <p>Included allowance is shown for each passenger.</p>
            </div>

            <div className="fseats-baggage">
              {Array.from({ length: counts.adults + counts.children + counts.infants }, (_, index) => {
                const label = passengerLabel(index, counts);
                const selectedOption = selectedBags[index] ?? "";
                return (
                  <div className="fseats-baggage-card" key={index}>
                    <div className="fseats-baggage-head">
                      <strong>{label}</strong>
                      <span className="fseats-included-badge">Included</span>
                    </div>

                    <div className="fseats-baggage-included">
                      {baggage.personal.map((item, itemIndex) => (
                        <span key={`personal-${itemIndex}`}>
                          <BackpackOutlinedIcon fontSize="small" />
                          {item}
                        </span>
                      ))}
                      {baggage.carryOn.map((item, itemIndex) => (
                        <span key={`cabin-${itemIndex}`}>
                          <BackpackOutlinedIcon fontSize="small" />
                          {item}
                        </span>
                      ))}
                      {baggage.checked.map((item, itemIndex) => (
                        <span key={`checked-${itemIndex}`}>
                          <LuggageOutlinedIcon fontSize="small" />
                          {item}
                        </span>
                      ))}
                      {!baggage.hasPersonal &&
                      !baggage.hasCarryOn &&
                      !baggage.hasChecked ? (
                        <span>No free baggage included</span>
                      ) : null}
                    </div>

                    {baggageOptions.length > 0 ? (
                      <label className="fseats-addbag">
                        <span>Add extra baggage</span>
                        <select
                          value={selectedOption}
                          onChange={(event) =>
                            setSelectedBags((previous) => {
                              const next = { ...previous };
                              if (event.target.value) {
                                next[index] = event.target.value;
                              } else {
                                delete next[index];
                              }
                              return next;
                            })
                          }
                        >
                          <option value="">No extra baggage</option>
                          {baggageOptions.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                              {option.price > 0
                                ? ` · ${option.currency || currency} ${formatPrice(
                                    option.price,
                                  )}`
                                : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-card-ui animate-fade-in">
            <div className="form-card-header">
              <h2>Seats</h2>
              <p>Choose a seat for each passenger or continue with no preference.</p>
            </div>

            <div className="fseats-mode">
              <label className={`fseats-mode-option${!chooseSeats ? " is-active" : ""}`}>
                <input
                  type="radio"
                  name="seat-mode"
                  checked={!chooseSeats}
                  onChange={handleNoPreference}
                />
                <span>
                  <strong>No preference</strong>
                  <small>Seats will be assigned at check-in · Free</small>
                </span>
              </label>
              <label className={`fseats-mode-option${chooseSeats ? " is-active" : ""}`}>
                <input
                  type="radio"
                  name="seat-mode"
                  checked={chooseSeats}
                  disabled={availableSeatServices.length === 0}
                  onChange={() => setChooseSeats(true)}
                />
                <span>
                  <strong>Pick from seat map</strong>
                  <small>
                    {availableSeatServices.length === 0
                      ? "Not available for this fare"
                      : "Choose your preferred seats"}
                  </small>
                </span>
              </label>
            </div>

            {availableSeatServices.length === 0 ? (
              <p className="fseats-empty">
                The airline did not return any seats available for selection on
                this fare. You can continue with no preference.
              </p>
            ) : null}

            {chooseSeats ? (
              <>
                {seatPassengers.length > 1 ? (
                  <div className="fseats-tabs fseats-tabs--pax">
                    {seatPassengers.map((passenger) => (
                      <button
                        type="button"
                        key={passenger.index}
                        className={`fseats-tab${
                          passenger.index === activeSeatPassengerIndex ? " is-active" : ""
                        }`}
                        onClick={() => setActivePassenger(passenger.index)}
                      >
                        {passenger.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                {segmentTabs.length > 1 ? (
                  <div className="fseats-tabs fseats-tabs--segments">
                    {segmentTabs.map((segment) => (
                      <button
                        type="button"
                        key={segment.segmentKey ?? segment.index}
                        className={`fseats-tab${
                          segment.segmentKey === currentSegment?.segmentKey
                            ? " is-active"
                            : ""
                        }`}
                        onClick={() => setActiveSegmentKey(segment.segmentKey)}
                      >
                        <span>{segment.tabLabel}</span>
                        <small>
                          {segment.route} · {segment.dateLabel}
                        </small>
                      </button>
                    ))}
                  </div>
                ) : null}

                {currentSegment ? (
                  <div className="fseats-current">
                    <span>
                      {activeSeatPassenger?.label ?? "Passenger"} ·{" "}
                      {currentSegment.route}
                    </span>
                    <small>{formatDateShort(currentSegment.departureTime)}</small>
                  </div>
                ) : null}

                <div className="fseats-legend">
                  <span><i className="is-free" /> Available</span>
                  <span><i className="is-extra" /> Extra legroom</span>
                  <span><i className="is-selected" /> Selected</span>
                  <span><i className="is-taken" /> Unavailable</span>
                </div>

                <SeatMap
                  services={currentSegmentSeats}
                  selectedSeatId={activeSeatServiceId}
                  selectedByOthers={selectedByOthers}
                  onSelect={handleSeatSelect}
                  currency={currency}
                />
              </>
            ) : (
              <div className="fseats-no-preference">
                No seat selection needed. Your seats will be assigned by the airline.
              </div>
            )}
          </div>

          <div className="secure-badge-info">
            <SecurityIcon />
            <span>Your connection is fully secure and encrypted.</span>
          </div>

          <button
            type="button"
            className="action-submit-btn"
            disabled={submitting}
            onClick={handleContinue}
          >
            {submitting
              ? "Saving seats and baggage..."
              : `Continue to payment · ${currency} ${formatPrice(
                  previewBreakdown.total,
                )}`}
          </button>
        </div>

        <div className="checkout-right-panel">
          <div className="sticky-summary-card">
            <div className="summary-card-body">
              <h3 className="summary-hotel-name">{routeTitle}</h3>

              <div className="summary-meta-grid">
                <div className="meta-icon-row">
                  <EventIcon />
                  <div>
                    <span className="meta-label">Dates</span>
                    <span className="meta-value">
                      {formatDateShort(firstSegment?.departureTime) || "—"}
                      {legs.length > 1
                        ? ` — ${formatDateShort(
                            legs[1]?.[legs[1].length - 1]?.arrivalTime,
                          )}`
                        : ""}
                    </span>
                  </div>
                </div>

                <div className="meta-icon-row">
                  <PeopleIcon />
                  <div>
                    <span className="meta-label">Passengers</span>
                    <span className="meta-value">
                      {passengerCountLabel(counts)}
                    </span>
                  </div>
                </div>

                <div className="meta-icon-row">
                  <FlightTakeoffIcon />
                  <div>
                    <span className="meta-label">Airline</span>
                    <span className="meta-value">{carrierNames || "—"}</span>
                  </div>
                </div>

                <div className="meta-icon-row">
                  <AirlineStopsIcon />
                  <div>
                    <span className="meta-label">Stops</span>
                    <span className="meta-value">
                      {legs
                        .map((leg) =>
                          leg.length - 1 === 0
                            ? "Direct"
                            : `${leg.length - 1} stop${leg.length - 1 > 1 ? "s" : ""}`,
                        )
                        .join(" · ")}
                    </span>
                  </div>
                </div>

                <div className="meta-icon-row">
                  <AccessTimeIcon />
                  <div>
                    <span className="meta-label">
                      {legs.length > 1 ? "Duration" : "Total duration"}
                    </span>
                    <span className="meta-value">
                      {legs.length > 1
                        ? legs
                            .map((leg) => formatDuration(legDuration(leg)))
                            .filter(Boolean)
                            .join(" · ") || "—"
                        : formatDuration(journey?.totalDuration) ||
                          formatDuration(legDuration(legs[0])) ||
                          "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="summary-price-breakdown-divider" />

              <FlightPriceBreakdown
                breakdown={previewBreakdown}
                fareFamily={fareFamily}
                counts={counts}
              />

              <div className="summary-price-breakdown-divider" />

              <div className="fcheckout-extras">
                <h4 className="fcheckout-extras-title">Your selection</h4>
                {selectedSeatServices.length === 0 &&
                selectedBagServices.length === 0 ? (
                  <p className="fcheckout-extras-empty">
                    No seats or extra baggage selected.
                  </p>
                ) : (
                  <ul className="fcheckout-extras-list">
                    {selectedSeatServices.map(({ passengerIndex, service }) => (
                      <li key={`seat-${passengerIndex}-${service.serviceId}`}>
                        <span>
                          {[
                            passengerLabel(passengerIndex, counts),
                            segmentLabels.get(service.segmentKey),
                            service.seat?.seatNumber || service.name,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                        <span>
                          {service.currency || currency}{" "}
                          {formatPrice(service.price)}
                        </span>
                      </li>
                    ))}
                    {selectedBagServices.map(({ passengerIndex, service }) => (
                      <li key={`bag-${passengerIndex}-${service.serviceId}`}>
                        <span>
                          {[
                            passengerLabel(passengerIndex, counts),
                            segmentLabels.get(service.segmentKey),
                            service.name,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                        <span>
                          {service.currency || currency}{" "}
                          {formatPrice(service.price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {session?.expiresAt ? (
                <p className="fpage-note">
                  Price held until {formatTimeHM(session.expiresAt)}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default FlightSeats;
