import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import PeopleIcon from "@mui/icons-material/People";
import EventIcon from "@mui/icons-material/Event";
import AirlineStopsIcon from "@mui/icons-material/AirlineStops";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SecurityIcon from "@mui/icons-material/Security";
import PageLoader from "../loaders/PageLoader";
import { useAuth } from "../../context/AuthContext";
import { flightsBookingService } from "../../services/flights/flightBookingService";
import {
  formatDateShort,
  formatDuration,
  formatTimeHM,
  dayChangeLabel,
} from "../../utils/flightFormatters";
import {
  legsOf,
  carriersOf,
  minutesBetween,
  dayOffset,
  segmentFlightLabel,
} from "../../utils/flightJourneys";
import "./style.css";

const TITLES = ["MR", "MS", "MRS", "MISS"];
const GENDERS = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
];
const PHONE_CODES = [
  { code: "971", label: "+971 AE" },
  { code: "7", label: "+7 KZ" },
  { code: "966", label: "+966 SA" },
  { code: "44", label: "+44 GB" },
  { code: "1", label: "+1 US" },
  { code: "49", label: "+49 DE" },
  { code: "33", label: "+33 FR" },
  { code: "90", label: "+90 TR" },
  { code: "380", label: "+380 UA" },
  { code: "994", label: "+994 AZ" },
  { code: "995", label: "+995 GE" },
  { code: "998", label: "+998 UZ" },
];

const countsOf = (searchParams) => ({
  adults: Math.max(1, Number(searchParams?.adults) || 1),
  children: Math.max(0, Number(searchParams?.children) || 0),
  infants: Math.max(0, Number(searchParams?.infants) || 0),
});

// 0 = adult, 1 = child, 2 = infant — порядок как в searchParams (LiteAPI passengerType)
const passengerTypeOf = (index, counts) => {
  if (index < counts.adults) return 0;
  if (index < counts.adults + counts.children) return 1;
  return 2;
};

const passengerLabel = (index, counts) => {
  if (index < counts.adults) return `Adult ${index + 1}`;
  const childIndex = index - counts.adults;
  if (childIndex < counts.children) return `Child ${childIndex + 1}`;
  return `Infant ${index - counts.adults - counts.children + 1}`;
};

// IATA: adult 12+, child 2–11, infant under 2 — возраст на дату вылета
const PASSENGER_RULES = [
  { minAge: 12, maxAge: Infinity, hint: "12+ years", rangeText: "12 or older" },
  { minAge: 2, maxAge: 11, hint: "2–11 years", rangeText: "2–11 years old" },
  { minAge: 0, maxAge: 1, hint: "Under 2 years", rangeText: "under 2 years old" },
];

const parseDay = (value) => {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const shiftDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const shiftYears = (date, years) => {
  const copy = new Date(date);
  copy.setFullYear(copy.getFullYear() + years);
  return copy;
};

const dateInputValue = (date) => {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const ageOn = (birthday, on) => {
  const born = parseDay(birthday);
  if (!born) return null;
  let age = on.getFullYear() - born.getFullYear();
  const monthDiff = on.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getDate() < born.getDate())) age -= 1;
  return age;
};

const birthdayBounds = (type, travelDate) => {
  if (type === 0)
    return { min: null, max: dateInputValue(shiftYears(travelDate, -12)) };
  if (type === 1)
    return {
      min: dateInputValue(shiftDays(shiftYears(travelDate, -12), 1)),
      max: dateInputValue(shiftYears(travelDate, -2)),
    };
  return {
    min: dateInputValue(shiftDays(shiftYears(travelDate, -2), 1)),
    max: dateInputValue(travelDate),
  };
};

const emptyPassenger = () => ({
  title: "MR",
  firstName: "",
  lastName: "",
  birthday: "",
  gender: "M",
  nationality: "AE",
  documentType: "passport",
  documentNumber: "",
  documentIssueCountry: "AE",
  documentExpiry: "",
});

const buildPassengers = (counts, user) => {
  const total = counts.adults + counts.children + counts.infants;
  const list = [];
  for (let index = 0; index < total; index += 1) {
    const passenger = emptyPassenger();
    if (index === 0) {
      passenger.firstName = user?.firstname || "";
      passenger.lastName = user?.lastname || "";
    }
    list.push(passenger);
  }
  return list;
};

