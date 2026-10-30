import { useParams } from "react-router-dom";
import Nav from "../componets/navbardark/Nav";
import TourPayment from "../componets/tourpayment/TourPayment";

const TourPaymentPage = () => {
  const { prebookingId } = useParams();

  return (
    <div className="hconteiner">
      <Nav />
      <TourPayment prebookingId={prebookingId} />
    </div>
  );
};

export default TourPaymentPage;
