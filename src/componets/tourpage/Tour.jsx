import { useSearchParams, useNavigate } from "react-router-dom";
import "./style.css";
import { Rating } from "@mui/material";
import formatPrice from "../../utils/priceFormater";
import Acordion from "../tourpage/Acordion"
import Rates from "../touroption/Optionew";

import left from "../../img/icons/tabicons/arrow-left.svg";
import search from "../../img/icons/tabicons/search-normal.svg";
import loc from "../../img/icons/tabicons/location.svg";
import faf from "../../img/icons/Hotelicons/heart.svg";
import share from "../../img/icons/Hotelicons/share.svg";

 


const Tour = ({tour}) => {
const navigate = useNavigate();
const turName = tour.cityName;
const [searchParams, setSearchParams] = useSearchParams();
const city = searchParams.get("city");
const checkInParam = searchParams.get("checkIn");
const checkOutParam = searchParams.get("checkOut");
const adultsParams = searchParams.get("adults");
const childrenParams = searchParams.get("children");
const infantsParams = searchParams.get("infants");
const adults = parseInt(adultsParams) ;
const childern = parseInt(childrenParams);
const infants = parseInt(infantsParams);
const quests = adults + childern + infants;
const checkIn = checkInParam ? new Date(checkInParam) : null;
const checkOut = checkOutParam ? new Date(checkOutParam) : null;



console.log(tour.tourName);




const handleBack = () => {
  const params = new URLSearchParams({
    city: city,
    checkIn: checkInParam,
    // checkOut: checkOutParam,
    adults: adultsParams,
    children: childrenParams,
    infants: infantsParams,
  });
  navigate(`/tours?${params.toString()}`);
};

  return (
    <div className="maincontent">
      <div className="hcontainer">
        <div className="hinfo">
          <div className="backoption">
            <button onClick={() => handleBack()}>
              <img src={left} alt="back" />
              <span>Back</span>
            </button>
            <button>
              <img src={search} alt="new search" />
              <span>New search</span>
            </button>
          </div>
          <div className="infoheder">
            <div className="hederleft">
              <h1>{tour.tourName}</h1>
              <div className="info-left-star">
                <Rating
                  name="half-rating-read"
                  defaultValue={tour.rating}
                  max={tour.rating}
                  precision={1}
                  readOnly
                  size="small"
                />
                <span> {tour.reviewCount} reviews</span>
              </div>
              <div className="left-location">
                <div className="loc-name">
                  <button>
                    <img src={loc} alt="location" />
                    <span>{`${tour.cityName},${tour.countryName}`}</span>
                  </button>
                  <button>
                    <span>Show on map</span>
                  </button>
                  <button>
                    <img src={share} alt="location" />
                    <span>Share</span>
                  </button>
                </div>
                <div className="info-left-star">
                  <span>6.3 km from the center . Near the metro</span>
                </div>
              </div>
            </div>
            <div className="hederrigth">
              <div className="hederrigth-btn">
                <button>
                  <img src={faf} alt="faf" />
                  <span>Add to favorites</span>
                </button>
                <button>
                  <img src={share} alt="share" />
                  <span>Share</span>
                </button>
              </div>
              <div className="hederprice">
                <h1>from {`${formatPrice(tour.price)}`} AED</h1>
                
              </div>
            </div>
          </div>
          <div className="carusel">
            <img src={tour.image} alt="" className="carusel-left" />
            <div className="carusel-rigth">
              {/* <img src={tour.image} alt="" className="carusel-rigth-img" /> */}
              <img src={tour.image} alt="" className="carusel-rigth-border-t" />
              {/* <img src={tour.image} alt="" className="carusel-rigth-img" /> */}
              <img src={tour.image} alt="" className="carusel-rigth-border-b" />
            </div>
          </div>
        </div>
        <Acordion tour ={tour}/>
        <Rates id = {tour.tourId}  
        tur = {tour.tourName}/>
      </div>
    </div>
  );
};

export default Tour;
