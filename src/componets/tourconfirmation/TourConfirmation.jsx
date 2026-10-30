import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  ChevronLeft,
  ErrorOutlineOutlined,
  HourglassTop,
  Refresh,
} from "@mui/icons-material";
import PageLoader from "../loaders/PageLoader";
import { useSyncTourPayment } from "../../hooks/mutations/useTourPayment";
import { useTourPaymentStatus } from "../../hooks/queries/useTourPayment";
import { formatAed, formatTourTime } from "../../utils/tourCheckout";
import "./style.css";

const guestSummary = (prebooking) => {
  const adult = Math.max(0, Number(prebooking.adult) || 0);
  const child = Math.max(0, Number(prebooking.child) || 0);
  const infant = Math.max(0, Number(prebooking.infant) || 0);
  const parts = [`${adult} adult${adult === 1 ? "" : "s"}`];

  if (child > 0) parts.push(`${child} child${child === 1 ? "" : "ren"}`);
  if (infant > 0) parts.push(`${infant} infant${infant === 1 ? "" : "s"}`);

  return parts.join(" · ");
};

const DetailRow = ({ label, children }) => (
  <div className="tconfirmation-detail-row">
    <span>{label}</span>
    <strong>{children}</strong>
  </div>
);

const TourConfirmation = ({ prebookingId }) => {
  const navigate = useNavigate();
  const {
    mutate: syncPayment,
    isSuccess: syncSucceeded,
    isError: syncFailed,
    error: syncError,
  } = useSyncTourPayment();

  useEffect(() => {
    if (prebookingId) syncPayment(prebookingId);
  }, [prebookingId, syncPayment]);

  const syncDone = syncSucceeded || syncFailed;
  const syncErrorMessage = syncError?.message || "";
  const statusQuery = useTourPaymentStatus(prebookingId, {
    enabled: Boolean(prebookingId) && syncDone,
  });
  const prebooking = statusQuery.data?.prebooking ?? null;
  const statusErrorMessage = statusQuery.error?.message || "";
  const confirmErrorMessage = syncErrorMessage || statusErrorMessage;

  if (!prebookingId) {
    return (
      <main className="checkout-main-content tcheckout-page tconfirmation-page">
        <div className="tconfirmation-state form-card-ui">
          <div className="error-banner">
            <p>Pre-booking reference is missing.</p>
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

  if (!syncDone || (statusQuery.isLoading && !prebooking)) {
    return (
      <main className="checkout-main-content tcheckout-page tconfirmation-page">
        <div className="tconfirmation-state">
          <PageLoader embedded text="Confirming your payment..." />
        </div>
      </main>
    );
  }

  if (!prebooking) {
    return (
      <main className="checkout-main-content tcheckout-page tconfirmation-page">
        <div className="tconfirmation-state form-card-ui">
          <div className="error-banner">
            <p>
              {confirmErrorMessage || "We could not load your booking."}
            </p>
          </div>
          <div className="tconfirmation-actions">
            <button
              type="button"
              className="action-submit-btn"
              onClick={() => syncPayment(prebookingId)}
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

  const paymentStatus = prebooking.paymentStatus;
  const isPaid = paymentStatus === "paid";
  const isFailed = paymentStatus === "failed";
  const isRefunded = paymentStatus === "refunded";
  const isInactive =
    prebooking.status === "cancelled" || prebooking.status === "expired";
  const canRetry = isFailed && !isInactive;
  const paymentTotal = Number(prebooking.paymentTotal ?? prebooking.total);
  const paymentFee = Math.max(0, Number(prebooking.paymentFee) || 0);
  const hasPaymentFee =
    paymentFee > 0 && paymentTotal > Number(prebooking.total);

  if (isPaid) {
    return (
      <main className="checkout-main-content tcheckout-page tconfirmation-page">
        <div className="tconfirmation-wrap">
          <div className="form-card-ui tconfirmation-card">
            <div className="tconfirmation-icon tconfirmation-icon-success">
              <CheckCircle />
            </div>
            <div className="step-badge">Step 3 of 3</div>
            <h1 className="page-main-title">Payment received</h1>
            <p className="tconfirmation-copy">
              Your payment was successful. Our team will now confirm the tour
              with the provider and update your booking.
            </p>

            <div className="tconfirmation-details">
              <DetailRow label="Reference">{prebooking.reference}</DetailRow>
              <DetailRow label="Tour">{prebooking.tourName}</DetailRow>
              <DetailRow label="Tour date">{prebooking.tourDate}</DetailRow>
              <DetailRow label="Start time">
                {formatTourTime(prebooking.startTime)}
              </DetailRow>
              <DetailRow label="Guests">{guestSummary(prebooking)}</DetailRow>
              <DetailRow label="Service total">
                {formatAed(prebooking.total)}
              </DetailRow>
              {hasPaymentFee ? (
                <DetailRow label="Payment fee">{formatAed(paymentFee)}</DetailRow>
              ) : null}
              <DetailRow label="Paid">{formatAed(paymentTotal)}</DetailRow>
              <DetailRow label="Status">Pending provider confirmation</DetailRow>
            </div>

            <p className="tconfirmation-note">
              Keep your reference for support. A receipt is available on
              request.
            </p>

            <div className="tconfirmation-actions">
              <button
                type="button"
                className="action-submit-btn"
                onClick={() => navigate("/profile")}
              >
                View my bookings
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
        </div>
      </main>
    );
  }

  if (isRefunded) {
    return (
      <main className="checkout-main-content tcheckout-page tconfirmation-page">
        <div className="tconfirmation-wrap">
          <div className="form-card-ui tconfirmation-card">
            <div className="tconfirmation-icon tconfirmation-icon-info">
              <CheckCircle />
            </div>
            <div className="step-badge">Step 3 of 3</div>
            <h1 className="page-main-title">Payment refunded</h1>
            <p className="tconfirmation-copy">
              This payment has been refunded. Our team can help you with a new
              booking if needed.
            </p>
            <div className="tconfirmation-actions">
              <button
                type="button"
                className="action-submit-btn"
                onClick={() => navigate("/tours")}
              >
                Back to tours
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isFailed || isInactive) {
    return (
      <main className="checkout-main-content tcheckout-page tconfirmation-page">
        <div className="tconfirmation-wrap">
          <div className="form-card-ui tconfirmation-card">
            <div className="tconfirmation-icon tconfirmation-icon-error">
              <ErrorOutlineOutlined />
            </div>
            <div className="step-badge">Step 3 of 3</div>
            <h1 className="page-main-title">Payment not completed</h1>
            <p className="tconfirmation-copy">
              {isInactive
                ? "This pre-booking is no longer active. Please start a new booking."
                : "Your payment was not completed. You can try the payment again."}
            </p>

            <div className="tconfirmation-details">
              <DetailRow label="Reference">{prebooking.reference}</DetailRow>
              <DetailRow label="Tour">{prebooking.tourName}</DetailRow>
              <DetailRow label="Total">{formatAed(paymentTotal)}</DetailRow>
            </div>

            <div className="tconfirmation-actions">
              {canRetry ? (
                <button
                  type="button"
                  className="action-submit-btn"
                  onClick={() => navigate(`/tourpayment/${prebooking.id}`)}
                >
                  Try payment again
                </button>
              ) : null}
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
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-main-content tcheckout-page tconfirmation-page">
      <div className="tconfirmation-wrap">
        <div className="form-card-ui tconfirmation-card">
          <div className="tconfirmation-icon tconfirmation-icon-pending">
            <HourglassTop />
          </div>
          <div className="step-badge">Step 3 of 3</div>
          <h1 className="page-main-title">Confirming payment</h1>
          <p className="tconfirmation-copy">
            We are waiting for the payment provider to confirm your transaction.
            This usually takes a few seconds.
          </p>

          {confirmErrorMessage ? (
            <div className="error-banner">
              <p>{confirmErrorMessage}</p>
            </div>
          ) : null}

          <div className="tconfirmation-details">
            <DetailRow label="Reference">{prebooking.reference}</DetailRow>
            <DetailRow label="Tour">{prebooking.tourName}</DetailRow>
            <DetailRow label="Total">{formatAed(paymentTotal)}</DetailRow>
            <DetailRow label="Payment status">
              {paymentStatus === "processing" ? "Processing" : "Awaiting confirmation"}
            </DetailRow>
          </div>

          <div className="tconfirmation-actions">
            <button
              type="button"
              className="action-submit-btn"
              onClick={() => statusQuery.refetch()}
            >
              <Refresh />
              Refresh status
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
      </div>
    </main>
  );
};

export default TourConfirmation;

