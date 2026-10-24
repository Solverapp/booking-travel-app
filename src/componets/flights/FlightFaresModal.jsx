import { useCallback, useEffect, useRef, useState } from "react";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import BackpackOutlinedIcon from "@mui/icons-material/BackpackOutlined";
import LuggageOutlinedIcon from "@mui/icons-material/LuggageOutlined";
import EventSeatOutlinedIcon from "@mui/icons-material/EventSeatOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BottomSheet from "../bottomsheet/BottomSheet";
import FlightSummaryPanel from "./FlightSummaryPanel";
import useMediaQuery from "../../utils/useMediaQuery";
import { shareFlightLink } from "../../utils/shareFlight";
import { formatPrice } from "../../utils/flightFormatters";
import { legsOf } from "../../utils/flightJourneys";
import {
  fareOptions,
  offerBaggage,
  offerCabin,
  offerCurrency,
  offerFareFamily,
  offerFlexibility,
  offerPerAdult,
  offerPrice,
  offerSeat,
  offerSeatsRemaining,
} from "../../utils/flightOffers";

const FareRow = ({ icon, tone = "positive", note, children }) => (
  <div className="fffare-row">
    <span className={`fffare-row-icon is-${tone}`}>{icon}</span>
    <span className="fffare-row-text">{children}</span>
    {note ? <span className="fffare-row-note">{note}</span> : null}
  </div>
);

const FareCard = ({
  option,
  currency,
  cheapestPrice,
  cheapestFamily,
  onSelect,
  disabled,
  isVerifying,
}) => {
  const offer = option.offer;
  const family = offerFareFamily(offer);
  const cabin = offerCabin(offer);
  const total = offerPrice(offer);
  const perAdult = offerPerAdult(offer);
  const baggage = offerBaggage(offer);
  const flexibility = offerFlexibility(offer);
  const seat = offerSeat(offer);
  const seatsRemaining = offerSeatsRemaining(offer);
  const isCheapest =
    cheapestPrice !== null && total !== null && total === cheapestPrice;
  const delta =
    total !== null && cheapestPrice !== null && total > cheapestPrice
      ? total - cheapestPrice
      : null;
  const mixed = offer?.fare?.mixedCabin || offer?.fare?.mixedFareFamily;

  return (
    <article className={`fffare${isCheapest ? " is-cheapest" : ""}`}>
      <div className="fffare-head">
        <div className="fffare-name-wrap">
          <h3 className="fffare-name">{family}</h3>
          <div className="fffare-meta">
            {cabin ? <span>{cabin}</span> : null}
            {option.count > 1 ? <span>{option.count} options</span> : null}
            {seatsRemaining ? (
              <span className="fffare-seats">Only {seatsRemaining} seats left</span>
            ) : null}
          </div>
          {isCheapest ? <span className="fffare-badge">Cheapest option</span> : null}
        </div>
        <div className="fffare-price">
          <strong>
            {currency} {formatPrice(total)}
          </strong>
          {perAdult ? (
            <span>
              {currency} {formatPrice(perAdult)} per adult
            </span>
          ) : null}
        </div>
      </div>

      {seat ? (
        <section className="fffare-section">
          <h4 className="fffare-section-title">Seat</h4>
          <FareRow
            icon={<EventSeatOutlinedIcon fontSize="small" />}
            note={seat.chargeable ? "Paid" : null}
            tone={seat.chargeable ? "muted" : "positive"}
          >
            {seat.description}
          </FareRow>
        </section>
      ) : null}

      <section className="fffare-section">
        <h4 className="fffare-section-title">Bags</h4>
        {baggage.personal.map((item, index) => (
          <FareRow
            key={`personal-${index}`}
            icon={<BackpackOutlinedIcon fontSize="small" />}
          >
            {item}
          </FareRow>
        ))}
        {baggage.carryOn.map((item, index) => (
          <FareRow
            key={`carry-${index}`}
            icon={<BackpackOutlinedIcon fontSize="small" />}
          >
            {item}
          </FareRow>
        ))}
        {baggage.checked.map((item, index) => (
          <FareRow
            key={`checked-${index}`}
            icon={<LuggageOutlinedIcon fontSize="small" />}
          >
            {item}
          </FareRow>
        ))}
        {baggage.paid.map((item, index) => {
          const price =
            item.price !== null
              ? `${item.currency ? `${item.currency} ` : ""}${formatPrice(item.price)}`
              : "";
          return (
            <FareRow
              key={`paid-${item.kind}-${index}`}
              icon={
                item.kind === "checked" ? (
                  <LuggageOutlinedIcon fontSize="small" />
                ) : (
                  <BackpackOutlinedIcon fontSize="small" />
                )
              }
              note={price ? `Paid · ${price}` : "Paid"}
              tone="muted"
            >
              {item.text}
            </FareRow>
          );
        })}
        {baggage.personal.length === 0 &&
        baggage.carryOn.length === 0 &&
        baggage.checked.length === 0 ? (
          <FareRow icon={<CancelOutlinedIcon fontSize="small" />} tone="muted">
            No free baggage included
          </FareRow>
        ) : null}
      </section>

      <section className="fffare-section">
        <h4 className="fffare-section-title">Flexibility</h4>
        {flexibility.hasRefundable ? (
          <FareRow
            icon={
              flexibility.refundable ? (
                <CheckCircleOutlineIcon fontSize="small" />
              ) : (
                <CancelOutlinedIcon fontSize="small" />
              )
            }
            tone={flexibility.refundable ? "positive" : "muted"}
          >
            {flexibility.refundable ? "Refundable" : "Not refundable"}
          </FareRow>
        ) : null}
        {flexibility.hasChangeable ? (
          <FareRow
            icon={
              flexibility.changeable ? (
                <CheckCircleOutlineIcon fontSize="small" />
              ) : (
                <CancelOutlinedIcon fontSize="small" />
              )
            }
            tone={flexibility.changeable ? "positive" : "muted"}
          >
            {flexibility.changeable ? "Changes allowed" : "Changes not allowed"}
          </FareRow>
        ) : null}
        {flexibility.notes.slice(0, 2).map((note, index) => (
          <p className="fffare-note" key={`note-${index}`}>
            {note}
          </p>
        ))}
        {mixed ? (
          <p className="fffare-note">Mixed cabin or fare family across legs.</p>
        ) : null}
      </section>

      <div className="fffare-foot">
        <span className="fffare-delta">
          {delta !== null && cheapestFamily
            ? `+${currency} ${formatPrice(delta)} vs ${cheapestFamily}`
            : ""}
        </span>
        <button
          type="button"
          className="fffare-cta"
          onClick={() => onSelect(offer)}
          disabled={disabled}
          aria-busy={isVerifying ? "true" : undefined}
        >
          {isVerifying ? "Checking..." : `Select ${family}`}
          {!isVerifying ? <ArrowForwardIcon fontSize="small" /> : null}
        </button>
      </div>
    </article>
  );
};

