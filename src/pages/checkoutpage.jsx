import {  useLocation } from "react-router-dom";
import { useState } from "react";
import Nav from "../componets/navbardark/Nav";
import Checkout from "../componets/hotels/checkout/Checkout";

const readStoredOffer = () => {
  try {
    const stored = JSON.parse(sessionStorage.getItem("hotelCheckoutOffer") || "null");
    return stored ? [stored] : [];
  } catch {
    return [];
  }
};

const CheckoutPage = () => {
  const location = useLocation();
  const [offerItem] = useState(() =>
    location.state?.offerItem?.length ? location.state.offerItem : readStoredOffer(),
  );
  return (
    <div>
      <Nav />
      <Checkout offerItem={offerItem} />
    </div>
  );
};

export default CheckoutPage;
