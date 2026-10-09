import { useSearchParams, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, Suspense } from "react";
import { hotelPrebookService } from "../../../services/SupebasePrebookService";
import "./style.css";
import left from "../../../img/icons/tabicons/arrow-left.svg";
import Loader from "../../loaders/loading";


const CheckoutPage = ({offerItem}) => {
  const navigate = useNavigate();
  const offer = offerItem[0];
  const handleBack = () => {
  const params = new URLSearchParams({
    city: offer.city,
    checkIn: offer.checkinDate,
    checkOut : offer.checkoutDate,
    adults: offer.adults,
    children: offer.childrens,
    pleaseId: offer.please,
  });
  navigate(`/hotels?${params.toString()}`);
};
  const [searchParams] = useSearchParams();
  const offerId = offer.offerId;
  const hotelId = offer.hid;
  const hotelName = offer.hotelName;
  const checkin = offer.checkinDate;
  const checkout = offer.checkoutDate;
  const adults = offer.adults;
  const children = offer.childrens;
  const guests = offer.guests;
  const roomName = offer.roomName;
  const retaliPrice = offer.totalAmount;
  const [step, setStep] = useState("guest-details");
  const [prebookData, setPrebookData] = useState(null);
  const [guestDetails, setGuestDetails] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [error, setError] = useState("");

  const handleGuestDetailsSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStep("processing");

    localStorage.setItem("guestDetails", JSON.stringify(guestDetails));

    try {
      const body = {
        usePaymentSdk: true,
        offerId,
      };

      const data = await hotelPrebookService.fetchPreBook(body);

      if (data?.error) {
        setError(data.error.description || "Failed to prebook");
        setStep("guest-details");
        return;
      }

      setPrebookData(data?.data ?? null);
      setStep("payment");
    } catch (err) {
      setError("Failed to process booking");
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

    const config = {
    publicKey: "sandbox",
    secretKey: prebookData.secretKey,
    returnUrl: `${window.location.origin}/confirmation?prebookId=${prebookData.prebookId}&transactionId=${prebookData.transactionId}`,
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
  }, [step, prebookData]);
  
if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A8A] mx-auto mb-4"></div>
          <Loader/>
          <p className="text-[#1E3A8A] font-medium">Processing your booking...</p>
        </div>
      </div>
    );
  }


  return (<main className="contents">
        <div className="bookcontainer">
          <div className="bookinfo">
            <div className="backoption">
              <button onClick={() => handleBack()}>
                <img src={left} alt="back" />
                <span>Back</span>
              </button>
              <h2 className="title">Complete Your Booking</h2>
              </div>
                <div className="bookinfohederpage">
                <div className="bookhederbox">   
                 <div className="containerchek-book">
            <div className="cardnew cart">
              <div className="steps">
                <div className="step">
                  <div>
                  <span>Checkin && Checkout</span>
                  <p>{(checkin)} - {(checkout)}</p>
                  </div>
              <hr/>
                </div>
                <div className="step">
                  <div>
                  <span>Hotel detalis</span>
                  <p>{hotelName}</p>
                  </div>
              <hr/>
                </div>
                <div className="step">
                  <div>
                  <span>Guests detalis</span>
                  <p>Adults {adults} · Childrens {children}</p>
                  </div>
              <hr/>
                </div>
                <div className="step">
                  <div>
                  <span>Room detalis</span>
                  <p>Room type {roomName} </p>
                  </div>
              <hr/>
                </div>
                <div className="step">
                  <div>
                  <span>Subtotal</span>
                  <p>{retaliPrice} AED</p>
                  </div>
              <hr/>
                </div>
            <div className="checkout">
              <div className="footer">
                <span>Total amount</span>
                  <p>{retaliPrice} AED</p>
              </div>
            </div>
            
              </div>
              
            </div>
            
                 </div>
                 </div>
            <div className="bookhederbox">
          {error && (
            <div className="hconteiner">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {step === 'guest-details' && (
          <div className="card_new">
            <form className="form_new" onSubmit={handleGuestDetailsSubmit}>
              <h3 className="title_new">Your details</h3>
              <div className="group"> 
                    <input
                    id = "firstname"
                    type="text"
                    required
                    value={guestDetails.firstName}
                    onChange={(e) => setGuestDetails({ ...guestDetails, firstName: e.target.value })}
                    
                  />
                  <label htmlFor="firstname">First name</label>
                  </div>
                <div className="group">
                    <input
                    id = "lastname"
                    type="text"
                    required
                    value={guestDetails.lastName}
                    onChange={(e) => setGuestDetails({ ...guestDetails, lastName: e.target.value })}
                    
                  />
                 <label htmlFor="lastname">Last name</label>
                  </div>
                  <div className="group">
                  
                  <input
                  id = "email"
                  type="email"
                  required
                  value={guestDetails.email}
                  onChange={(e) => setGuestDetails({ ...guestDetails, email: e.target.value })}
                 
                />
                <label htmlFor="email">Email</label>
                
              </div>
              
              <button
                type="submit"
                className="submit"
              >
                Continue to Payment
              </button>
            </form>
            </div>
            
          )}

          {step === 'payment' && (
            <div className="stripe-box">
              
              <h3 >Payment Details</h3>
              <div id="payment-target" className="payment-box"></div>
            </div>
          )}
                </div>
          </div>
          </div>
        </div>
      </main>
    );
};

export default CheckoutPage;
