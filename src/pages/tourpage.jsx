import { useParams, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import Nav from "../componets/navbardark/Nav";
import Tour from "../componets/tourpage/Tour";
import Loader from "../componets/loaders/loading";


const Tourpage = () => {
  const { id } = useParams();
  const location = useLocation();
  const initialTour = location.state?.tour ?? null;

  const [tour, setTour] = useState(initialTour);
  const [loading, setLoading] = useState(!initialTour);
  const [error, setError] = useState(null);

  const fetchTour = useCallback(() => {
    fetch("https://solver.ae/version-live/api/1.1/obj/TourData")
      .then((res) => {
        if (!res.ok) throw new Error("Server error");
        return res.json();
      })
      .then((results) => {
        const data = results?.response?.results ?? [];
        const found = data.find((item) => String(item.tourId) === String(id));
        if (!found) throw new Error("Not found");
        setTour(found);
      })
      .catch((e) => {
        console.error(e);
        setError("Tour not found. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (tour) return;
    fetchTour();
  }, [tour, fetchTour]);

  const retry = () => {
    setLoading(true);
    setError(null);
    fetchTour();
  };

  return (
    <div className="page-loading-wrap">
      <Nav />
      {tour ? (
        <Tour tour={tour} />
      ) : (
        <div className="page-loading">
          {loading ? (
            <Loader />
          ) : (
            <>
              <p className="page-error-text">{error}</p>
              <button className="page-error-btn" onClick={retry}>
                Retry
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Tourpage;
