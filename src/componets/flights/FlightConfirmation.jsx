import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import PersonIcon from "@mui/icons-material/Person";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PageLoader from "../loaders/PageLoader";
import { flightsBookingService } from "../../services/flights/flightBookingService";
import { formatDateShort, formatTimeHM } from "../../utils/flightFormatters";
import "./style.css";

const FlightConfirmation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId") || "";

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [soldOut, setSoldOut] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

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
      try {
        const summary = await flightsBookingService.bookFlight({ sessionId });
        if (!cancelled) setBooking(summary);
      } catch (err) {
        if (cancelled) return;
        if (err?.code === "UNAUTHORIZED") {
          navigate("/login", {
            state: { from: `/flightconfirmation?sessionId=${sessionId}` },
          });
          return;
        }
        if (err?.code === "OFFER_SOLD_OUT") setSoldOut(true);
        setError(
          err?.code === "INVALID_STATE"
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
  }, [sessionId, navigate, reloadKey]);

  if (loading) {
    return <PageLoader text="Confirming your booking and printing ticket..." />;
  }

  if (error) {
    return (
      <main className="confirmation-main-content">
        <div className="fpage-status form-card-ui animate-fade-in">
          <div className="error-banner">
            <p>{error}</p>
          </div>
          <div className="confirmation-action-buttons">
            {!soldOut && (
              <button
                type="button"
                className="primary-action-nav-btn"
                onClick={() => setReloadKey((key) => key + 1)}
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

  // Round-trip: сегменты по направлениям (Outbound/Return); one-way — одна группа без лейбла
  const legGroups = [
    { id: "outbound", label: "Outbound", list: segments.filter((s) => s?.direction !== "INBOUND") },
    { id: "inbound", label: "Return", list: segments.filter((s) => s?.direction === "INBOUND") },
  ].filter((group) => group.list.length > 0);

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

            <div className="voucher-divider-dashed" />

            <div className="voucher-footer-pricing">
              <div className="pricing-ticket-row">
                <span>Status</span>
                <span className="green-status-text">{booking?.status ?? "CONFIRMED"}</span>
              </div>
              <div className="pricing-ticket-row final-grand-total">
                <span>Total Charge</span>
                <span>
                  {Number(booking?.total || 0).toFixed(2)} {booking?.currency ?? "AED"}
                </span>
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
