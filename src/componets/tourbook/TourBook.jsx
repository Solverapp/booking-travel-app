import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Security } from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import { useCreateTourPrebooking } from "../../hooks/mutations/useTourPrebooking";
import {
  PHONE_CODES,
  TOUR_PREFIXES,
  clearTourCheckoutItem,
  formatAed,
  getTourB2cPricing,
  normalizePhoneDigits,
  requiresPickup,
  tourGuestCount,
  transferLabel,
  transferTypeOf,
} from "../../utils/tourCheckout";
import {
  COUNTRIES,
  DEFAULT_PHONE_COUNTRY_CODE,
  getCountryName,
} from "../../utils/countries";
import TourSummary from "./TourSummary";
import "./style.css";

const TourBook = ({ item }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createPrebooking = useCreateTourPrebooking();
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState(() => ({
    prefix: "Mr",
    firstName: user?.firstname || "",
    lastName: user?.lastname || "",
    email: user?.email || "",
    phoneCountryCode: user?.phoneCountryCode || DEFAULT_PHONE_COUNTRY_CODE,
    phoneNumber: user?.phoneNumber || "",
    nationality: getCountryName(user?.nationality),
    pickup: "",
  }));

  const transferType = transferTypeOf(item);
  const pickupRequired = requiresPickup(transferType);
  const totalGuests = tourGuestCount(item);
  const pricing = getTourB2cPricing(item);

  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleBack = () => {
    const params = new URLSearchParams({
      city: item.city || item.tourCity || "",
      checkIn: item.tourDate || "",
      adults: "1",
      children: "0",
      infants: "0",
    });
    navigate(`/tours?${params.toString()}`);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (createPrebooking.isPending) return;

    setSubmitError("");

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();
    const nationality = form.nationality.trim();
    const pickup = form.pickup.trim();
    const phoneNumber = normalizePhoneDigits(form.phoneNumber);

    if (!firstName) {
      setSubmitError("Please enter your first name.");
      return;
    }
    if (!lastName) {
      setSubmitError("Please enter your last name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSubmitError("Please enter a valid email address.");
      return;
    }
    if (phoneNumber.length < 6 || phoneNumber.length > 15) {
      setSubmitError("Please enter a valid phone number.");
      return;
    }
    if (!nationality) {
      setSubmitError("Please enter your nationality.");
      return;
    }
    if (pickupRequired && !pickup) {
      setSubmitError("Please enter the pickup location for this transfer.");
      return;
    }

    try {
      const data = await createPrebooking.mutateAsync({
        tourId: Number(item.tourId),
        optionId: Number(item.optionId),
        transferId: Number(item.transferId),
        tourDate: item.tourDate,
        adult: Number(item.adult) || 1,
        child: Number(item.child) || 0,
        infant: Number(item.infant) || 0,
        slotId: item.slotId ? String(item.slotId) : undefined,
        pickup: pickupRequired ? pickup : "",
        tourName: item.tourName,
        city: item.city || item.tourCity || "",
        tourImage: item.tourImage || "",
        client: {
          prefix: form.prefix,
          firstName,
          lastName,
          email,
          phoneCountryCode: normalizePhoneDigits(form.phoneCountryCode),
          phoneNumber,
          nationality,
        },
      });

      if (!data?.prebooking?.id) {
        throw new Error("Pre-booking was not created.");
      }

      clearTourCheckoutItem();
      navigate(`/tourpayment/${data.prebooking.id}`);
    } catch (error) {
      setSubmitError(
        error?.message ||
          "Could not create your pre-booking. Please try again.",
      );
    }
  };

  return (
    <main className="checkout-main-content tcheckout-page">
      <form
        className="checkout-layout-container"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="checkout-left-panel fcheckout-panel">
          <button type="button" className="back-nav-btn" onClick={handleBack}>
            <ChevronLeft />
            <span>Back to tour options</span>
          </button>

          <h1 className="page-main-title">Complete Your Booking</h1>

          {submitError ? (
            <div className="error-banner">
              <span className="error-icon">!</span>
              <p>{submitError}</p>
            </div>
          ) : null}

          <div className="form-card-ui animate-fade-in">
            <div className="form-card-header">
              <div className="step-badge">Step 1 of 3</div>
              <h2>Lead passenger details</h2>
              <p>
                {totalGuests} {totalGuests === 1 ? "guest" : "guests"} ·{" "}
                {item.optionName || "Selected tour option"}
              </p>
            </div>

            <div className="modern-booking-form">
              <div className="form-row-two-col tcheckout-name-grid">
                <div className="input-field-wrapper">
                  <label htmlFor="tour-prefix">Prefix</label>
                  <select
                    id="tour-prefix"
                    value={form.prefix}
                    onChange={(event) => update("prefix", event.target.value)}
                  >
                    {TOUR_PREFIXES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="input-field-wrapper">
                  <label htmlFor="tour-first-name">First name</label>
                  <input
                    id="tour-first-name"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={form.firstName}
                    onChange={(event) => update("firstName", event.target.value)}
                  />
                </div>
                <div className="input-field-wrapper">
                  <label htmlFor="tour-last-name">Last name</label>
                  <input
                    id="tour-last-name"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={form.lastName}
                    onChange={(event) => update("lastName", event.target.value)}
                  />
                </div>
              </div>

              <div className="input-field-wrapper">
                <label htmlFor="tour-email">Email address</label>
                <input
                  id="tour-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                />
              </div>

              <div className="tcheckout-phone-grid">
                <div className="input-field-wrapper">
                  <label htmlFor="tour-phone-code">Country code</label>
                  <select
                    id="tour-phone-code"
                    autoComplete="tel-country-code"
                    value={form.phoneCountryCode}
                    onChange={(event) =>
                      update("phoneCountryCode", event.target.value)
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
                  <label htmlFor="tour-phone">Phone number</label>
                  <input
                    id="tour-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    required
                    placeholder="50 123 4567"
                    value={form.phoneNumber}
                    onChange={(event) =>
                      update("phoneNumber", event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="input-field-wrapper">
                <label htmlFor="tour-nationality">Nationality</label>
                <select
                  id="tour-nationality"
                  autoComplete="country-name"
                  required
                  value={form.nationality}
                  onChange={(event) =>
                    update("nationality", event.target.value)
                  }
                >
                  <option value="">Select nationality</option>
                  {COUNTRIES.map(({ code, name }) => (
                    <option key={code} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-card-ui animate-fade-in">
            <div className="form-card-header">
              <div className="step-badge">Step 1 of 3</div>
              <h2>Transfer & pickup</h2>
              <p>
                {transferLabel(transferType)}
                {item.transferName && transferType === "other"
                  ? ` · ${item.transferName}`
                  : ""}
              </p>
            </div>

            {pickupRequired ? (
              <div className="input-field-wrapper">
                <label htmlFor="tour-pickup">Pickup location</label>
                <input
                  id="tour-pickup"
                  type="text"
                  required
                  placeholder="Hotel name and area"
                  value={form.pickup}
                  onChange={(event) => update("pickup", event.target.value)}
                />
              </div>
            ) : (
              <p className="tcheckout-pickup-note">
                This option does not include a transfer, so no pickup location
                is needed.
              </p>
            )}
          </div>

          <div className="secure-badge-info">
            <Security />
            <span>Your connection is fully secure and encrypted.</span>
          </div>

          <button
            type="submit"
            className="action-submit-btn"
            disabled={createPrebooking.isPending}
          >
            {createPrebooking.isPending
              ? "Creating pre-booking..."
              : `Create pre-booking · ${formatAed(pricing.total)}`}
          </button>
        </div>

        <TourSummary item={item} />
      </form>
    </main>
  );
};

export default TourBook;