// changes из verify: строка, массив или объект LiteAPI
// { messages, priceChanged, cabinChanged, fareChanged, pricing:{ old, new } }
const changeNotices = (changes) => {
  if (!changes) return [];
  if (typeof changes === "string") return [changes];
  if (Array.isArray(changes)) {
    return changes
      .map((change) =>
        typeof change === "string"
          ? change
          : change?.description ?? change?.message ?? "",
      )
      .filter(Boolean);
  }

  const notices = [];
  if (Array.isArray(changes.messages)) {
    changes.messages.forEach((message) => {
      if (typeof message === "string" && message) notices.push(message);
    });
  }

  if (changes.priceChanged) {
    const oldTotal = Number(changes.pricing?.old?.display?.total);
    const newTotal = Number(changes.pricing?.new?.display?.total);
    const currency = changes.pricing?.new?.display?.currency ?? "";
    if (Number.isFinite(oldTotal) && Number.isFinite(newTotal)) {
      notices.push(
        `Price changed from ${oldTotal.toFixed(2)} ${currency} to ${newTotal.toFixed(
          2,
        )} ${currency}`,
      );
    } else {
      notices.push("Price has changed since your search");
    }
  }

  if (changes.cabinChanged) notices.push("Cabin class was changed by the airline");
  if (changes.fareChanged) notices.push("Fare conditions were changed by the airline");
  return notices;
};

