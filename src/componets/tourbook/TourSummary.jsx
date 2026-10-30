import {
  AccessTime,
  DirectionsCar,
  Event,
  People,
  Place,
} from "@mui/icons-material";
import {
  formatAed,
  formatTourTime,
  getTourB2cPricing,
  transferLabel,
  transferTypeOf,
} from "../../utils/tourCheckout";

const guestLabel = (count, singular, plural) =>
  `${count} ${count === 1 ? singular : plural}`;

const TourSummary = ({ item, paymentTotal }) => {
  const pricing = getTourB2cPricing(item);
  const totalToPay =
    paymentTotal != null && Number.isFinite(Number(paymentTotal))
      ? Number(paymentTotal)
      : pricing.total;
  const fee = Math.max(0, totalToPay - pricing.total);
  const hasFee = fee > 0;
  const transferType = transferTypeOf(item);
  const adult = Math.max(0, Number(item.adult) || 0);
  const child = Math.max(0, Number(item.child) || 0);
  const infant = Math.max(0, Number(item.infant) || 0);
  const startTime = item.slotTime || item.startTime || item.tourTime;
  const city = item.city || item.tourCity || "";
  const country = item.country || "";

  return (
    <div className="checkout-right-panel">
      <div className="sticky-summary-card">
        <div className="summary-card-body">
          {item.tourImage ? (
            <div className="tcheckout-summary-image">
              <img src={item.tourImage} alt={item.tourName || "Tour"} />
            </div>
          ) : null}

          <h3 className="summary-hotel-name">{item.tourName || "Tour"}</h3>

          {city ? (
            <p className="tcheckout-summary-location">
              <Place fontSize="small" />
              <span>
                {city}
                {country ? `, ${country}` : ""}
              </span>
            </p>
          ) : null}

          <div className="summary-meta-grid">
            <div className="meta-icon-row">
              <Event />
              <div>
                <span className="meta-label">Tour date</span>
                <span className="meta-value">{item.tourDate || "—"}</span>
              </div>
            </div>

            <div className="meta-icon-row">
              <AccessTime />
              <div>
                <span className="meta-label">Start time</span>
                <span className="meta-value">{formatTourTime(startTime)}</span>
              </div>
            </div>

            <div className="meta-icon-row">
              <People />
              <div>
                <span className="meta-label">Guests</span>
                <span className="meta-value">
                  {guestLabel(adult, "adult", "adults")}
                  {child > 0 ? ` · ${guestLabel(child, "child", "children")}` : ""}
                  {infant > 0 ? ` · ${guestLabel(infant, "infant", "infants")}` : ""}
                </span>
              </div>
            </div>

            <div className="meta-icon-row">
              <DirectionsCar />
              <div>
                <span className="meta-label">Transfer</span>
                <span className="meta-value">
                  {transferLabel(transferType)}
                  {transferType === "other" && item.transferName
                    ? ` · ${item.transferName}`
                    : ""}
                </span>
              </div>
            </div>
          </div>

          <div className="summary-price-breakdown-divider" />

          <div className="tcheckout-price-list">
            <div className="tcheckout-price-row">
              <span>{guestLabel(adult, "Adult", "Adults")}</span>
              <span>{formatAed(pricing.adultTotal)}</span>
            </div>
            {child > 0 ? (
              <div className="tcheckout-price-row">
                <span>{guestLabel(child, "Child", "Children")}</span>
                <span>{formatAed(pricing.childTotal)}</span>
              </div>
            ) : null}
            {infant > 0 ? (
              <div className="tcheckout-price-row">
                <span>{guestLabel(infant, "Infant", "Infants")}</span>
                <span>Included</span>
              </div>
            ) : null}
          </div>

          <div className="summary-price-breakdown-divider" />

          {hasFee ? (
            <>
              <div className="tcheckout-price-row">
                <span>Service total</span>
                <span>{formatAed(pricing.total)}</span>
              </div>
              <div className="tcheckout-price-row">
                <span>Payment fee</span>
                <span>{formatAed(fee)}</span>
              </div>
              <div className="tcheckout-total-row">
                <span>Total to pay</span>
                <strong>{formatAed(totalToPay)}</strong>
              </div>
            </>
          ) : (
            <div className="tcheckout-total-row">
              <span>Total</span>
              <strong>{formatAed(pricing.total)}</strong>
            </div>
          )}

          <p className="tcheckout-summary-note">
            {hasFee ? "Payment fee covers card processing costs. " : ""}
            Our team confirms availability with the tour provider after payment.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TourSummary;
