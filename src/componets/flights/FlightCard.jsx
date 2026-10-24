import BackpackOutlinedIcon from "@mui/icons-material/BackpackOutlined";
import LuggageOutlinedIcon from "@mui/icons-material/LuggageOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { AmenityIcon } from "./FlightAmenities";
import {
  carriersOf,
  dayOffset,
  legDuration,
  legFlightNumbers,
  legStops,
  legsOf,
} from "../../utils/flightJourneys";
import {
  dayChangeLabel,
  formatDateWeekday,
  formatDuration,
  formatPrice,
  formatTimeHM,
} from "../../utils/flightFormatters";
import {
  offerBaggage,
  offerCurrency,
  offerIncludedAmenities,
  offerPrice,
} from "../../utils/flightOffers";

const FlightCard = ({ journey, offer, fareCount, onDetails, onViewFares }) => {
  if (!offer) return null;

  const legs = legsOf(journey);
  if (legs.length === 0) return null;

  const hasMultipleFares = fareCount > 1;
  const baggage = offerBaggage(offer);
  const included = offerIncludedAmenities(offer);
  const seen = new Set();
  const amenityIcons = [];

  if (baggage.hasCarryOn) {
    amenityIcons.push({
      key: "carry-on",
      label: "Carry-on bag included",
      icon: <BackpackOutlinedIcon fontSize="small" />,
    });
  }
  if (baggage.hasChecked) {
    amenityIcons.push({
      key: "checked-bag",
      label: "Checked bag included",
      icon: <LuggageOutlinedIcon fontSize="small" />,
    });
  }
  included.forEach((amenity) => {
    const key = amenity?.category || amenity?.name;
    if (!key || seen.has(key)) return;
    seen.add(key);
    amenityIcons.push({
      key: `amenity-${key}`,
      label: [amenity.name, amenity.details].filter(Boolean).join(" · "),
      icon: <AmenityIcon category={amenity.category} />,
    });
  });

  const total = offerPrice(offer);
  const currency = offerCurrency(offer);

  return (
    <article className="ffcard">
      <div className="ffcard-legs">
        {legs.map((leg, legIndex) => {
          const departure = leg[0] ?? {};
          const arrival = leg[leg.length - 1] ?? {};
          const duration = legDuration(leg);
          const stops = legStops(leg);
          const numbers = legFlightNumbers(leg);
          const carrier = carriersOf(leg)[0];
          const arrivalDayChange = dayChangeLabel(
            dayOffset(departure?.departureTime, arrival?.arrivalTime),
          );

          return (
            <div className="ffcard-leg" key={`leg-${legIndex}`}>
              <div className="ffcard-leg-head">
                <span className="ffcard-kicker">
                  {legs.length > 1 ? (legIndex === 0 ? "Outbound" : "Return") : "Outbound"}
                </span>
                <span className="ffcard-date">
                  {formatDateWeekday(departure?.departureTime)}
                </span>
                {numbers.length > 0 ? (
                  <span className="ffcard-flight">
                    {numbers[0]}
                    {numbers.length > 1 ? ` +${numbers.length - 1}` : ""}
                  </span>
                ) : null}
              </div>

              <div className="ffcard-route">
                <div className="ffcard-point">
                  <p className="ffcard-time">
                    {formatTimeHM(departure?.departureTime) || "--:--"}
                  </p>
                  <p className="ffcard-code">{departure?.originCode || "—"}</p>
                  <span className="ffcard-airport">
                    {departure?.originName || ""}
                  </span>
                </div>

                <div className="ffcard-mid">
                  <span className="ffcard-duration">
                    {formatDuration(duration)}
                  </span>
                  <span className="ffcard-line" aria-hidden="true">
                    <i />
                  </span>
                  <span className={`ffcard-stops${stops === 0 ? " is-direct" : ""}`}>
                    {stops === 0 ? "Direct" : stops === 1 ? "1 stop" : `${stops} stops`}
                  </span>
                </div>

                <div className="ffcard-point ffcard-point--right">
                  <p className="ffcard-time">
                    {formatTimeHM(arrival?.arrivalTime) || "--:--"}
                    {arrivalDayChange ? (
                      <span className="ffcard-day-change">{arrivalDayChange}</span>
                    ) : null}
                  </p>
                  <p className="ffcard-code">{arrival?.destinationCode || "—"}</p>
                  <span className="ffcard-airport">
                    {arrival?.destinationName || ""}
                  </span>
                </div>
              </div>

              <div className="ffcard-carrier">
                {carrier?.logo ? (
                  <img src={carrier.logo} alt="" loading="lazy" />
                ) : null}
                <span>{carrier?.name || "Flight"}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="ffcard-foot">
        <div className="ffcard-extras" aria-label="Included amenities">
          {amenityIcons.length > 0 ? (
            amenityIcons.map((item) => (
              <span className="fficon" key={item.key} title={item.label}>
                {item.icon}
              </span>
            ))
          ) : (
            <span className="ffcard-noextras">No included extras</span>
          )}
        </div>

        <button type="button" className="ffcard-details" onClick={onDetails}>
          Details
        </button>

        <div className="ffcard-price">
          <span className="ffcard-price-label">
            {hasMultipleFares ? "From" : "Total"}
          </span>
          <p>
            <span className="ffcard-currency">{currency}</span>
            {formatPrice(total)}
          </p>
        </div>

        <button type="button" className="ffcard-cta" onClick={onViewFares}>
          View fares
          <ArrowForwardIcon fontSize="small" />
        </button>
      </div>
    </article>
  );
};

export default FlightCard;
