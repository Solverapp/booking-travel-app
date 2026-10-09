import { useParams, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Nav from "../componets/navbardark/Nav";
import Tour from "../componets/tourpage/Tour";


const Tourpage = () => {
  const { id } = useParams();
  const location = useLocation();
  const initialTour = location.state?.tour ?? null;

  const [tour, setTour] = useState(initialTour);

  useEffect(() => {
    if (tour) return;

    fetch("https://solver.ae/version-live/api/1.1/obj/TourData")
      .then((res) => res.json())
      .then((results) => {
        const data = results?.response?.results ?? [];
        const found = data.find((item) => String(item.tourId) === String(id));
        setTour(found ?? null);
      })
      .catch((e) => console.error(e));
  }, [tour, id]);

  return (
    <div>
      <Nav />
      {tour ? <Tour tour={tour} /> : <div>Loading...</div>}
    </div>
  );
};

export default Tourpage;
