import { useSearchParams, useNavigate } from "react-router-dom";
import "./style.css";
import { Rating } from "@mui/material";
import formatPrice from "../../utils/priceFormater";
import Acordion from "../tourpage/Acordion"
import Rates from "../touroption/Optionew";
import {Place, FavoriteBorder, NavigateBefore, EventRepeatOutlined} from '@mui/icons-material';



 


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





const handleBack = () => {
  const params = new URLSearchParams({
    city: city,
    checkIn: checkInParam,
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
              <NavigateBefore/>
              <span>Back</span>
            </button>
            <button>
              <EventRepeatOutlined />
              <span>Change</span>
            </button>
          </div>
          <div className="tour-hero">
            <div className="tour-hero-media">
              <img src={tour.image} alt={tour.tourName} />
            </div>
            <div className="tour-hero-info">
              <div className="tour-hero-head">
                <h1>{tour.tourName}</h1>
                <div className="tour-hero-rating">
                  <Rating
                    name="half-rating-read"
                    defaultValue={tour.rating}
                    max={tour.rating}
                    precision={1}
                    readOnly
                    size="small"
                  />
                  <span>{tour.reviewCount} reviews</span>
                </div>
                <div className="tour-hero-loc">
                  <Place />
                  <span>{`${tour.cityName}, ${tour.countryName}`}</span>
                </div>
              </div>
              <div className="tour-hero-foot">
                <button className="tour-hero-fav">
                  <FavoriteBorder />
                  <span>Add to favorites</span>
                </button>
                <div className="tour-hero-price">
                  <span>from</span>
                  <h2>{formatPrice(tour.price)} AED</h2>
                </div>
              </div>
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