const LegSummary = ({ leg, label }) => {
  const first = leg[0] ?? {};
  const last = leg[leg.length - 1] ?? {};
  const stops = leg.length - 1;
  const duration = minutesBetween(first?.departureTime, last?.arrivalTime);
  const dayChange = dayChangeLabel(dayOffset(first?.departureTime, last?.arrivalTime));

  return (
    <div className="fflight-leg">
      <div className="fflight-leg-head">
        <span className="fflight-leg-label">{label}</span>
        <span className="fflight-leg-date">{formatDateShort(first?.departureTime)}</span>
      </div>
      <div className="fflight-leg-route">
        <div className="fflight-leg-point">
          <p>{formatTimeHM(first?.departureTime) || "--:--"}</p>
          <span>{first?.originCode ?? "—"}</span>
        </div>
        <div className="fflight-leg-mid">
          <span>{formatDuration(duration)}</span>
          <div className="fleg-line" />
          <span>{stops === 0 ? "Direct" : stops === 1 ? "1 stop" : `${stops} stops`}</span>
        </div>
        <div className="fflight-leg-point fflight-leg-point--right">
          <p>
            {formatTimeHM(last?.arrivalTime) || "--:--"}
            {dayChange ? ` ${dayChange}` : ""}
          </p>
          <span>{last?.destinationCode ?? "—"}</span>
        </div>
      </div>
      <div className="fflight-segs">
        {leg.map((segment, index) => {
          const layover =
            index > 0
              ? minutesBetween(leg[index - 1]?.arrivalTime, segment?.departureTime)
              : null;
          return (
            <div key={segment?.segmentKey ?? index}>
              {Number.isFinite(layover) && layover > 0 && (
                <div className="fflight-layover">
                  <span>
                    Layover {formatDuration(layover)} in {segment?.originCode ?? ""}
                  </span>
                </div>
              )}
              <div className="fflight-seg">
                {segment?.carrier?.marketingLogo ? (
                  <img src={segment.carrier.marketingLogo} alt="" loading="lazy" />
                ) : null}
                <span>{segmentFlightLabel(segment)}</span>
                <span className="fflight-seg-time">
                  {formatTimeHM(segment?.departureTime)} {segment?.originCode} →{" "}
                  {formatTimeHM(segment?.arrivalTime)} {segment?.destinationCode}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const FlightDetails = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [session, setSession] = useState(null);
  const [counts, setCounts] = useState({ adults: 1, children: 0, infants: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [expired, setExpired] = useState(false);
  const [contact, setContact] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [soldOut, setSoldOut] = useState(false);
  // Защита от повторной инициализации формы при обновлении объекта user
  const loadedSessionRef = useRef("");

  useEffect(() => {
    if (loadedSessionRef.current === sessionId) return undefined;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const data = await flightsBookingService.getFlightSession(sessionId);
        if (cancelled) return;
        const next = data?.session ?? null;
        if (!next) throw new Error("Booking session not found");

        if (next.status === "CONFIRMED") {
          navigate(`/flightconfirmation?sessionId=${sessionId}`, { replace: true });
          return;
        }
        if (next.status === "PREBOOKED") {
          navigate(`/flightcheckout/${sessionId}`, { replace: true });
          return;
        }
        if (next.status !== "VERIFIED") {
          throw new Error("This booking session can no longer be used");
        }

        const nextCounts = countsOf(next.searchParams);
        setSession(next);
        setCounts(nextCounts);
        setContact({
          firstName: user?.firstname || "",
          lastName: user?.lastname || "",
          email: user?.email || "",
          phoneCountryCode: "971",
          phoneNumber: "",
        });
        setPassengers(buildPassengers(nextCounts, user));
        loadedSessionRef.current = sessionId;
      } catch (err) {
        if (!cancelled) setLoadError(err?.message || "Failed to load booking session");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate, user]);

  const journey = session?.verified?.journey ?? null;
  const legs = useMemo(() => (journey ? legsOf(journey) : []), [journey]);
  const legDurations = useMemo(
    () =>
      legs.map((leg) => {
        const first = leg[0];
        const last = leg[leg.length - 1];
        return minutesBetween(first?.departureTime, last?.arrivalTime);
      }),
    [legs],
  );
  const notices = useMemo(
    () => changeNotices(session?.verified?.changes),
    [session],
  );
  // Дата вылета — для возрастных правил пассажиров (DOB/паспорт)
  const travelDate = useMemo(() => {
    const first = legs[0]?.[0];
    return (
      parseDay(first?.departureTime) ||
      parseDay(session?.searchParams?.legs?.[0]?.date) ||
      new Date()
    );
  }, [legs, session]);
  const price = Number(session?.verifiedPrice) || 0;
  const currency = session?.currency || "AED";

  const updatePassenger = (index, patch) => {
    setPassengers((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  };

  const updateContact = (patch) => {
    setContact((prev) => ({ ...prev, ...patch }));
  };

  const validatePassengers = () => {
    for (let index = 0; index < passengers.length; index += 1) {
      const type = passengerTypeOf(index, counts);
      const rule = PASSENGER_RULES[type];
      const label = passengerLabel(index, counts);
      const age = ageOn(passengers[index].birthday, travelDate);
      if (age === null) return `${label}: please enter a valid date of birth.`;
      if (age < rule.minAge || age > rule.maxAge)
        return `${label} must be ${rule.rangeText} at the departure date.`;
      const expiry = parseDay(passengers[index].documentExpiry);
      if (expiry && expiry < travelDate)
        return `${label}: passport expiry must be on or after the departure date.`;
    }
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const validationError = validatePassengers();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    setExpired(false);
    setSoldOut(false);

    const cleanContact = {
      firstName: contact.firstName.trim(),
      lastName: contact.lastName.trim(),
      email: contact.email.trim(),
      phoneNumber: contact.phoneNumber.trim(),
      phoneCountryCode: contact.phoneCountryCode,
    };
    const cleanPassengers = passengers.map((item, index) => ({
      passengerType: passengerTypeOf(index, counts),
      title: item.title,
      firstName: item.firstName.trim(),
      lastName: item.lastName.trim(),
      birthday: item.birthday,
      gender: item.gender,
      nationality: item.nationality.trim().toUpperCase(),
      documentType: "passport",
      documentNumber: item.documentNumber.trim(),
      documentIssueCountry: item.documentIssueCountry.trim().toUpperCase(),
      documentExpiry: item.documentExpiry,
    }));

    try {
      await flightsBookingService.prebookFlight({
        sessionId,
        contact: cleanContact,
        passengers: cleanPassengers,
      });
      navigate(`/flightcheckout/${sessionId}`);
    } catch (err) {
      if (err?.code === "UNAUTHORIZED") {
        navigate("/login", { state: { from: `/flightpage/${sessionId}` } });
        return;
      }
      if (err?.code === "OFFER_EXPIRED") {
        setExpired(true);
      } else if (err?.code === "OFFER_SOLD_OUT") {
        setSoldOut(true);
      } else {
        setSubmitError(err?.message || "Could not start the booking, please try again.");
      }
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoader text="Loading your flight..." />;
  }

  if (loadError) {
    return (
      <main className="checkout-main-content">
        <div className="fpage-status form-card-ui animate-fade-in">
          <div className="error-banner">
            <p>{loadError}</p>
          </div>
          <button
            type="button"
            className="action-submit-btn"
            onClick={() => navigate("/flights")}
          >
            Search flights again
          </button>
        </div>
      </main>
    );
  }

  // Маршрут и даты — по первому направлению (для round-trip «туда», а не «туда→обратно→туда»)
  const outboundLeg = legs[0] ?? [];
  const firstSegment = outboundLeg[0] ?? {};
  const lastSegment = outboundLeg[outboundLeg.length - 1] ?? {};
  const routeTitle = `${firstSegment?.originCode ?? "—"} → ${
    lastSegment?.destinationCode ?? "—"
  }`;
  const totalPax = counts.adults + counts.children + counts.infants;
  const carrierNames = carriersOf(journey?.segments ?? [])
    .map((carrier) => carrier.name)
    .filter(Boolean)
    .join(", ");

  return (
    <main className="checkout-main-content">
      <form className="checkout-layout-container" onSubmit={handleSubmit}>
        <div className="checkout-left-panel fcheckout-panel">
          <button type="button" className="back-nav-btn" onClick={() => navigate(-1)}>
            <ChevronLeftIcon />
            <span>Back to search results</span>
          </button>

          <h1 className="page-main-title">Complete Your Booking</h1>

          {expired && (
            <div className="error-banner">
              <span className="error-icon">⚠️</span>
              <p>This offer has expired — please pick another flight.</p>
            </div>
          )}

          {soldOut && (
            <div className="error-banner">
              <span className="error-icon">⚠️</span>
              <p>This flight just sold out — please pick another flight from the results.</p>
            </div>
          )}

          {submitError && (
            <div className="error-banner">
              <span className="error-icon">⚠️</span>
              <p>{submitError}</p>
            </div>
          )}

          <div className="form-card-ui animate-fade-in">
            <div className="form-card-header">
              <div className="step-badge">Step 1 of 2</div>
              <h2>Flight details</h2>
              <p>
                {legs.length > 1 ? "Round trip" : "One way"} · {totalPax}{" "}
                {totalPax === 1 ? "passenger" : "passengers"}
              </p>
            </div>

            <div className="fflight-summary">
              {legs.map((leg, index) => (
                <LegSummary
                  key={index}
                  leg={leg}
                  label={legs.length > 1 ? (index === 0 ? "Outbound" : "Return") : "Flight"}
                />
              ))}
            </div>

            {notices.length > 0 && (
              <div className="fflight-changes">
                <p>Updated by the airline since your search:</p>
                <ul>
                  {notices.map((notice, index) => (
                    <li key={index}>{notice}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="form-card-ui animate-fade-in">
            <div className="form-card-header">
              <div className="step-badge">Step 2 of 2</div>
              <h2>Passengers</h2>
              <p>Travel document details must match the passenger&apos;s passport.</p>
            </div>

            <div className="fpax-list">
              {passengers.map((passenger, index) => {
                const type = passengerTypeOf(index, counts);
                const bounds = birthdayBounds(type, travelDate);
                return (
                <div className="fpax-card" key={index}>
                  <p className="fpax-card-title">
                    {passengerLabel(index, counts)}
                    <span className="fpax-card-hint">{PASSENGER_RULES[type].hint}</span>
                  </p>

                  <div className="fpax-grid fpax-grid--title">
                    <div className="input-field-wrapper">
                      <label htmlFor={`fpax-title-${index}`}>Title</label>
                      <select
                        id={`fpax-title-${index}`}
                        value={passenger.title}
                        onChange={(event) =>
                          updatePassenger(index, { title: event.target.value })
                        }
                      >
                        {TITLES.map((title) => (
                          <option key={title} value={title}>
                            {title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="input-field-wrapper">
                      <label htmlFor={`fpax-first-${index}`}>First name</label>
                      <input
                        id={`fpax-first-${index}`}
                        type="text"
                        required
                        value={passenger.firstName}
                        onChange={(event) =>
                          updatePassenger(index, { firstName: event.target.value })
                        }
                      />
                    </div>
                    <div className="input-field-wrapper">
                      <label htmlFor={`fpax-last-${index}`}>Last name</label>
                      <input
                        id={`fpax-last-${index}`}
                        type="text"
                        required
                        value={passenger.lastName}
                        onChange={(event) =>
                          updatePassenger(index, { lastName: event.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="fpax-grid">
                    <div className="input-field-wrapper">
                      <label htmlFor={`fpax-birth-${index}`}>Date of birth</label>
                      <input
                        id={`fpax-birth-${index}`}
                        type="date"
                        required
                        min={bounds.min ?? undefined}
                        max={bounds.max}
                        value={passenger.birthday}
                        onChange={(event) =>
                          updatePassenger(index, { birthday: event.target.value })
                        }
                      />
                    </div>
                    <div className="input-field-wrapper">
                      <label htmlFor={`fpax-gender-${index}`}>Gender</label>
                      <select
                        id={`fpax-gender-${index}`}
                        value={passenger.gender}
                        onChange={(event) =>
                          updatePassenger(index, { gender: event.target.value })
                        }
                      >
                        {GENDERS.map((gender) => (
                          <option key={gender.value} value={gender.value}>
                            {gender.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="input-field-wrapper">
                      <label htmlFor={`fpax-nat-${index}`}>Nationality (code)</label>
                      <input
                        id={`fpax-nat-${index}`}
                        type="text"
                        required
                        maxLength={2}
                        value={passenger.nationality}
                        onChange={(event) =>
                          updatePassenger(index, { nationality: event.target.value })
                        }
                      />
                    </div>
                    <div className="input-field-wrapper">
                      <label htmlFor={`fpax-doc-${index}`}>Passport number</label>
                      <input
                        id={`fpax-doc-${index}`}
                        type="text"
                        required
                        value={passenger.documentNumber}
                        onChange={(event) =>
                          updatePassenger(index, { documentNumber: event.target.value })
                        }
                      />
                    </div>
                    <div className="input-field-wrapper">
                      <label htmlFor={`fpax-issue-${index}`}>Passport issue country</label>
                      <input
                        id={`fpax-issue-${index}`}
                        type="text"
                        required
                        maxLength={2}
                        value={passenger.documentIssueCountry}
                        onChange={(event) =>
                          updatePassenger(index, {
                            documentIssueCountry: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="input-field-wrapper">
                      <label htmlFor={`fpax-exp-${index}`}>Passport expiry</label>
                      <input
                        id={`fpax-exp-${index}`}
                        type="date"
                        required
                        min={dateInputValue(travelDate)}
                        value={passenger.documentExpiry}
                        onChange={(event) =>
                          updatePassenger(index, { documentExpiry: event.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          <div className="form-card-ui animate-fade-in">
            <div className="form-card-header">
              <h2>Contact details</h2>
              <p>Your booking confirmation will be sent to this email.</p>
            </div>

            <div className="modern-booking-form">
              <div className="form-row-two-col">
                <div className="input-field-wrapper">
                  <label htmlFor="fcontact-first">First name</label>
                  <input
                    id="fcontact-first"
                    type="text"
                    required
                    value={contact.firstName}
                    onChange={(event) => updateContact({ firstName: event.target.value })}
                  />
                </div>
                <div className="input-field-wrapper">
                  <label htmlFor="fcontact-last">Last name</label>
                  <input
                    id="fcontact-last"
                    type="text"
                    required
                    value={contact.lastName}
                    onChange={(event) => updateContact({ lastName: event.target.value })}
                  />
                </div>
              </div>

              <div className="input-field-wrapper">
                <label htmlFor="fcontact-email">Email address</label>
                <input
                  id="fcontact-email"
                  type="email"
                  required
                  value={contact.email}
                  onChange={(event) => updateContact({ email: event.target.value })}
                />
              </div>

              <div className="fpax-grid fpax-grid--phone">
                <div className="input-field-wrapper">
                  <label htmlFor="fcontact-code">Country code</label>
                  <select
                    id="fcontact-code"
                    value={contact.phoneCountryCode}
                    onChange={(event) =>
                      updateContact({ phoneCountryCode: event.target.value })
                    }
                  >
                    {PHONE_CODES.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="input-field-wrapper">
                  <label htmlFor="fcontact-phone">Phone number</label>
                  <input
                    id="fcontact-phone"
                    type="tel"
                    required
                    inputMode="tel"
                    value={contact.phoneNumber}
                    onChange={(event) => updateContact({ phoneNumber: event.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="secure-badge-info">
            <SecurityIcon />
            <span>Your connection is fully secure and encrypted.</span>
          </div>

          <button type="submit" className="action-submit-btn" disabled={submitting}>
            {submitting
              ? "Checking availability..."
              : `Continue to payment · ${price.toFixed(2)} ${currency}`}
          </button>
        </div>

        <div className="checkout-right-panel">
          <div className="sticky-summary-card">
            <div className="summary-card-body">
              <h3 className="summary-hotel-name">{routeTitle}</h3>

              <div className="summary-meta-grid">
                <div className="meta-icon-row">
                  <EventIcon />
                  <div>
                    <span className="meta-label">Dates</span>
                    <span className="meta-value">
                      {formatDateShort(firstSegment?.departureTime) || "—"}
                      {legs.length > 1
                        ? ` — ${formatDateShort(
                            legs[1]?.[legs[1].length - 1]?.arrivalTime,
                          )}`
                        : ""}
                    </span>
                  </div>
                </div>

                <div className="meta-icon-row">
                  <PeopleIcon />
                  <div>
                    <span className="meta-label">Passengers</span>
                    <span className="meta-value">
                      {counts.adults} adults
                      {counts.children > 0 ? ` · ${counts.children} children` : ""}
                      {counts.infants > 0 ? ` · ${counts.infants} infants` : ""}
                    </span>
                  </div>
                </div>

                <div className="meta-icon-row">
                  <FlightTakeoffIcon />
                  <div>
                    <span className="meta-label">Airline</span>
                    <span className="meta-value">{carrierNames || "—"}</span>
                  </div>
                </div>

                <div className="meta-icon-row">
                  <AirlineStopsIcon />
                  <div>
                    <span className="meta-label">Stops</span>
                    <span className="meta-value">
                      {legs
                        .map((leg) =>
                          leg.length - 1 === 0
                            ? "Direct"
                            : `${leg.length - 1} stop${leg.length - 1 > 1 ? "s" : ""}`,
                        )
                        .join(" · ")}
                    </span>
                  </div>
                </div>

                <div className="meta-icon-row">
                  <AccessTimeIcon />
                  <div>
                    <span className="meta-label">
                      {legs.length > 1 ? "Duration" : "Total duration"}
                    </span>
                    <span className="meta-value">
                      {legs.length > 1
                        ? legDurations
                            .map((minutes) => formatDuration(minutes))
                            .filter(Boolean)
                            .join(" · ") || "—"
                        : formatDuration(journey?.totalDuration) ||
                          formatDuration(legDurations[0]) ||
                          "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="summary-price-breakdown-divider" />

              <div className="price-summary-table">
                <div className="price-row">
                  <span>Subtotal</span>
                  <span>
                    {price.toFixed(2)} {currency}
                  </span>
                </div>
                <div className="price-row">
                  <span>Taxes & Fees</span>
                  <span className="green-text">Included</span>
                </div>
                <div className="price-row total-row-highlight">
                  <span>Total amount</span>
                  <span>
                    {price.toFixed(2)} {currency}
                  </span>
                </div>
              </div>

              {session?.expiresAt && (
                <p className="fpage-note">
                  Price held until {formatTimeHM(session.expiresAt)}
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
    </main>
  );
};

export default FlightDetails;
