import { Fragment, useEffect, useRef } from "react";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import ConfirmationNumberOutlined from "@mui/icons-material/ConfirmationNumberOutlined";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import RestoreOutlined from "@mui/icons-material/RestoreOutlined";
import BottomSheet from "../bottomsheet/BottomSheet";
import useMediaQuery from "../../utils/useMediaQuery";
import {
  dayChangeLabel,
  formatDuration,
  formatTimeHM,
} from "../../utils/flightFormatters";
import {
  dayOffset,
  minutesBetween,
  segmentLabelsByKey,
} from "../../utils/flightJourneys";
import {
  cabinLabel,
  formatBookingDate,
  formatGender,
  formatMoney,
  formatPolicyDeadline,
  formatSegmentStamp,
  normalizeStatus,
  passengerTypeLabel,
  serviceMeta,
  statusLabel,
} from "./bookingUtils";
import { formatTaxTotals, taxesAndFeesBreakdown } from "../../utils/hotelRate";
import "./style.css";

const groupSegments = (segments) => {
  const outbound = segments.filter((segment) => segment?.direction !== "INBOUND");
  const inbound = segments.filter((segment) => segment?.direction === "INBOUND");
  const groups = [];
  if (outbound.length) groups.push({ id: "outbound", label: "Outbound", list: outbound });
  if (inbound.length) groups.push({ id: "inbound", label: "Return", list: inbound });
  return groups;
};

const baggageTypeLabel = (type) => {
  const value = String(type ?? "").toLowerCase();
  if (value === "personal") return "Personal item";
  if (value === "cabin") return "Carry-on bag";
  if (value === "checked") return "Checked bag";
  return "Baggage";
};

const baggageDetails = (item) =>
  [
    item?.weightKg ? `${item.weightKg} kg` : "",
    item?.size || "",
  ]
    .filter(Boolean)
    .join(" · ") || "Included";

