import { useSearchParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import "./style.css";
import { Rating } from "@mui/material";
import PageLoader from "../../loaders/PageLoader";
import HotelGallery from "../../slider/HotelGallery";
import SentimentBlock from "./SentimentBlock";
import GuestReviews from "./GuestReviews";
import PopularFacilities from "./PopularFacilities";
import Rooms from "../rooms/Roomsnew";

import left from "../../../img/icons/tabicons/arrow-left.svg";
import searchIcon from "../../../img/icons/tabicons/search-normal.svg";
import loc from "../../../img/icons/tabicons/location.svg";


import { useHotelDetail } from "../../../hooks/queries/useHotelDetail";
import { useHotelDetailRates } from "../../../hooks/queries/useHotelDetailRates";
import { normalizeHotelSearch } from "../../../utils/queryParams";
import { getStoredCurrency } from "../../../utils/currency";
import { useAuth } from "../../../context/AuthContext";

const HotelDetails = ({ id }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const hotelId = id?.id;

  const search = useMemo(() => normalizeHotelSearch(searchParams), [searchParams]);
  const { city, placeId, checkIn, checkOut, adults, children, childrenAges } = search;
  const currency = user?.currency || getStoredCurrency();

  const detailQuery = useHotelDetail(hotelId);
  const ratesQuery = useHotelDetailRates({ hotelId, search, currency });

  const hotel = detailQuery.data;
  const images = hotel?.hotelImages || [];
  const hotelFacilities = hotel?.facilities || [];
  const rooms = hotel?.rooms || [];
  const rates = ratesQuery.data?.roomTypes || [];
  const loading = detailQuery.isLoading;
  const error = detailQuery.error?.message || ratesQuery.error?.message || "";

  const nights = useMemo(() => {
    const from = checkIn ? new Date(checkIn) : null;
    const to = checkOut ? new Date(checkOut) : null;
    if (!from || !to || to <= from) return 0;
    return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  }, [checkIn, checkOut]);

  const handleBack = () => {
    const params = new URLSearchParams();
    params.set("city", city || "");
    params.set("pleaseId", placeId || "");
    params.set("checkIn", checkIn || "");
    params.set("checkOut", checkOut || "");
    params.set("adults", String(adults));
    params.set("children", String(children));
    if (childrenAges?.length > 0) {
      params.set("childrenAges", childrenAges.join(","));
    }
    navigate(`/hotels?${params.toString()}`);
  };

  const checkinCheckoutTimes = hotel?.checkinCheckoutTimes || null;
  const checkinInstructions = Array.isArray(checkinCheckoutTimes?.instructions)
    ? checkinCheckoutTimes.instructions.filter((item) => item?.instruction)
    : [];
  const hasCheckinCheckoutInfo = Boolean(
    checkinCheckoutTimes?.checkin_start ||
      checkinCheckoutTimes?.checkin_end ||
      checkinCheckoutTimes?.checkout ||
      checkinInstructions.length ||
      checkinCheckoutTimes?.special_instructions,
  );
  const checkinWindow = [
    checkinCheckoutTimes?.checkin_start,
    checkinCheckoutTimes?.checkin_end,
  ]
    .filter(Boolean)
    .join(" – ");

  return (
    <div className="maincontent">
      <div className="hcontainer">
        {loading ? (
          <PageLoader embedded />
        ) : !hotel ? (
          <div className="option-not">
            <img src={searchIcon} alt="hotel" />
            <h3>{error ? "Could not load hotel" : "Nothing found matching your request"}</h3>
            <span>{error || "Please specify other search parameters"}</span>
          </div>
        ) : (
          <div className="hotinfo">
            <div className="backoption">
              <button onClick={handleBack}>
                <img src={left} alt="back" />
                <span>Back</span>
              </button>
              </div>

            <div className="hotel-hero">
              <div className="hotel-hero-media">
                <HotelGallery images={images} />
              </div>
              <div className="hotel-hero-info">
                <div className="hotel-hero-head">
                  <h1>{hotel.name}</h1>
                  <div className="hotel-hero-rating">
                    <Rating
                      name="hotel-stars"
                      value={hotel.starRating ?? 0}
                      max={5}
                      precision={1}
                      readOnly
                      size="small"
                    />
                    <span>. {hotel.reviewCount} reviews</span>
                  </div>
                  <div className="hotel-hero-loc">
                    <img src={loc} alt="location" />
                    <span>{`${hotel.city || ""}, ${hotel.country || ""}`}</span>
                    <button><span>Show on map</span></button>
                  </div>
                </div>
                <div className="hotel-hero-price">
                  {rates.length > 0 && rates[0]?.offerInitialPrice ? (
                    <h2>from {rates[0].offerInitialPrice.amount} {rates[0].offerInitialPrice.currency || getStoredCurrency()}</h2>
                  ) : (
                    <h2>Price N/A</h2>
                  )}
                  <span>for {nights} nights</span>
                </div>
              </div>
            </div>

            <SentimentBlock
              sentiment={hotel.sentiment_analysis || hotel.sentimentAnalysis}
              reviewCount={hotel.reviewCount}
            />

            <GuestReviews
              sentiment={hotel.sentiment_analysis || hotel.sentimentAnalysis}
              reviewCount={hotel.reviewCount}
              hotelId={hotelId}
            />

            <div className="hotel-about">
              <h2>Hotel about</h2>
              <div className="hinfo-box">
                <span>{(hotel.hotelDescription || "").replace(/<[^>]*>?/gm, '')}</span>
              </div>
              <h2>Hotel important</h2>
              <div className="hinfo-box">
                <span>{(hotel.hotelImportantInformation || "").replace(/<[^>]*>?/gm, '')}</span>
              </div>
              {hasCheckinCheckoutInfo && (
                <>
                  <h2>Check-in and check-out</h2>
                  <div className="hinfo-box checkin-out-box">
                    <div className="checkin-out-grid">
                      {checkinWindow && (
                        <div className="checkin-out-row">
                          <span className="checkin-out-label">Check-in</span>
                          <span className="checkin-out-value">{checkinWindow}</span>
                        </div>
                      )}
                      {checkinCheckoutTimes?.checkout && (
                        <div className="checkin-out-row">
                          <span className="checkin-out-label">Check-out</span>
                          <span className="checkin-out-value">
                            {checkinCheckoutTimes.checkout}
                          </span>
                        </div>
                      )}
                    </div>
                    {checkinInstructions.length > 0 && (
                      <ul className="checkin-out-instructions">
                        {checkinInstructions.map((item, index) => (
                          <li key={item.id ?? index}>{item.instruction}</li>
                        ))}
                      </ul>
                    )}
                    {checkinCheckoutTimes?.special_instructions && (
                      <p className="checkin-out-special">
                        {checkinCheckoutTimes.special_instructions}
                      </p>
                    )}
                  </div>
                </>
              )}
              <PopularFacilities facilities={hotelFacilities} />
            </div>

            <Rooms hotel={hotel} rooms={rooms} rates={rates} />
          </div>
        )}
      </div>
    </div>
  );
};

export default HotelDetails;
