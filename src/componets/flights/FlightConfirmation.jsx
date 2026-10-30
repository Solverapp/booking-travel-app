import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import PersonIcon from "@mui/icons-material/Person";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useAuthPrompt } from "../../context/authPrompt";
import { useBookFlight } from "../../hooks/mutations/useFlightBookingMutations";
import { formatDateShort, formatTimeHM } from "../../utils/flightFormatters";
import { segmentLabelsByKey } from "../../utils/flightJourneys";
import "./style.css";

const FlightConfirmation = () => {
  const navigate = useNavigate();
  const { openAuthPrompt } = useAuthPrompt();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId") || "";

  const { mutateAsync: bookFlight } = useBookFlight();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [error, setError] = useState("");
  const [soldOut, setSoldOut] = useState(false);
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const completeBooking = async () => {
      if (!sessionId) {
        setError("Missing booking information");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setSoldOut(false);
      setPending(false);
      try {
        const summary = await bookFlight({ sessionId });
        if (!cancelled) setBooking(summary);
      } catch (err) {
        if (cancelled) return;
        if (err?.code === "UNAUTHORIZED") {
          openAuthPrompt({
            service: "flight",
            from: `/flightconfirmation?sessionId=${sessionId}`,
          });
          return;
        }
        const stillProcessing =
          ["BOOKING_IN_PROGRESS", "BOOKING_UNKNOWN", "GATEWAY_TIMEOUT", "WORKER_LIMIT"].includes(
            err?.code,
          ) || err?.status === 504;
        if (err?.code === "OFFER_SOLD_OUT") setSoldOut(true);
        setPending(stillProcessing);
        setError(
          stillProcessing
            ? "Payment was received. The airline is still confirming your booking, which can take a minute. Check My Bookings, or try again."
            : err?.code === "INVALID_STATE"
              ? "Payment was not completed for this booking."
              : err?.code === "OFFER_SOLD_OUT"
                ? "This flight just sold out while completing your booking — the offer is no longer available. Please search for a new flight."
                : err?.message || "Could not confirm the booking, please try again.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    completeBooking();
    return () => {
      cancelled = true;
    };
  }, [sessionId, attempt, bookFlight, openAuthPrompt]);

  if (loading) {
    return (
      <main className="confirmation-main-content">
        <div
          className="fpage-status form-card-ui animate-fade-in"
          role="status"
          aria-live="polite"
        >
          <span className="fconfirmation-loader" aria-hidden="true" />
          <p>Confirming your booking and printing ticket...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="confirmation-main-content">
        <div className="fpage-status form-card-ui animate-fade-in">
          <div className="error-banner">
            <p>{error}</p>
          </div>
          <div className="confirmation-action-buttons">
            {pending && (
              <button
                type="button"
                className="primary-action-nav-btn"
                onClick={() => navigate("/profile?tab=bookings")}
              >
                Check My Bookings
              </button>
            )}
            {!soldOut && (
              <button
                type="button"
                className={pending ? "secondary-action-nav-btn" : "primary-action-nav-btn"}
                onClick={() => setAttempt((value) => value + 1)}
              >
                Try again
              </button>
            )}
            <button
              type="button"
              className="secondary-action-nav-btn"
              onClick={() => navigate("/flights")}
            >
              {soldOut ? "Search another flight" : "Search flights"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  const segments = Array.isArray(booking?.meta?.segments) ? booking.meta.segments : [];
  const reference = booking?.pnr || booking?.bookingRef || booking?.bookingId || "—";
  const breakdown = booking?.meta?.priceBreakdown ?? null;
  const services = Array.isArray(booking?.meta?.services) ? booking.meta.services : [];
  const currency = booking?.currency ?? breakdown?.currency ?? "AED";
  const money = (value) => `${Number(value || 0).toFixed(2)} ${currency}`;

  // Round-trip: сегменты по направлениям (Outbound/Return); one-way — одна группа без лейбла
  const legGroups = [
    { id: "outbound", label: "Outbound", list: segments.filter((s) => s?.direction !== "INBOUND") },
    { id: "inbound", label: "Return", list: segments.filter((s) => s?.direction === "INBOUND") },
  ].filter((group) => group.list.length > 0);
  const segmentLabels = segmentLabelsByKey(segments);

  return (
    <main className="confirmation-main-content">
      <div className="confirmation-layout-box animate-scale-up">
        <div className="success-hero-header">
          <CheckCircleOutlinedIcon className="success-tick-icon" />
          <h1>Booking Confirmed!</h1>
          <p>
            Your flight reservation is complete. The itinerary was dispatched to your
            email.
          </p>
        </div>

        <div className="digital-voucher-ticket">
          <div className="voucher-top-bar">
            <div className="voucher-title">
              <ReceiptLongIcon />
              <span>Flight Voucher</span>
            </div>
            <div className="voucher-status-badge">{booking?.status ?? "Confirmed"}</div>
          </div>

          <div className="voucher-body">
            <div className="voucher-grid-info">
              <div className="voucher-info-block">
                <ConfirmationNumberIcon />
                <div>
                  <span className="v-label">Booking reference (PNR)</span>
                  <span className="v-value-highlight">{reference}</span>
                </div>
              </div>

              <div className="voucher-info-block">
                <FlightTakeoffIcon />
                <div>
                  <span className="v-label">Route</span>
                  <span className="v-value">{booking?.tourName ?? "Flight itinerary"}</span>
                </div>
              </div>

              <div className="voucher-info-block">
                <PersonIcon />
                <div>
                  <span className="v-label">Passengers</span>
                  <span className="v-value">
                    {booking?.meta?.passengers ?? 1}{" "}
                    {(booking?.meta?.passengers ?? 1) === 1 ? "passenger" : "passengers"}
                  </span>
                </div>
              </div>
            </div>

            {segments.length > 0 && (
              <>
                <div className="voucher-divider-dashed" />
                <div className="fvoucher-legs">
                  {legGroups.map((group) => (
                    <div className="fvoucher-group" key={group.id}>
                      {legGroups.length > 1 && (
                        <p className="fvoucher-group-label">{group.label}</p>
                      )}
                      {group.list.map((segment, index) => (
                        <div className="fvoucher-leg" key={segment?.segmentKey ?? `${group.id}-${index}`}>
                          <span className="fvoucher-leg-date">
                            {formatDateShort(segment?.departureTime)}
                          </span>
                          <span className="fvoucher-leg-route">
                            {segment?.originCode} → {segment?.destinationCode}
                          </span>
                          <span className="fvoucher-leg-time">
                            {formatTimeHM(segment?.departureTime)} –{" "}
                            {formatTimeHM(segment?.arrivalTime)}
                          </span>
                          <span className="fvoucher-leg-flight">
                            {[segment?.carrierName || segment?.carrier, segment?.flightNumber]
                              .filter(Boolean)
                              .join(" ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}

            {services.length > 0 && (
              <>
                <div className="voucher-divider-dashed" />
                <div className="fvoucher-extras">
                  <p className="fvoucher-group-label">Seats & baggage</p>
                  {services.map((service, index) => (
                    <div
                      className="pricing-ticket-row"
                      key={`${service?.serviceId ?? "service"}-${index}`}
                    >
                      <span>
                        {[segmentLabels.get(service?.segmentKey), service?.name || "Extra service"]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      <span>
                        {Number(service?.price) > 0
                          ? `${service?.currency || currency} ${Number(
                              service.price,
                            ).toFixed(2)}`
                          : "Included"}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="voucher-divider-dashed" />

            <div className="voucher-footer-pricing">
              <div className="pricing-ticket-row">
                <span>Status</span>
                <span className="green-status-text">{booking?.status ?? "CONFIRMED"}</span>
              </div>
              {breakdown ? (
                <>
                  <div className="pricing-ticket-row">
                    <span>Tickets</span>
                    <span>
                      {money(
                        breakdown.hasSplit ? breakdown.base : breakdown.subtotal,
                      )}
                    </span>
                  </div>
                  {Number(breakdown.taxes) > 0 ? (
                    <div className="pricing-ticket-row">
                      <span>Taxes, fees & charges</span>
                      <span>{money(breakdown.taxes)}</span>
                    </div>
                  ) : null}
                  {Number(breakdown.serviceFee) > 0 ? (
                    <div className="pricing-ticket-row">
                      <span>Service fee</span>
                      <span>{money(breakdown.serviceFee)}</span>
                    </div>
                  ) : null}
                  {Number(breakdown.seats) > 0 ? (
                    <div className="pricing-ticket-row">
                      <span>Seats</span>
                      <span>{money(breakdown.seats)}</span>
                    </div>
                  ) : null}
                  {Number(breakdown.baggage) > 0 ? (
                    <div className="pricing-ticket-row">
                      <span>Baggage</span>
                      <span>{money(breakdown.baggage)}</span>
                    </div>
                  ) : null}
                </>
              ) : null}
              <div className="pricing-ticket-row final-grand-total">
                <span>Total Charge</span>
                <span>{money(booking?.total ?? breakdown?.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="confirmation-action-buttons">
          <button
            type="button"
            className="primary-action-nav-btn"
            onClick={() => navigate("/profile?tab=bookings")}
          >
            Go to My Bookings
          </button>
          <button
            type="button"
            className="secondary-action-nav-btn"
            onClick={() => navigate("/flights")}
          >
            Book More Flights <ArrowForwardIcon />
          </button>
        </div>
      </div>
    </main>
  );
};

export default FlightConfirmation;