const FlightFaresModal = ({
  open,
  onClose,
  journey,
  offers,
  routeLabels,
  onSelect,
  verifyingOfferId,
  error,
}) => {
  const isMobile = useMediaQuery("(max-width: 968px)");
  const closeRef = useRef(null);
  const [shareNote, setShareNote] = useState("");

  const handleClose = useCallback(() => {
    setShareNote("");
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!open || isMobile) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, isMobile, handleClose]);

  const handleShare = async () => {
    setShareNote("");
    try {
      const result = await shareFlightLink("Flight fares");
      if (result === "copied") setShareNote("Link copied");
      if (result === "unsupported") {
        setShareNote("Copy the link from the address bar");
      }
    } catch {
      setShareNote("Could not share the link");
    }
  };

  const legs = legsOf(journey);
  const outbound = legs[0] ?? [];
  const firstSegment = outbound[0] ?? {};
  const lastSegment = outbound[outbound.length - 1] ?? {};
  const fareList = Array.isArray(offers) ? offers : fareOptions(journey);
  const summaryOffer = fareList[0]?.offer ?? null;
  const currency = offerCurrency(summaryOffer);
  const cheapestPrice = offerPrice(summaryOffer);
  const cheapestFamily = summaryOffer ? offerFareFamily(summaryOffer) : "";
  const destinationName =
    lastSegment?.destinationName ||
    routeLabels?.destination ||
    lastSegment?.destinationCode ||
    "your destination";
  const originName =
    firstSegment?.originName ||
    routeLabels?.origin ||
    firstSegment?.originCode ||
    "your origin";
  const title =
    legs.length > 1
      ? `Fare options for ${originName} ⇄ ${destinationName}`
      : `Fare options to ${destinationName}${
          lastSegment?.destinationCode ? ` (${lastSegment.destinationCode})` : ""
        }`;

  const list = (
    <>
      {isMobile ? (
        <button type="button" className="ffshare" onClick={handleShare}>
          <ShareOutlinedIcon fontSize="small" />
          {shareNote || "Share with a friend"}
        </button>
      ) : null}
      {shareNote && !isMobile ? (
        <p className="fffares-note">{shareNote}</p>
      ) : null}
      {error ? (
        <p className="fffares-error" role="alert">
          {error}
        </p>
      ) : null}
      {fareList.length === 0 ? (
        <p className="fffares-empty">
          No fare options available for this flight.
        </p>
      ) : (
        fareList.map((option) => {
          const offerId = option?.offer?.offerId;
          return (
            <FareCard
              key={offerId}
              option={option}
              currency={currency}
              cheapestPrice={cheapestPrice}
              cheapestFamily={cheapestFamily}
              onSelect={onSelect}
              disabled={verifyingOfferId !== null}
              isVerifying={verifyingOfferId === offerId}
            />
          );
        })
      )}
    </>
  );

  const body = (
    <div className="fffares-body">
      <div className="fffares-summary">
        <FlightSummaryPanel
          journey={journey}
          offer={summaryOffer}
          routeLabels={routeLabels}
        />
      </div>
      <div className="fffares-list">{list}</div>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet open={open} onClose={handleClose} title="Fare options">
        {body}
      </BottomSheet>
    );
  }

  return (
    <>
      <div
        className={`fffares-overlay${open ? " is-open" : ""}`}
        onClick={handleClose}
        aria-hidden="true"
      />
      <section
        className={`fffares-modal${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-label={open ? title : undefined}
        inert={!open}
      >
        <div className="fffares-head">
          <div className="fffares-heading">
            <span className="fffares-kicker">Fare options</span>
            <h2 className="fffares-title">{title}</h2>
          </div>
          <div className="fffares-actions">
            <button
              type="button"
              className="fffares-icon"
              aria-label="Share fares"
              onClick={handleShare}
            >
              <ShareOutlinedIcon fontSize="small" />
            </button>
            <button
              type="button"
              className="fffares-icon"
              aria-label="Close"
              onClick={handleClose}
              ref={closeRef}
            >
              <CloseOutlinedIcon fontSize="small" />
            </button>
          </div>
        </div>
        {body}
      </section>
    </>
  );
};

export default FlightFaresModal;
