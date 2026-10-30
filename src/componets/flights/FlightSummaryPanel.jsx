import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import FlightTakeoffOutlinedIcon from "@mui/icons-material/FlightTakeoffOutlined";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import FlightAmenities from "./FlightAmenities";
import {
  carriersOf,
  dayOffset,
  legConnections,
  legDuration,
  legFlightNumbers,
  legStops,
  legsOf,
  segmentFlightLabel,
} from "../../utils/flightJourneys";
import {
  dayChangeLabel,
  formatDateWeekday,
  formatDuration,
  formatTimeHM,
} from "../../utils/flightFormatters";
import {
  offerAmenities,
  offerBaggage,
  offerCabin,
  offerFareFamily,
} from "../../utils/flightOffers";

const cityWithCode = (label, code) => {
  if (!code) return label || "—";
  if (!label) return code;
  return label.includes(code) ? label : `${label} (${code})`;
};

const stopsText = (leg) => {
  const stops = legStops(leg);
  if (stops <= 0) return "Direct";
  return stops === 1 ? "1 stop" : `${stops} stops`;
};

const placeName = (segment, fallbackLabel, prefix) => {
  const airportName = segment?.[`${prefix}Name`] ?? "";
  const code = segment?.[`${prefix}Code`] ?? "";
  const label = fallbackLabel || airportName || code;
  return {
    label,
    meta: [code, airportName].filter(Boolean).join(" · "),
  };
};

const stopMeta = (stop) => {
  const departure = formatTimeHM(stop.departureTime);
  const dayChange = dayChangeLabel(
    dayOffset(stop.arrivalTime, stop.departureTime),
  );
  const departureLabel = departure
    ? `Departs ${departure}${dayChange ? ` ${dayChange}` : ""}`
    : "";
  const layoverLabel =
    Number.isFinite(stop.layoverMinutes) && stop.layoverMinutes > 0
      ? `Layover ${formatDuration(stop.layoverMinutes)}`
      : "";
  return [stop.code, departureLabel, layoverLabel].filter(Boolean).join(" · ");
};

