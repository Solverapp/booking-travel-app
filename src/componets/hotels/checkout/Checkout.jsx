import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { usePrebookHotel } from "../../../hooks/mutations/useHotelBookingMutations";
import { CalendarMonth, Hotel, People, Security, Restaurant, ChevronLeft, RestoreOutlined } from '@mui/icons-material';
import PageLoader from "../../loaders/PageLoader";
import { getStoredCurrency } from "../../../utils/currency";
import {
  excludedTaxItems,
  formatMoney,
  formatTaxTotals,
  taxesAndFeesBreakdown,
} from "../../../utils/hotelRate";
import "./style.css";

const CheckoutPage = ({ offerItem }) => {
  const navigate = useNavigate();
  const prebookHotel = usePrebookHotel();
  const offer = offerItem?.[0] || offerItem;

  const handleBack = () => {
    const params = new URLSearchParams({
      city: city || '',
      checkIn: checkin || '',
      checkOut: checkout || '',
      adults: String(adults || 2),
      children: String(children || 0),
      pleaseId: pleaseId || '',
    });
    navigate(`/hotels?${params.toString()}`);
  };

  const offerId = offer?.offerId;
  const hotelName = offer?.hotelName || "Hotel";
  const checkin = offer?.checkinDate;
  const checkout = offer?.checkoutDate;
  const adults = offer?.adults || 2;
  const children = offer?.childrens || 0;
  const city = offer?.city || "";
  const pleaseId = offer?.please || "";
  const roomName = offer?.roomName || "Standard Room";
  const retaliPrice = offer?.totalAmount || 0;
  const priceCurrency = offer?.priceInfo?.currency || getStoredCurrency();
  const mainPhoto = offer?.imgurl || offer?.main_photo;
  const taxesBreakdown = taxesAndFeesBreakdown(offer?.taxes);
  const includedTaxes = formatTaxTotals(taxesBreakdown.includedTotals);
  const excludedTaxes = formatTaxTotals(taxesBreakdown.excludedTotals);
  const excludedTaxLines = excludedTaxItems(offer?.taxes);

  const [step, setStep] = useState("guest-details");
  const [prebookData, setPrebookData] = useState(null);
  const [guestDetails, setGuestDetails] = useState({ firstName: "", lastName: "", email: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!offer) return;
    try {
      sessionStorage.setItem("hotelCheckoutOffer", JSON.stringify(offer));
    } catch {
      // Storage may be unavailable in private browsing; checkout still works.
    }
  }, [offer]);

  const handleGuestDetailsSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStep("processing");
    localStorage.setItem("guestDetails", JSON.stringify(guestDetails));

    // Сохраняем детали номера/питания/возврата, чтобы показать их в бронировании профиля
    localStorage.setItem("hotelBookingMeta", JSON.stringify({
      hotelName,
      roomName,
      boardName: offer?.boardName || "",
      refundableTag: offer?.refundableTag || "",
      checkin: checkin || "",
      checkout: checkout || "",
      adults,
      children,
      totalAmount: retaliPrice,
      photo: mainPhoto || "",
      rateId: offer?.rateId || "",
      bedType: offer?.bedType || "",
      roomSize: offer?.roomSize || "",
      maxGuests: offer?.maxGuests ?? null,
      cancelPolicy: offer?.cancelPolicy ?? null,
      priceInfo: offer?.priceInfo ?? null,
      taxes: Array.isArray(offer?.taxes) ? offer.taxes : [],
      hotelInfo: offer?.hotelInfo ?? null,
    }));

    try {
      const body = { usePaymentSdk: true, offerId };
      const data = await prebookHotel.mutateAsync(body);

      if (data?.error) {
        setError(data.error.description || "Failed to prebook");
        setStep("guest-details");
        return;
      }
      setPrebookData(data?.data ?? null);
      setStep("payment");
    } catch (err) {
      setError(err?.message || "Failed to process booking");
      setStep("guest-details");
    }
  };

  useEffect(() => {
    if (step !== 'payment' || !prebookData) return;

    const script = document.createElement('script');
    script.src = 'https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1';
    script.async = true;
    document.body.appendChild(script);

        script.onload = () => {
      const container = document.getElementById("payment-target");
      if (!container || !window.LiteAPIPayment) return;

      // 🟢 Собираем параметры поиска, чтобы прокинуть их на страницу подтверждения
      const searchUrlParams = new URLSearchParams({
        pleaseId,
        placeName: hotelName,
        checkIn: checkin || '',
        checkOut: checkout || '',
        adults: String(adults),
        children: String(children),
        city,
      }).toString();

      const config = {
        publicKey: "sandbox",
        secretKey: prebookData.secretKey,
        // 🟢 Дописываем &\${searchUrlParams} в конец ссылки возврата
        returnUrl: `${window.location.origin}/confirmation?prebookId=${prebookData.prebookId}&transactionId=${prebookData.transactionId}&${searchUrlParams}`,
        targetElement: "#payment-target",
        appearance: { theme: "flat" },
        options: {
          business: { name: "Solver Hotels" },
          paymentTypes: prebookData.roomTypes?.[0]?.rates?.[0] ? ["NUITEE_PAY"] : undefined,
        },
      };

      const payment = new window.LiteAPIPayment(config);
      payment.handlePayment();
    };


    return () => {
      const scriptEl = document.querySelector('script[src*="liteAPIPayment"]');
      if (scriptEl) scriptEl.remove();
    };
  }, [step, prebookData, pleaseId, hotelName, checkin, checkout, adults, children, city]);

  if (!offer) {
    return (
      <main className="checkout-main-content">
        <div className="checkout-layout-container">
          <div className="checkout-left-panel">
            <button type="button" className="back-nav-btn" onClick={() => navigate("/hotels")}>
              <ChevronLeft />
              <span>Back to search results</span>
            </button>
            <div className="error-banner">
              <p>Offer details are no longer available. Please select a room again.</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (step === 'processing') {
    return <PageLoader text="Securing your room, please wait..." />;
  }

  return (
    <main className="checkout-main-content">
      <div className="checkout-layout-container">
        
        {/* ЛЕВАЯ КОЛОНКА: Формы */}
        <div className="checkout-left-panel">
          <button className="back-nav-btn" onClick={handleBack}>
            <ChevronLeft />
            <span>Back to search results</span>
          </button>
          
          <h1 className="page-main-title">Complete Your Booking</h1>

          {error && (
            <div className="error-banner">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {step === 'guest-details' && (
            <div className="form-card-ui animate-fade-in">
              <div className="form-card-header">
                <div className="step-badge">Step 1 of 2</div>
                <h2>Guest Details</h2>
                <p>Please enter the information of the person leading the check-in.</p>
              </div>

              <form onSubmit={handleGuestDetailsSubmit} className="modern-booking-form">
                <div className="form-row-two-col">
                  <div className="input-field-wrapper">
                    <label htmlFor="firstname">First name</label>
                    <input
                      id="firstname"
                      type="text"
                      required
                      value={guestDetails.firstName}
                      onChange={(e) => setGuestDetails({ ...guestDetails, firstName: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div className="input-field-wrapper">
                    <label htmlFor="lastname">Last name</label>
                    <input
                      id="lastname"
                      type="text"
                      required
                      value={guestDetails.lastName}
                      onChange={(e) => setGuestDetails({ ...guestDetails, lastName: e.target.value })}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="input-field-wrapper">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={guestDetails.email}
                    onChange={(e) => setGuestDetails({ ...guestDetails, email: e.target.value })}
                    placeholder="john.doe@example.com"
                  />
                  <small className="field-hint">Your booking confirmation voucher will be sent here.</small>
                </div>

                <div className="secure-badge-info">
                  <Security />
                  <span>Your connection is fully secure and encrypted.</span>
                </div>

                <button type="submit" className="action-submit-btn">
                  Continue to Payment
                </button>
              </form>
            </div>
          )}

          {step === 'payment' && (
            <div className="form-card-ui animate-fade-in">
              <div className="form-card-header">
                <div className="step-badge">Step 2 of 2</div>
                <h2>Secure Payment</h2>
                <p>Please complete your transaction details below.</p>
              </div>
              <div className="payment-gateway-wrapper">
                <div id="payment-target" className="payment-box"></div>
              </div>
            </div>
          )}
        </div>

        {/* ПРАВАЯ КОЛОНКА: Липкий виджет (Booking Summary) */}
        <div className="checkout-right-panel">
          <div className="sticky-summary-card">
            {mainPhoto && (
              <div className="summary-hero-image">
                <img src={mainPhoto} alt={hotelName} loading="lazy" />
                <div className="summary-price-badge">{Number(retaliPrice).toFixed(0)} {priceCurrency}</div>
              </div>
            )}
            
            <div className="summary-card-body">
              <h3 className="summary-hotel-name">{hotelName}</h3>
              
              <div className="summary-meta-grid">
                <div className="meta-icon-row">
                  <CalendarMonth />
                  <div>
                    <span className="meta-label">Dates</span>
                    <span className="meta-value">{checkin} — {checkout}</span>
                  </div>
                </div>

                <div className="meta-icon-row">
                  <Hotel />
                  <div>
                    <span className="meta-label">Room Type</span>
                    <span className="meta-value">{roomName}</span>
                  </div>
                </div>

                <div className="meta-icon-row">
                  <People />
                  <div>
                    <span className="meta-label">Guests</span>
                    <span className="meta-value">Adults: {adults} · Children: {children}</span>
                  </div>
                </div>

                {offer?.boardName && (
                  <div className="meta-icon-row">
                    <Restaurant />
                    <div>
                      <span className="meta-label">Meal Plan</span>
                      <span className="meta-value">{offer.boardName}</span>
                    </div>
                  </div>
                )}

                 {offer?.refundableTag === "RFN" && (
                  <div className="secure-badge-info">
                    <RestoreOutlined />
                    
                      
                      <span className="succes-value">Free cancellation available</span>
                    
                  </div>
                )}
                
              </div>

              <div className="summary-price-breakdown-divider" />

              <div className="price-summary-table">
                <div className="price-row">
                  <span>Subtotal</span>
                  <span>{Number(retaliPrice).toFixed(2)} {priceCurrency}</span>
                </div>
                <div className="price-row">
                  <span>Taxes & Fees</span>
                  <span className="green-text">
                    {includedTaxes ? `${includedTaxes} included` : "Included"}
                  </span>
                </div>
                {excludedTaxes && (
                  <div className="price-row">
                    <span>Payable at hotel</span>
                    <span className="checkout-tax-excluded">+ {excludedTaxes}</span>
                  </div>
                )}
                {excludedTaxLines.map((tax) => (
                  <div
                    className="price-row checkout-tax-row"
                    key={`${tax.description}-${tax.currency}`}
                  >
                    <span>{tax.description}</span>
                    <span>{formatMoney(tax.amount, tax.currency)}</span>
                  </div>
                ))}
                <div className="price-row total-row-highlight">
                  <span>Total amount</span>
                  <span>{Number(retaliPrice).toFixed(2)} {priceCurrency}</span>
                </div>
              </div>

                            <div className="summary-price-breakdown-divider" />

              
           {/* {offer?.refundableTag === "RFN" && (
                <div className="cancellation-summary-alert free-cancel">
                  <span className="indicator-dot"></span>
                  <p>Free cancellation available</p>
                </div>
              )} */}
             
            </div>
          </div>
        </div>

      </div>
    </main>
  );
};

export default CheckoutPage;
