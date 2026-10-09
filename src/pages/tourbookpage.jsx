import { useParams, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Nav from "../componets/navbardark/Nav";
import TourBook from "../componets/tourbook/TourBook";


const TourBokpage = () => {
  const { id } = useParams();
  const location = useLocation();
  const initialCardItem = location.state?.cardItem ?? [];
  

  const [cardItem, setCardItem] = useState(initialCardItem);

  

  return (
    <div>
      <Nav />
      <TourBook cardItem={cardItem} setCardItem={setCardItem} />
    </div>
  );
};

export default TourBokpage;
