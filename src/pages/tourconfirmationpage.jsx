import { useSearchParams } from "react-router-dom";
import Nav from "../componets/navbardark/Nav";
import TourConfirmation from "../componets/tourconfirmation/TourConfirmation";

const TourConfirmationPage = () => {
  const [searchParams] = useSearchParams();
  const prebookingId = searchParams.get("prebookingId");

  return (
    <div className="hconteiner">
      <Nav />
      <TourConfirmation prebookingId={prebookingId} />
    </div>
  );
};

export default TourConfirmationPage;
