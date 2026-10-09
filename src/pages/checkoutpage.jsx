import {  useLocation } from "react-router-dom";
import { useState } from "react";
import Nav from "../componets/navbardark/Nav";
import Checkout from "../componets/hotels/checkout/Checkout";


const CheckoutPage = () => {
  const location = useLocation();
  const initialOfferItem = location.state?.offerItem ?? [];
  const [offerItem, setOfferItem] = useState(initialOfferItem);
  return (
    <div>
      <Nav />
      <Checkout offerItem={offerItem} setOfferItem={setOfferItem} />
    </div>
  );
};

export default CheckoutPage;
