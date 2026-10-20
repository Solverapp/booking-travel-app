import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import PeopleIcon from "@mui/icons-material/People";
import EventIcon from "@mui/icons-material/Event";
import SecurityIcon from "@mui/icons-material/Security";
import PageLoader from "../loaders/PageLoader";
import { flightsBookingService } from "../../services/flights/flightBookingService";
import { formatDateShort } from "../../utils/flightFormatters";
import { legsOf } from "../../utils/flightJourneys";
import "./style.css";

const countsOf = (searchParams) => ({
  adults: Math.max(1, Number(searchParams?.adults) || 1),
  children: Math.max(0, Number(searchParams?.children) || 0),
  infants: Math.max(0, Number(searchParams?.infants) || 0),
});

const FlightCheckout = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setStatusError("");
      try {
        const data = await flightsBookingService.getFlightSession(sessionId);
        if (cancelled) return;
        const next = data?.session ?? null;
        if (!next) throw new Error("Booking session not found");

        if (next.status === "CONFIRMED") {
          navigate(`/flightconfirmation?sessionId=${sessionId}`, { replace: true });
          return;
        }
        if (next.status === "VERIFIED") {
          navigate(`/flightpage/${sessionId}`, { replace: true });
          return;
        }
        if (next.status === "PREBOOKED" && next.secretKey) {
          setSession(next);
          setReady(true);
          return;
        }
        if (next.status === "BOOKING") {
          setStatusError("Your booking is being processed. Check My Bookings in a moment.");
          return;
        }
        throw new Error("This booking session can no longer be paid");
      } catch (err) {
        if (!cancelled) {
          if (err?.code === "UNAUTHORIZED") {
            navigate("/login", { state: { from: `/flightcheckout/${sessionId}` } });
            return;
          }
          setStatusError(err?.message || "Failed to load booking session");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate]);

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

  if (loading) {
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
  const price = Number(session?.verifiedPrice) || 0;
  const currency = session?.currency || "AED";
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
          <button type="button" className="back-nav-btn" onClick={() => navigate("/flights")}>
            <ChevronLeftIcon />
            <span>Back to search results</span>
          </button>

          <h1 className="page-main-title">Secure Payment</h1>

          <div className="form-card-ui animate-fade-in">
            <div className="form-card-header">
              <div className="step-badge">Step 2 of 2</div>
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
                      {counts.adults} adults
                      {counts.children > 0 ? ` · ${counts.children} children` : ""}
                      {counts.infants > 0 ? ` · ${counts.infants} infants` : ""}
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

              <div className="price-summary-table">
                <div className="price-row">
                  <span>Subtotal</span>
                  <span>
                    {price.toFixed(2)} {currency}
                  </span>
                </div>
                <div className="price-row">
                  <span>Taxes & Fees</span>
                  <span className="green-text">Included</span>
                </div>
                <div className="price-row total-row-highlight">
                  <span>Total amount</span>
                  <span>
                    {price.toFixed(2)} {currency}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default FlightCheckout;
