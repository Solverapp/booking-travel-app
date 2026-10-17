import ChevronRight from "@mui/icons-material/ChevronRight";
import {
  formatBookingDate,
  formatMoney,
  normalizeStatus,
  serviceMeta,
  statusLabel,
} from "./bookingUtils";
import "./style.css";

const BookingCard = ({ booking, onOpen }) => {
  const meta = serviceMeta(booking.Service);
  const Icon = meta.icon;
  const status = normalizeStatus(booking.status);

  return (
    <button type="button" className="booking-card" onClick={() => onOpen(booking)}>
      <span className={`booking-card-icon ${meta.tint}`}>
        <Icon fontSize="inherit" />
      </span>

      <span className="booking-card-main">
        <span className="booking-card-name">{booking.name || meta.label}</span>
        <span className="booking-card-meta">
          {booking.reference ? (
            <span className="booking-card-ref">{booking.reference}</span>
          ) : null}
          <span>{meta.label}</span>
          {booking.created_at ? <span>{formatBookingDate(booking.created_at)}</span> : null}
        </span>
      </span>

      <span className="booking-card-side">
        <span className={`status-badge is-${status}`}>{statusLabel(booking.status)}</span>
        <strong className="booking-card-sum">
          {formatMoney(booking.sum, booking.currency)}
        </strong>
      </span>

      <span className="booking-card-arrow">
        <ChevronRight fontSize="inherit" />
      </span>
    </button>
  );
};

export default BookingCard;
