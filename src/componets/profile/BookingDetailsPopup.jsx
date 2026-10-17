import { useEffect, useRef } from "react";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import ConfirmationNumberOutlined from "@mui/icons-material/ConfirmationNumberOutlined";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import RestoreOutlined from "@mui/icons-material/RestoreOutlined";
import BottomSheet from "../bottomsheet/BottomSheet";
import useMediaQuery from "../../utils/useMediaQuery";
import { formatTimeHM } from "../../utils/flightFormatters";
import {
  formatBookingDate,
  formatMoney,
  formatPolicyDeadline,
  formatSegmentStamp,
  normalizeStatus,
  serviceMeta,
  statusLabel,
} from "./bookingUtils";
import "./style.css";

const groupSegments = (segments) => {
  const outbound = segments.filter((segment) => segment?.direction !== "INBOUND");
  const inbound = segments.filter((segment) => segment?.direction === "INBOUND");
  const groups = [];
  if (outbound.length) groups.push({ id: "outbound", label: "Outbound", list: outbound });
  if (inbound.length) groups.push({ id: "inbound", label: "Return", list: inbound });
  return groups;
};

const BookingDetails = ({ booking }) => {
  const meta = booking.meta ?? {};
  const segments = Array.isArray(meta.segments) ? meta.segments : [];
  const groups = groupSegments(segments);
  const service = serviceMeta(booking.Service);
  const Icon = service.icon;
  const status = normalizeStatus(booking.status);

  const rows = [
    ["Reference", booking.reference || meta.bookingRef || null],
    ["PNR", meta.pnr && meta.pnr !== booking.reference ? meta.pnr : null],
    ["Order ID", meta.orderRef || booking.order_ref || null],
    ["Booked on", formatBookingDate(booking.created_at)],
    ["Passengers", meta.passengers ? String(meta.passengers) : null],
    ["Total", formatMoney(booking.sum, booking.currency)],
  ].filter(([, value]) => Boolean(value));

  const rooms = Array.isArray(meta.rooms)
    ? meta.rooms.filter((room) => room && (room.name || room.board))
    : [];

  const adults = Number(meta.adults) || 0;
  const childrenCount = Number(meta.children) || 0;
  const guestsLabel = [
    adults ? `${adults} adult${adults > 1 ? "s" : ""}` : "",
    childrenCount ? `${childrenCount} ${childrenCount > 1 ? "children" : "child"}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const hotel = meta.hotel ?? {};
  const firstRoom = rooms[0] ?? {};
  const nights = Number(meta.nights) || 0;
  const hotelAddress = [hotel.address, hotel.city, hotel.country].filter(Boolean).join(", ");
  const cancelPolicy = firstRoom.cancelPolicy ?? null;

  const stayRows = [
    ["Room", rooms.map((room) => room.name).filter(Boolean).join(", ")],
    ["Bed type", firstRoom.bedType],
    ["Room size", firstRoom.size],
    ["Meal plan", rooms.map((room) => room.board).filter(Boolean).join(", ")],
    ["Guests", guestsLabel],
    ["Nights", nights ? `${nights} night${nights > 1 ? "s" : ""}` : ""],
    ["Check-in", meta.checkin],
    ["Check-out", meta.checkout],
    ["Address", hotelAddress],
  ].filter(([, value]) => Boolean(value));

  const refundableKnown = rooms.some((room) => typeof room.refundable === "boolean");
  const isRefundable = rooms.some((room) => room.refundable === true);

  const price = meta.price ?? {};
  const taxes = Array.isArray(meta.taxes)
    ? meta.taxes.filter((tax) => tax && tax.description && Number.isFinite(Number(tax.amount)))
    : [];

  const priceRows = [
    ["Price per night", price.perNight ? formatMoney(price.perNight, price.currency) : ""],
    ...taxes.map((tax) => [
      tax.included ? tax.description : `${tax.description} (payable at hotel)`,
      formatMoney(tax.amount, tax.currency || price.currency),
    ]),
  ].filter(([, value]) => Boolean(value));

  const vouchers = Array.isArray(meta.vouchers)
    ? meta.vouchers.filter((voucher) => voucher && voucher.url)
    : [];

  return (
    <div className="booking-details">
      <div className="bd-head">
        <span className={`booking-card-icon ${service.tint}`}>
          <Icon fontSize="inherit" />
        </span>
        <div className="bd-head-title">
          <h4>{booking.name || service.label}</h4>
          <span className={`status-badge is-${status}`}>{statusLabel(booking.status)}</span>
        </div>
      </div>

      {groups.length > 0 && (
        <section className="bd-block">
          <h5 className="bd-block-title">Itinerary</h5>
          {groups.map((group) => (
            <div className="bd-leg" key={group.id}>
              <p className="bd-leg-label">{group.label}</p>
              {group.list.map((segment, index) => (
                <div className="bd-segment" key={`${group.id}-${index}`}>
                  <span className="bd-segment-route">
                    {segment.originCode ?? "—"} → {segment.destinationCode ?? "—"}
                  </span>
                  <span className="bd-segment-time">
                    {[formatSegmentStamp(segment.departureTime), formatTimeHM(segment.arrivalTime)]
                      .filter(Boolean)
                      .join(" – ")}
                  </span>
                  {segment.carrier || segment.flightNumber ? (
                    <span className="bd-segment-flight">
                      {[segment.carrier, segment.flightNumber].filter(Boolean).join(" ")}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      <section className="bd-block">
        <h5 className="bd-block-title">Booking info</h5>
        <dl className="bd-rows">
          {rows.map(([label, value]) => (
            <div className="bd-row" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {stayRows.length > 0 && (
        <section className="bd-block">
          <h5 className="bd-block-title">Stay details</h5>
          <dl className="bd-rows">
            {stayRows.map(([label, value]) => (
              <div className="bd-row" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {refundableKnown && (
            <p className={`bd-refund ${isRefundable ? "is-free" : "is-none"}`}>
              {isRefundable && <RestoreOutlined fontSize="small" />}
              {isRefundable
                ? cancelPolicy?.deadline
                  ? `Free cancellation until ${formatPolicyDeadline(cancelPolicy.deadline, cancelPolicy.timezone)}`
                  : "Free cancellation available"
                : "Non-refundable rate"}
            </p>
          )}
        </section>
      )}

      {priceRows.length > 0 && (
        <section className="bd-block">
          <h5 className="bd-block-title">Price details</h5>
          <dl className="bd-rows">
            {priceRows.map(([label, value]) => (
              <div className="bd-row" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="bd-block">
        <h5 className="bd-block-title">Vouchers</h5>
        {vouchers.length > 0 ? (
          <div className="bd-vouchers">
            {vouchers.map((voucher, index) => (
              <a
                key={`${voucher.title || "voucher"}-${index}`}
                className="bd-voucher"
                href={voucher.url}
                target="_blank"
                rel="noreferrer"
              >
                <DownloadOutlined fontSize="small" />
                <span>{voucher.title || `Voucher ${index + 1}`}</span>
              </a>
            ))}
          </div>
        ) : (
          <div className="bd-vouchers-empty">
            <ConfirmationNumberOutlined />
            <p>Your travel vouchers will appear here once they are issued.</p>
          </div>
        )}
      </section>
    </div>
  );
};

const BookingDetailsPopup = ({ booking, onClose }) => {
  const isMobile = useMediaQuery("(max-width: 968px)");
  const open = Boolean(booking);
  const closeRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open || isMobile) return;
    triggerRef.current = document.activeElement;
    return () => {
      const el = triggerRef.current;
      if (el && typeof el.focus === "function" && document.contains(el)) {
        el.focus();
      }
    };
  }, [open, isMobile]);

  useEffect(() => {
    if (!open || isMobile) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isMobile, onClose]);

  useEffect(() => {
    if (!open || isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isMobile]);

  useEffect(() => {
    if (open && !isMobile) closeRef.current?.focus();
  }, [open, isMobile]);

  if (isMobile) {
    return (
      <BottomSheet open={open} onClose={onClose} title="Booking details">
        {booking ? <BookingDetails booking={booking} /> : null}
      </BottomSheet>
    );
  }

  return (
    <>
      <div
        className={`pdrawer-overlay${open ? " is-visible" : ""}`}
        onClick={() => onClose?.()}
        aria-hidden="true"
      />
      <aside
        className={`pdrawer${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-label="Booking details"
        inert={!open}
      >
        <div className="pdrawer-header">
          <h3>Booking details</h3>
          <button
            type="button"
            className="pdrawer-close"
            aria-label="Close"
            onClick={() => onClose?.()}
            ref={closeRef}
          >
            <CloseOutlined fontSize="small" />
          </button>
        </div>
        <div className="pdrawer-body">
          {booking ? <BookingDetails booking={booking} /> : null}
        </div>
      </aside>
    </>
  );
};

export default BookingDetailsPopup;
