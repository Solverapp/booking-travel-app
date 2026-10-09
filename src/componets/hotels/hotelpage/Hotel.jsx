import { useSearchParams, useNavigate, data } from "react-router-dom";
import { useState, useEffect } from "react";
import "./style.css";
import { Rating } from "@mui/material";
import {RoundedCorner, People, Wifi, LocalParking, AcUnit, FitnessCenter, Pool, SmokeFree, TaskAlt} from '@mui/icons-material'
import Loader from "../../loaders/loading";
import Carousel from "../../slider/Carousel"
import Rooms from "../rooms/Rooms";

import left from "../../../img/icons/tabicons/arrow-left.svg";
import search from "../../../img/icons/tabicons/search-normal.svg";
import loc from "../../../img/icons/tabicons/location.svg";
import faf from "../../../img/icons/Hotelicons/heart.svg";
import share from "../../../img/icons/Hotelicons/share.svg";

const parseChildrenAges = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((age) => parseInt(age, 10))
      .filter((age) => !Number.isNaN(age));
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((age) => parseInt(age, 10))
      .filter((age) => !Number.isNaN(age));
  }

  return [];
};
 
const Hotel = ({id}) => {
const navigate = useNavigate();
const [searchParams, setSearchParams] = useSearchParams();
const hid = id.id;
const city = searchParams.get("city");
const pleaseId = searchParams.get("pleaseId");
const checkInParam = searchParams.get("checkIn");
const checkOutParam = searchParams.get("checkOut");
const adultsParams = searchParams.get("adults");
const childrenParams = searchParams.get("children");
const childrenAgesParams = searchParams.get("childrenAges");
const adults = parseInt(adultsParams) ;
const childern = parseInt(childrenParams);
const childrenAges = parseChildrenAges(childrenAgesParams);
const quests = adults + childern ;
const checkIn = checkInParam ? new Date(checkInParam) : null;
const checkOut = checkOutParam ? new Date(checkOutParam) : null;
const [hotelData, setHotelData] = useState([]);
const [hotel, setHotel] = useState({});
const [images, setImages] = useState([]);
const [hotelFacilities, setHotelFacilities] = useState([]);
const [rooms, setRooms] = useState([]);
const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  useEffect(() => {
      const fetchNewData = async () => {
        setLoading(true);
        try {
          const [optionNewRes] = await Promise.all([
            fetch("https://x8ki-letl-twmt.n7.xano.io/api:mJRCJ-pi/Rates_Hotel", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                
              },
              body: JSON.stringify({
                hotelId: hid,
                CheckInDate: checkInParam,
                CheckOutDate: checkOutParam,
                currency: "AED",
                national: "RU",
                lang: "en",
                questjson: {
                  adults:parseInt(adultsParams, 10) || 2,},
              }),
            }),
          ]);
          const Data = await optionNewRes.json();
          if (Data.final_hotels) {
            setHotelData(Data.final_hotels);
            setHotel(Data.final_hotels.Hotel);
            setImages(Data.final_hotels.Hotel.hotelImages);
            setHotelFacilities(Data.final_hotels.Hotel.facilities)
            setRooms(Data.final_hotels.Hotel.rooms);
            setRates(Data.final_hotels.Rates[0].roomTypes);
          }
        } catch (err) {
          setError('Failed to load Hotels');
        }
        setLoading(false);
      };
      fetchNewData();
    }, [hid]);


const sliderImages = (images || []).slice(0, 10);

let nights = 0;
if (checkIn && checkOut && checkOut > checkIn) {
  nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
  );
}
console.log(hotelFacilities);

const facilityIcons = [
  { keywords: ["wifi"], icon: Wifi },
  { keywords: ["internet"], icon: Wifi },
  { keywords: ["fitness"], icon: FitnessCenter },
  { keywords: ["parking"], icon: LocalParking },
  { keywords: ["pool"], icon: Pool },
  { keywords: ["conditioning"], icon: AcUnit },
  { keywords: ["smoking"], icon: SmokeFree },
];

const getFacilityIcon = (name) => {
  const word = name.toLowerCase();
  const match = facilityIcons.find(({ keywords }) =>
    keywords.some((key) => word.includes(key))
  );

  const Icon = match?.icon || TaskAlt;
  return <Icon />;
};

const handleBack = () => {
  const params = new URLSearchParams();

    params.set("city", city || "");
    params.set("pleaseId", pleaseId || "");
    params.set("checkIn", checkInParam );
    params.set("checkOut", checkOutParam );
    params.set("adults", String(adults));
    params.set("children", String(childern));

    if (childrenAges?.length > 0) {
      params.set("childrenAges", childrenAges.join(","));
    } else {
      params.delete("childrenAges");
    }
  navigate(`/hotels?${params.toString()}`);
};

  return (
    <div className="hmaincontent">
      <div className="hpagecontainer">
        { loading ? (
              <div className="loader-not">
                <Loader />
                <span>Please wait</span>
              </div>
            ) :  hotelData.length === 0 ? (
                          <div className="option-not">
                            <img src={search} alt="hotel" />
                            <h3>Nothing found matching your request</h3>
                            <span>Please specify other search parameters</span>
                          </div>
                        ) : (
        <div className="hotinfo">
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
              <h1>{hotel.name}</h1>
              <div className="info-left-star">
                <Rating
                  name="half-rating-read"
                  value={hotel.starRating ?? 0}
                  max={5}
                  precision={1}
                  readOnly
                  size="small"
                />
                <span>. {hotel.reviewCount} reviews</span>
              </div>
              <div className="left-location">
                <div className="loc-name">
                  <button>
                    <img src={loc} alt="location" />
                    <span>{`${hotel.city},${hotel.country}`}</span>
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
              <div className="hederpricehotel">
                <h1>
                  from {rates[0].offerInitialPrice.amount} AED
                </h1>
                <span>for {`${nights}`} nights</span>
              </div>
            </div>
          </div>
          <div className="hcarusel">
            <div className="hcarusell-left">
              <Carousel data = {sliderImages}/>
            </div>
            <div className="hcarusell-rigth">
              <h2>Hotel about</h2>
              <div className="hinfo-box">
              <span>{hotel.hotelDescription.replace(/<[^>]*>?/gm, '')}</span>
              </div>
              <h2>Hotel important</h2>
              <div className="hinfo-box">
              <span>{hotel.hotelImportantInformation.replace(/<[^>]*>?/gm, '')}</span>
              </div>
              <h2>Popular facticlies</h2>
              <div className="facti-box">
                
                {hotelFacilities.slice(0, 10).map((item) => {
                const fid = item.facilityId;
                  return(
               <div className="facti-btn" key={fid}>
                {getFacilityIcon(item.name)} 
                 <span>{item.name}</span>
                 </div>
                  )}
                )}
              </div>
            </div>
          </div>
         <Rooms hotel={hotel} 
         rooms = {rooms} 
         rates = {rates}/>
        </div>
        )
        }
      </div>
    </div>
  );
};

export default Hotel;
