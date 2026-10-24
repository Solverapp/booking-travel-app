import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import PeopleIcon from "@mui/icons-material/People";
import EventIcon from "@mui/icons-material/Event";
import SecurityIcon from "@mui/icons-material/Security";
import PageLoader from "../loaders/PageLoader";
import FlightAmenities from "./FlightAmenities";
import FlightPriceBreakdown from "./FlightPriceBreakdown";
import { useFlightSession } from "../../hooks/queries/useFlightSession";
import { formatDateShort } from "../../utils/flightFormatters";
import { legsOf, segmentLabelsByKey } from "../../utils/flightJourneys";
import { offerBaggage } from "../../utils/flightOffers";
import {
  buildPriceBreakdown,
  passengerCountLabel,
} from "../../utils/flightPricing";
import "./style.css";

const countsOf = (searchParams) => ({
  adults: Math.max(1, Number(searchParams?.adults) || 1),
  children: Math.max(0, Number(searchParams?.children) || 0),
  infants: Math.max(0, Number(searchParams?.infants) || 0),
});

const FlightCheckout = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const sessionQuery = useFlightSession(sessionId);
  const session = sessionQuery.data?.session ?? null;
  const loading = sessionQuery.isLoading;
  const ready = session?.status === "PREBOOKED" && Boolean(session.secretKey);
  const redirectTo =
    session?.status === "CONFIRMED"
      ? `/flightconfirmation?sessionId=${sessionId}`
      : session?.status === "VERIFIED"
        ? `/flightpage/${sessionId}`
        : "";
  const statusError =
    sessionQuery.error?.message ||
    (!session
      ? "Booking session not found"
      : session.status === "BOOKING"
        ? "Your booking is being processed. Check My Bookings in a moment."
        : !ready
          ? "This booking session can no longer be paid"
          : "");

  useEffect(() => {
    if (redirectTo) navigate(redirectTo, { replace: true });
  }, [redirectTo, navigate]);

  useEffect(() => {
    if (!ready || !session?.secretKey) return undefined;

    const script = document.createElement("script");
    script.src = "https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1";
    script.async = true;
    script.onload = () => {
      const container = document.getElementById("flight-payment-target");
      if (!container || !window.LiteAPIPayment) return;

      const config = {
        publicKey: "sandbox",
        secretKey: session.secretKey,
        returnUrl: `${window.location.origin}/flightconfirmation?sessionId=${sessionId}`,
        targetElement: "#flight-payment-target",
        appearance: { theme: "flat" },
        options: {
          business: { name: "Solver Flights" },
        },
      };

      const payment = new window.LiteAPIPayment(config);
      payment.handlePayment();
    };
    document.body.appendChild(script);

    return () => {
      const scriptEl = document.querySelector('script[src*="liteAPIPayment"]');
      if (scriptEl) scriptEl.remove();
    };
  }, [ready, session, sessionId]);

  if (loading || redirectTo) {
    return <PageLoader text="Preparing secure payment..." />;
  }

  if (statusError) {
    return (
      <main className="checkout-main-content">
        <div className="fpage-status form-card-ui animate-fade-in">
          <div className="error-banner">
            <p>{statusError}</p>
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

  const journey = session?.verified?.journey ?? null;
  const legs = journey ? legsOf(journey) : [];
  const counts = countsOf(session?.searchParams);
  const currency = session?.currency || "AED";
  const segmentLabels = segmentLabelsByKey(journey?.segments);
  const fareFamily = journey?.fare?.family ?? "";
  const baggage = offerBaggage({ baggage: journey?.baggage });
  const priceBreakdown = buildPriceBreakdown({
    journey,
    breakdown: session?.priceBreakdown,
    counts,
    currency,
  });
  const selectedServices = Array.isArray(session?.bookedServices)
    ? session.bookedServices
    : [];
  // Маршрут — по первому направлению (для round-trip «туда», а не «туда→обратно→туда»)
  const outboundLeg = legs[0] ?? [];
  const firstSegment = outboundLeg[0] ?? {};
  const lastSegment = outboundLeg[outboundLeg.length - 1] ?? {};
  const routeTitle = `${firstSegment?.originCode ?? "—"} → ${
    lastSegment?.destinationCode ?? "—"
  }`;

  return (
    <main className="checkout-main-content">
      <div className="checkout-layout-container">
        <div className="checkout-left-panel fcheckout-panel">
          <button
            type="button"
            className="back-nav-btn"
            onClick={() => navigate(`/flightseats/${sessionId}`)}
          >
            <ChevronLeftIcon />
            <span>Back to seats & baggage</span>
          </button>

          <h1 className="page-main-title">Secure Payment</h1>

          <div className="form-card-ui animate-fade-in">
            <div className="form-card-header">
              <div className="step-badge">Step 3 of 3</div>
              <h2>Payment</h2>
              <p>Please complete your transaction details below.</p>
            </div>

            <div className="payment-gateway-wrapper">
              <div id="flight-payment-target" className="payment-box flight-payment-box"></div>
            </div>

            <div className="secure-badge-info">
              <SecurityIcon />
              <span>Your connection is fully secure and encrypted.</span>
            </div>
          </div>
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
                    <span className="meta-label">Trip type</span>
                    <span className="meta-value">
                      {legs.length > 1 ? "Round trip" : "One way"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="summary-price-breakdown-divider" />

              <FlightPriceBreakdown
                breakdown={priceBreakdown}
                fareFamily={fareFamily}
                counts={counts}
              />

              <div className="summary-price-breakdown-divider" />

              <div className="fcheckout-extras">
                <h4 className="fcheckout-extras-title">Seats & baggage</h4>
                {selectedServices.length > 0 ? (
                  <ul className="fcheckout-extras-list">
                    {selectedServices.map((service, index) => (
                      <li key={`${service.serviceId}-${index}`}>
                        <span>
                          {[segmentLabels.get(service.segmentKey), service.name || "Extra service"]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                        {Number(service.price) > 0 ? (
                          <span>
                            {service.currency || currency}{" "}
                            {Number(service.price).toFixed(2)}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="fcheckout-extras-empty">No extras selected.</p>
                )}
              </div>

              <div className="summary-price-breakdown-divider" />

              <FlightAmenities
                amenities={[]}
                baggage={baggage}
                title="Baggage"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default FlightCheckout;
