import { formatPrice } from "../../utils/flightFormatters";
import { passengerCountLabel } from "../../utils/flightPricing";

const FlightPriceBreakdown = ({ breakdown, fareFamily, counts }) => {
  if (!breakdown) return null;

  const currency = breakdown.currency || "AED";
  const money = (value) => `${currency} ${formatPrice(value)}`;
  const passengers = counts ? passengerCountLabel(counts) : "";
  const ticketLabel = ["Tickets", fareFamily, passengers ? `· ${passengers}` : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="price-summary-table fprice-breakdown">
      <div className="price-row">
        <span>{ticketLabel}</span>
        <span>{money(breakdown.hasSplit ? breakdown.base : breakdown.subtotal)}</span>
      </div>

      {breakdown.hasSplit && breakdown.taxes > 0 ? (
        <div className="price-row">
          <span>Taxes, fees & charges</span>
          <span>{money(breakdown.taxes)}</span>
        </div>
      ) : null}

      {breakdown.hasSplit && breakdown.serviceFee > 0 ? (
        <div className="price-row">
          <span>Service fee</span>
          <span>{money(breakdown.serviceFee)}</span>
        </div>
      ) : null}

      {breakdown.seats > 0 ? (
        <div className="price-row">
          <span>Seats</span>
          <span>{money(breakdown.seats)}</span>
        </div>
      ) : null}

      {breakdown.baggage > 0 ? (
        <div className="price-row">
          <span>Baggage</span>
          <span>{money(breakdown.baggage)}</span>
        </div>
      ) : null}

      {!breakdown.hasSplit ? (
        <div className="price-row">
          <span>Taxes & fees</span>
          <span className="green-text">Included</span>
        </div>
      ) : null}

      <div className="price-row total-row-highlight">
        <span>Total amount</span>
        <span>{money(breakdown.total)}</span>
      </div>
    </div>
  );
};

export default FlightPriceBreakdown;
