import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Nav from "../componets/navbardark/Nav";
import TourBook from "../componets/tourbook/TourBook";
import PageLoader from "../componets/loaders/PageLoader";
import { readTourCheckoutItem } from "../utils/tourCheckout";

const TourBokpage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [item] = useState(() => {
    const stateItem = Array.isArray(location.state?.cardItem)
      ? location.state.cardItem[0]
      : location.state?.cardItem;
    return stateItem ?? readTourCheckoutItem();
  });

  useEffect(() => {
    if (!item) {
      navigate("/tours", { replace: true });
    }
  }, [item, navigate]);

  if (!item) {
    return <PageLoader text="Redirecting to tours..." />;
  }

  return (
    <div className="hconteiner">
      <Nav />
      <TourBook item={item} />
    </div>
  );
};

export default TourBokpage;