const FlightSummaryPanel = ({ journey, offer, routeLabels }) => {
  const legs = legsOf(journey);
  if (legs.length === 0) return null;

  const firstLeg = legs[0];
  const firstSegment = firstLeg[0] ?? {};
  const lastSegment = firstLeg[firstLeg.length - 1] ?? {};
  const allSegments = legs.flat();
  const carriers = carriersOf(allSegments);
  const airlineName = carriers.map((carrier) => carrier.name).filter(Boolean).join(", ");
  const flightNumbers = Array.from(
    new Set(legs.flatMap((leg) => legFlightNumbers(leg))),
  );
  const totalDuration = legs.reduce(
    (total, leg) => total + (legDuration(leg) ?? 0),
    0,
  );
  const amenities = offerAmenities(offer);
  const baggage = offer ? offerBaggage(offer) : null;
  const cabin = offerCabin(offer);
  const family = offer ? offerFareFamily(offer) : "";
  const originCity = routeLabels?.origin || firstSegment?.originName;
  const destinationCity =
    routeLabels?.destination || lastSegment?.destinationName;
  const routeTitle =
    legs.length > 1
      ? `${cityWithCode(originCity, firstSegment?.originCode)} ⇄ ${cityWithCode(
          destinationCity,
          lastSegment?.destinationCode,
        )}`
      : `${cityWithCode(originCity, firstSegment?.originCode)} → ${cityWithCode(
          destinationCity,
          lastSegment?.destinationCode,
        )}`;

  const infoRows = [
    airlineName
      ? { key: "airline", icon: <FlightTakeoffOutlinedIcon fontSize="small" />, label: "Airline", value: airlineName }
      : null,
    flightNumbers.length > 0
      ? {
          key: "flights",
          icon: <ConfirmationNumberOutlinedIcon fontSize="small" />,
          label: "Flight number",
          value: flightNumbers.join(" · "),
        }
      : null,
    offer
      ? {
          key: "fare",
          icon: <LocalOfferOutlinedIcon fontSize="small" />,
          label: "Fare",
          value: [family, cabin].filter(Boolean).join(" · "),
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="ffsummary">
      <div className="ffsummary-head">
        <div>
          <span className="ffsummary-kicker">
            {legs.length > 1 ? "Round trip" : "Outbound"}
          </span>
          <h3 className="ffsummary-route">{routeTitle}</h3>
        </div>
        {totalDuration > 0 ? (
          <span className="ffsummary-duration">
            <AccessTimeOutlinedIcon fontSize="small" />
            {formatDuration(totalDuration)}
          </span>
        ) : null}
      </div>

      {legs.map((leg, legIndex) => {
        const departure = leg[0] ?? {};
        const arrival = leg[leg.length - 1] ?? {};
        const duration = legDuration(leg);
        const originPlace = placeName(
          departure,
          legIndex === 0 ? routeLabels?.origin : undefined,
          "origin",
        );
        const destinationPlace = placeName(
          arrival,
          legIndex === legs.length - 1 ? routeLabels?.destination : undefined,
          "destination",
        );
        const firstCarrier = carriersOf(leg)[0];
        const arrivalDayChange = dayChangeLabel(
          dayOffset(departure?.departureTime, arrival?.arrivalTime),
        );
        const connections = legConnections(leg);

        return (
          <div className="ffsummary-card" key={`leg-${legIndex}`}>
            {legs.length > 1 ? (
              <span className="ffroute-label">
                {legIndex === 0 ? "Outbound" : "Return"}
              </span>
            ) : null}

            <div className="ffroute">
              <div className="ffroute-row">
                <div className="ffroute-time">
                  <strong>{formatTimeHM(departure?.departureTime) || "--:--"}</strong>
                  <span>{formatDateWeekday(departure?.departureTime)}</span>
                </div>
                <div className="ffroute-track">
                  <span className="ffroute-dot" />
                  <span className="ffroute-line" />
                </div>
                <div className="ffroute-place">
                  <strong>{originPlace.label}</strong>
                  <span>{originPlace.meta}</span>
                </div>
              </div>

              <div className="ffroute-row ffroute-row--middle">
                <div className="ffroute-time ffroute-time--muted">
                  {formatDuration(duration)}
                </div>
                <div className="ffroute-track">
                  <span className="ffroute-line" />
                </div>
                <div className="ffroute-place ffroute-place--carrier">
                  {firstCarrier?.logo ? (
                    <img src={firstCarrier.logo} alt="" loading="lazy" />
                  ) : null}
                  <span>
                    {firstCarrier?.name || "Flight"} · {stopsText(leg)}
                  </span>
                </div>
              </div>

              {connections.map((stop) => (
                <div className="ffroute-row ffroute-row--stop" key={stop.key}>
                  <div className="ffroute-time">
                    <strong>{formatTimeHM(stop.arrivalTime) || "--:--"}</strong>
                    <span>{formatDateWeekday(stop.arrivalTime)}</span>
                  </div>
                  <div className="ffroute-track">
                    <span className="ffroute-dot ffroute-dot--stop" />
                    <span className="ffroute-line" />
                  </div>
                  <div className="ffroute-place">
                    <strong>{stop.name || stop.code || "Stop"}</strong>
                    <span>{stopMeta(stop)}</span>
                  </div>
                </div>
              ))}

              <div className="ffroute-row">
                <div className="ffroute-time">
                  <strong>
                    {formatTimeHM(arrival?.arrivalTime) || "--:--"}
                    {arrivalDayChange ? ` ${arrivalDayChange}` : ""}
                  </strong>
                  <span>{formatDateWeekday(arrival?.arrivalTime)}</span>
                </div>
                <div className="ffroute-track">
                  <span className="ffroute-dot ffroute-dot--arrival" />
                </div>
                <div className="ffroute-place">
                  <strong>{destinationPlace.label}</strong>
                  <span>{destinationPlace.meta}</span>
                </div>
              </div>
            </div>

            {leg.length > 1 ? (
              <div className="ffroute-segments">
                {leg.map((segment, segmentIndex) => (
                  <div
                    className="ffroute-seg"
                    key={segment?.segmentKey ?? segmentIndex}
                  >
                    {segment?.carrier?.marketingLogo ? (
                      <img
                        src={segment.carrier.marketingLogo}
                        alt=""
                        loading="lazy"
                      />
                    ) : null}
                    <span className="ffroute-seg-name">
                      {segmentFlightLabel(segment) || "Flight"}
                    </span>
                    <span className="ffroute-seg-time">
                      {formatTimeHM(segment?.departureTime)} {segment?.originCode ?? ""}
                      {" → "}
                      {formatTimeHM(segment?.arrivalTime)} {segment?.destinationCode ?? ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}

      {infoRows.length > 0 ? (
        <div className="ffinfo">
          {infoRows.map((row) => (
            <div className="ffinfo-row" key={row.key}>
              <span className="ffinfo-icon">{row.icon}</span>
              <span className="ffinfo-label">{row.label}</span>
              <strong className="ffinfo-value">{row.value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      <FlightAmenities amenities={amenities} baggage={baggage} />
    </div>
  );
};

export default FlightSummaryPanel;
