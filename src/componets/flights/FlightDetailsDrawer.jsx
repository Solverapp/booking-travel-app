import { useCallback, useEffect, useRef, useState } from "react";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BottomSheet from "../bottomsheet/BottomSheet";
import FlightSummaryPanel from "./FlightSummaryPanel";
import useMediaQuery from "../../utils/useMediaQuery";
import { shareFlightLink } from "../../utils/shareFlight";
import { formatPrice } from "../../utils/flightFormatters";
import { offerCurrency, offerPrice } from "../../utils/flightOffers";

const FlightDetailsDrawer = ({
  open,
  onClose,
  journey,
  offer,
  routeLabels,
  title,
  hasMultipleFares,
  onViewFares,
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
      const result = await shareFlightLink(title || "Flight offer");
      if (result === "copied") setShareNote("Link copied");
      if (result === "unsupported") {
        setShareNote("Copy the link from the address bar");
      }
    } catch {
      setShareNote("Could not share the link");
    }
  };

  const handleViewFares = () => {
    setShareNote("");
    onViewFares?.();
  };

  const total = offerPrice(offer);
  const currency = offerCurrency(offer);

  const footer = offer ? (
    <div className="ffdrawer-foot">
      <div className="ffdrawer-price">
        <strong>
          {currency} {formatPrice(total)}
        </strong>
        <span>{hasMultipleFares ? "From" : "Total"}</span>
      </div>
      {onViewFares ? (
        <button type="button" className="ffdrawer-cta" onClick={handleViewFares}>
          View fares
          <ArrowForwardIcon fontSize="small" />
        </button>
      ) : null}
    </div>
  ) : null;

  const content = (
    <>
      <FlightSummaryPanel
        journey={journey}
        offer={offer}
        routeLabels={routeLabels}
      />
      <button type="button" className="ffshare ffshare--mobile" onClick={handleShare}>
        <ShareOutlinedIcon fontSize="small" />
        {shareNote || "Share with a friend"}
      </button>
    </>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={handleClose}
        title="Flight details"
        footer={footer}
      >
        {content}
      </BottomSheet>
    );
  }

  return (
    <>
      <div
        className={`ffdrawer-overlay${open ? " is-open" : ""}`}
        onClick={handleClose}
        aria-hidden="true"
      />
      <aside
        className={`ffdrawer${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-label={open ? "Flight details" : undefined}
        inert={!open}
      >
        <div className="ffdrawer-head">
          <div className="ffdrawer-heading">
            <span className="ffdrawer-kicker">Flight details</span>
            <h2 className="ffdrawer-title">{title}</h2>
          </div>
          <div className="ffdrawer-actions">
            <button
              type="button"
              className="ffdrawer-icon"
              aria-label="Share flight"
              onClick={handleShare}
            >
              <ShareOutlinedIcon fontSize="small" />
            </button>
            <button
              type="button"
              className="ffdrawer-icon"
              aria-label="Close"
              onClick={handleClose}
              ref={closeRef}
            >
              <CloseOutlinedIcon fontSize="small" />
            </button>
          </div>
        </div>
        <div className="ffdrawer-body">
          <FlightSummaryPanel
            journey={journey}
            offer={offer}
            routeLabels={routeLabels}
          />
          {shareNote ? <p className="ffshare-note">{shareNote}</p> : null}
        </div>
        {footer ? <div className="ffdrawer-footer">{footer}</div> : null}
      </aside>
    </>
  );
};

export default FlightDetailsDrawer;