const FlightLeg = ({ group }) => {
  const first = group.list[0] ?? {};
  const last = group.list[group.list.length - 1] ?? {};
  const stops = group.list.length - 1;
  const duration = minutesBetween(first?.departureTime, last?.arrivalTime);
  const dayChange = dayChangeLabel(dayOffset(first?.departureTime, last?.arrivalTime));

  return (
    <div className="bd-leg">
      <div className="bd-leg-head">
        <span className="bd-leg-label">{group.label}</span>
        <span className="bd-leg-date">{formatBookingDate(first?.departureTime)}</span>
      </div>

      <div className="bd-leg-route">
        <div className="bd-leg-point">
          <strong>{formatTimeHM(first?.departureTime) || "--:--"}</strong>
          <span>{first?.originCode ?? "—"}</span>
        </div>
        <div className="bd-leg-mid">
          <span className="bd-leg-duration">{formatDuration(duration) || "—"}</span>
          <span className="bd-leg-line" />
          <span className="bd-leg-stops">
            {stops === 0 ? "Direct" : stops === 1 ? "1 stop" : `${stops} stops`}
          </span>
        </div>
        <div className="bd-leg-point is-arrival">
          <strong>
            {formatTimeHM(last?.arrivalTime) || "--:--"}
            {dayChange ? ` ${dayChange}` : ""}
          </strong>
          <span>{last?.destinationCode ?? "—"}</span>
        </div>
      </div>

      <div className="bd-segs">
        {group.list.map((segment, index) => {
          const layover =
            index > 0
              ? minutesBetween(group.list[index - 1]?.arrivalTime, segment?.departureTime)
              : null;
          const flightLabel = [
            segment?.carrierName || segment?.carrier,
            segment?.flightNumber,
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <Fragment key={`${group.id}-${index}`}>
              {Number.isFinite(layover) && layover > 0 && (
                <div className="bd-layover">
                  <span>
                    Layover {formatDuration(layover)} in {segment?.originCode ?? ""}
                  </span>
                </div>
              )}
              <div className="bd-segment">
                <span className="bd-segment-route">
                  {segment?.originCode ?? "—"} → {segment?.destinationCode ?? "—"}
                </span>
                <span className="bd-segment-time">
                  {[formatSegmentStamp(segment?.departureTime), formatTimeHM(segment?.arrivalTime)]
                    .filter(Boolean)
                    .join(" – ")}
                </span>
                {flightLabel ? <span className="bd-segment-flight">{flightLabel}</span> : null}
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
};

const BookingDetails = ({ booking }) => {
  const meta = booking.meta ?? {};
  const segments = Array.isArray(meta.segments) ? meta.segments : [];
  const segmentLabels = segmentLabelsByKey(segments);
  const groups = groupSegments(segments);
  const service = serviceMeta(booking.Service);
  const Icon = service.icon;
  const status = normalizeStatus(booking.status);

  const adults = Number(meta.adults) || 0;
  const childrenCount = Number(meta.children) || 0;
  const infantsCount = Number(meta.infants) || 0;
  const cabin = cabinLabel(meta.cabin);
  const tripType =
    meta.trip === "round" || groups.length > 1
      ? "Round trip"
      : groups.length === 1
        ? "One way"
        : "";

  const rows = [
    ["Reference", booking.reference || meta.bookingRef || null],
    ["PNR", meta.pnr && meta.pnr !== booking.reference ? meta.pnr : null],
    ["Order ID", meta.orderRef || booking.order_ref || null],
    ["Booked on", formatBookingDate(booking.created_at)],
    ["Trip type", tripType],
    ["Cabin", cabin],
    ["Passengers", meta.passengers ? String(meta.passengers) : null],
    ["Total", formatMoney(booking.sum, booking.currency)],
  ].filter(([, value]) => Boolean(value));

  const passengerList = Array.isArray(meta.passengerList)
    ? meta.passengerList.filter((pax) => pax && (pax.firstName || pax.lastName))
    : [];

  const passengerNameByIndex = (index) => {
    const pax = passengerList[Number(index)];
    if (!pax) return `Passenger ${Number(index) + 1}`;
    return (
      [pax.title, pax.firstName, pax.lastName].filter(Boolean).join(" ") ||
      `Passenger ${Number(index) + 1}`
    );
  };

  const services = Array.isArray(meta.services) ? meta.services : [];
  const seats = Array.isArray(meta.seats)
    ? meta.seats
    : services.filter((service) => service?.category === "seat");
  const baggageMeta = meta.baggage && typeof meta.baggage === "object" ? meta.baggage : {};
  const includedBags = Array.isArray(baggageMeta.included) ? baggageMeta.included : [];
  const purchasedBags = Array.isArray(baggageMeta.purchased)
    ? baggageMeta.purchased
    : services.filter((service) => service?.category === "baggage");

  const seatsByPassenger = new Map();
  seats.forEach((service) => {
    const index = Number.isFinite(Number(service?.passengerIndex))
      ? Number(service.passengerIndex)
      : 0;
    const list = seatsByPassenger.get(index) ?? [];
    list.push(service);
    seatsByPassenger.set(index, list);
  });
  const seatRows = Array.from(seatsByPassenger.entries()).map(([index, list]) => [
    "Seats",
    `${passengerNameByIndex(index)} · ${list
      .map((service) => {
        const label = [
          segmentLabels.get(service?.segmentKey),
          service?.seat?.seatNumber || service?.name || "Seat",
        ]
          .filter(Boolean)
          .join(" · ");
        return Number(service?.price) > 0
          ? `${label} · ${formatMoney(service.price, service.currency || booking.currency)}`
          : label;
      })
      .join("; ")}`,
  ]);

  const bagsByPassenger = new Map();
  purchasedBags.forEach((service) => {
    const index = Number.isFinite(Number(service?.passengerIndex))
      ? Number(service.passengerIndex)
      : 0;
    const list = bagsByPassenger.get(index) ?? [];
    list.push(service);
    bagsByPassenger.set(index, list);
  });
  const purchasedBagRows = Array.from(bagsByPassenger.entries()).map(([index, list]) => [
    "Extra baggage",
    `${passengerNameByIndex(index)} · ${list
      .map((service) =>
        [
          [segmentLabels.get(service?.segmentKey), service?.name || "Extra baggage"]
            .filter(Boolean)
            .join(" · "),
          Number(service?.price) > 0
            ? formatMoney(service.price, service.currency || booking.currency)
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
      )
      .join("; ")}`,
  ]);
  const includedBagRows = includedBags.map((item) => [
    baggageTypeLabel(item?.type),
    baggageDetails(item),
  ]);
  const serviceRows = [
    ...seatRows.map(([label, value], index) => ({
      key: `seat-${index}`,
      label,
      value,
    })),
    ...includedBagRows.map(([label, value], index) => ({
      key: `bag-included-${index}`,
      label,
      value,
    })),
    ...purchasedBagRows.map(([label, value], index) => ({
      key: `bag-purchased-${index}`,
      label,
      value,
    })),
  ].filter((row) => row.value);

  const contact = meta.contact && typeof meta.contact === "object" ? meta.contact : null;
  const contactPhone = contact?.phoneNumber
    ? `${contact.phoneCountryCode ? `+${contact.phoneCountryCode} ` : ""}${contact.phoneNumber}`
    : "";
  const contactRows = [
    ["Name", [contact?.firstName, contact?.lastName].filter(Boolean).join(" ")],
    ["Email", contact?.email],
    ["Phone", contactPhone],
  ].filter(([, value]) => Boolean(value));

  const rooms = Array.isArray(meta.rooms)
    ? meta.rooms.filter((room) => room && (room.name || room.board))
    : [];

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

  // Stay details — только отельные брони (у рейсов тоже есть meta.adults/children)
  const isHotelStay =
    rooms.length > 0 || Boolean(meta.checkin || meta.checkout || meta.nights);

  const refundableKnown = rooms.some((room) => typeof room.refundable === "boolean");
  const isRefundable = rooms.some((room) => room.refundable === true);

  const price = meta.price ?? {};
  const rawTaxes = Array.isArray(meta.taxes) ? meta.taxes : [];
  const taxes = rawTaxes.filter(
    (tax) => tax && tax.description && Number.isFinite(Number(tax.amount)),
  );
  const taxesBreakdown = taxesAndFeesBreakdown(rawTaxes);
  const includedTaxes = formatTaxTotals(taxesBreakdown.includedTotals);
  const excludedTaxes = formatTaxTotals(taxesBreakdown.excludedTotals);

  const flightPrice =
    meta.priceBreakdown && typeof meta.priceBreakdown === "object"
      ? meta.priceBreakdown
      : null;
  const flightCurrency = flightPrice?.currency || booking.currency;
  const flightPriceRows = flightPrice
    ? [
        [
          "Tickets",
          formatMoney(
            flightPrice.hasSplit ? flightPrice.base : flightPrice.subtotal,
            flightCurrency,
          ),
        ],
        Number(flightPrice.taxes) > 0
          ? ["Taxes, fees & charges", formatMoney(flightPrice.taxes, flightCurrency)]
          : null,
        Number(flightPrice.serviceFee) > 0
          ? ["Service fee", formatMoney(flightPrice.serviceFee, flightCurrency)]
          : null,
        Number(flightPrice.seats) > 0
          ? ["Seats", formatMoney(flightPrice.seats, flightCurrency)]
          : null,
        Number(flightPrice.baggage) > 0
          ? ["Baggage", formatMoney(flightPrice.baggage, flightCurrency)]
          : null,
        ["Total", formatMoney(flightPrice.total, flightCurrency)],
      ].filter((row) => row && row[1])
    : [];

  const hotelPriceRows = [
    ["Price per night", price.perNight ? formatMoney(price.perNight, price.currency) : ""],
    includedTaxes ? ["Taxes & fees included", includedTaxes] : null,
    excludedTaxes ? ["Payable at hotel", `+ ${excludedTaxes}`] : null,
    ...taxes.map((tax) => [
      tax.included ? tax.description : `${tax.description} (payable at hotel)`,
      formatMoney(tax.amount, tax.currency || price.currency),
    ]),
  ].filter((row) => row && row[1]);

  const priceRows = [...flightPriceRows, ...hotelPriceRows];

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
          <h5 className="bd-block-title">Flight details</h5>
          {groups.map((group) => (
            <FlightLeg key={group.id} group={group} />
          ))}
        </section>
      )}

      {passengerList.length > 0 && (
        <section className="bd-block">
          <h5 className="bd-block-title">Travelers</h5>
          <div className="bd-pax-list">
            {passengerList.map((pax, index) => {
              const typeLabel = passengerTypeLabel(pax.type, index, {
                adults,
                children: childrenCount,
                infants: infantsCount,
              });
              const fullName = [pax.title, pax.firstName, pax.lastName]
                .filter(Boolean)
                .join(" ");
              const passport = [
                pax.documentNumber,
                pax.documentIssueCountry ? `issued in ${pax.documentIssueCountry}` : "",
              ]
                .filter(Boolean)
                .join(", ");
              const paxRows = [
                ["Date of birth", formatBookingDate(pax.birthday)],
                ["Gender", formatGender(pax.gender)],
                ["Nationality", pax.nationality],
                ["Passport", passport],
                ["Passport expires", formatBookingDate(pax.documentExpiry)],
              ].filter(([, value]) => Boolean(value));

              return (
                <div className="bd-pax" key={`${fullName}-${index}`}>
                  <div className="bd-pax-head">
                    <span className="bd-pax-name">{fullName || `Passenger ${index + 1}`}</span>
                    {typeLabel ? <span className="bd-pax-type">{typeLabel}</span> : null}
                  </div>
                  {paxRows.length > 0 && (
                    <dl className="bd-rows">
                      {paxRows.map(([label, value]) => (
                        <div className="bd-row" key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {serviceRows.length > 0 && (
        <section className="bd-block">
          <h5 className="bd-block-title">Seats & baggage</h5>
          <dl className="bd-rows">
            {serviceRows.map((row) => (
              <div className="bd-row" key={row.key}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
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

      {contactRows.length > 0 && (
        <section className="bd-block">
          <h5 className="bd-block-title">Contact details</h5>
          <dl className="bd-rows">
            {contactRows.map(([label, value]) => (
              <div className="bd-row" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {isHotelStay && stayRows.length > 0 && (
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
