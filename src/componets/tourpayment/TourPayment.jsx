import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { ChevronLeft, Lock } from "@mui/icons-material";
import PageLoader from "../loaders/PageLoader";
import TourSummary from "../tourbook/TourSummary";
import { useTourPaymentIntent } from "../../hooks/queries/useTourPayment";
import {
  clearTourCheckoutItem,
  formatAed,
} from "../../utils/tourCheckout";
import "../tourbook/style.css";
import "./style.css";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey
  ? loadStripe(publishableKey, {
      developerTools: {
        assistant: { enabled: false },
      },
    })
  : null;

const summaryItemFromPrebooking = (prebooking) => ({
  tourId: prebooking.tourId,
  tourName: prebooking.tourName,
  tourImage: prebooking.tourImage,
  city: prebooking.tourCity,
  tourDate: prebooking.tourDate,
  startTime: prebooking.startTime,
  adult: prebooking.adult,
  child: prebooking.child,
  infant: prebooking.infant,
  transferId: prebooking.transferId,
  transferType: prebooking.transferType,
  transferName: prebooking.transferName,
  adultb2c: prebooking.adultRateB2c,
  childb2c: prebooking.childRateB2c,
  b2cTotal: prebooking.total,
});

const PaymentForm = ({ prebooking, onPaid }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || submitting) return;

    setError("");
    setSubmitting(true);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || "Please check your payment details.");
        return;
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/tourconfirmation?prebookingId=${prebooking.id}`,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message || "Payment failed. Please try again.");
        return;
      }

      if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
        onPaid();
        return;
      }

      if (paymentIntent?.status === "requires_action" && paymentIntent.client_secret) {
        const { error: actionError } = await stripe.handleNextAction({
          clientSecret: paymentIntent.client_secret,
        });
        if (actionError) {
          setError(actionError.message || "Additional authentication failed.");
          return;
        }
        onPaid();
        return;
      }

      setError("Payment was not completed. Please try again.");
    } catch (err) {
      setError(err?.message || "Payment failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="tpayment-form" onSubmit={handleSubmit} noValidate>
      <div className="form-card-ui tpayment-card">
        <div className="form-card-header">
          <div className="step-badge">Step 2 of 3</div>
          <h2>Card payment</h2>
          <p>
            Pay securely for your tour. Our team confirms availability with the
            provider after payment.
          </p>
        </div>

        <div className="payment-gateway-wrapper">
          <div id="tour-payment-target" className="payment-box tpayment-element">
            <PaymentElement />
          </div>
        </div>

        {error ? (
          <div className="error-banner">
            <span className="error-icon">!</span>
            <p>{error}</p>
          </div>
        ) : null}

        <button
          type="submit"
          className="action-submit-btn tpayment-submit"
          disabled={!stripe || submitting}
        >
          {submitting
            ? "Processing payment..."
            : `Pay ${formatAed(prebooking.paymentTotal ?? prebooking.total)}`}
        </button>

        <div className="secure-badge-info">
          <Lock />
          <span>Payments are encrypted and processed by Stripe.</span>
        </div>
      </div>
    </form>
  );
};

const TourPayment = ({ prebookingId }) => {
  const navigate = useNavigate();
  const intentQuery = useTourPaymentIntent(prebookingId);
  const [paid, setPaid] = useState(false);

  const prebooking = intentQuery.data?.prebooking ?? null;
  const clientSecret = intentQuery.data?.clientSecret ?? null;
  const alreadyPaid = Boolean(
    intentQuery.data?.paid ||
      prebooking?.paymentStatus === "paid" ||
      prebooking?.status === "confirmed",
  );

  const summaryItem = useMemo(
    () => (prebooking ? summaryItemFromPrebooking(prebooking) : null),
    [prebooking],
  );

  useEffect(() => {
    if (!paid && !alreadyPaid) return;
    clearTourCheckoutItem();
    navigate(`/tourconfirmation?prebookingId=${prebookingId}`, { replace: true });
  }, [alreadyPaid, navigate, paid, prebookingId]);

  if (intentQuery.isLoading) {
    return (
      <main className="checkout-main-content tcheckout-page tpayment-page">
        <div className="tpayment-state">
          <PageLoader embedded text="Preparing secure payment..." />
        </div>
      </main>
    );
  }

  if (intentQuery.error) {
    return (
      <main className="checkout-main-content tcheckout-page tpayment-page">
        <div className="tpayment-state form-card-ui">
          <div className="error-banner">
            <p>{intentQuery.error.message || "Could not start payment."}</p>
          </div>
          <div className="tpayment-state-actions">
            <button
              type="button"
              className="action-submit-btn"
              onClick={() => intentQuery.refetch()}
            >
              Try again
            </button>
            <button
              type="button"
              className="back-nav-btn"
              onClick={() => navigate("/tours")}
            >
              <ChevronLeft />
              <span>Back to tours</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!prebooking || !summaryItem) {
    return (
      <main className="checkout-main-content tcheckout-page tpayment-page">
        <div className="tpayment-state form-card-ui">
          <div className="error-banner">
            <p>Pre-booking not found. Please start checkout again.</p>
          </div>
          <button
            type="button"
            className="action-submit-btn"
            onClick={() => navigate("/tours")}
          >
            Back to tours
          </button>
        </div>
      </main>
    );
  }

  if (paid || alreadyPaid) {
    return (
      <main className="checkout-main-content tcheckout-page tpayment-page">
        <div className="tpayment-state">
          <PageLoader embedded text="Payment received. Opening confirmation..." />
        </div>
      </main>
    );
  }

  if (!publishableKey) {
    return (
      <main className="checkout-main-content tcheckout-page tpayment-page">
        <div className="tpayment-state form-card-ui">
          <div className="error-banner">
            <p>Stripe publishable key is not configured.</p>
          </div>
          <button
            type="button"
            className="action-submit-btn"
            onClick={() => navigate("/tours")}
          >
            Back to tours
          </button>
        </div>
      </main>
    );
  }

  if (!clientSecret) {
    return (
      <main className="checkout-main-content tcheckout-page tpayment-page">
        <div className="tpayment-state form-card-ui">
          <div className="error-banner">
            <p>Payment session is not available. Please try again.</p>
          </div>
          <button
            type="button"
            className="action-submit-btn"
            onClick={() => intentQuery.refetch()}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-main-content tcheckout-page tpayment-page">
      <div className="checkout-layout-container">
        <div className="checkout-left-panel fcheckout-panel">
          <button
            type="button"
            className="back-nav-btn"
            onClick={() => navigate("/tours")}
          >
            <ChevronLeft />
            <span>Back to tours</span>
          </button>

          <h1 className="page-main-title">Secure Payment</h1>

          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#3a86ff",
                  borderRadius: "8px",
                },
              },
            }}
          >
            <PaymentForm
              prebooking={prebooking}
              onPaid={() => setPaid(true)}
            />
          </Elements>
        </div>

        <TourSummary
          item={summaryItem}
          paymentTotal={prebooking.paymentTotal}
        />
      </div>
    </main>
  );
};

export default TourPayment;
