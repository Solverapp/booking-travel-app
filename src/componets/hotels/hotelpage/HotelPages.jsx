import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import "./style.css";
import { Rating } from "@mui/material";
import { Wifi, LocalParking, AcUnit, FitnessCenter, Pool, SmokeFree, TaskAlt } from '@mui/icons-material';
import Loader from "../../loaders/loading";
import Carousel from "../../slider/Carousel";
import Rooms from "../rooms/Roomsnew";

import left from "../../../img/icons/tabicons/arrow-left.svg";
import search from "../../../img/icons/tabicons/search-normal.svg";
import loc from "../../../img/icons/tabicons/location.svg";
import faf from "../../../img/icons/Hotelicons/heart.svg";
import Share from "../../../img/icons/Hotelicons/share.svg";

// Ð˜Ð¼Ð¿Ð¾Ñ€Ñ‚Ð¸Ñ€ÑƒÐµÐ¼ Ð½Ð°Ñˆ ÑÐµÑ€Ð²Ð¸Ñ
import { hotelService } from "../../../services/SupebaseService";
import { hotelIdService } from "../../../services/SupebaseHotelIdService";

const parseChildrenAges = (value) => {
  if (Array.isArray(value)) {
    return value.map((age) => parseInt(age, 10)).filter((age) => !Number.isNaN(age));
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((age) => parseInt(age, 10)).filter((age) => !Number.isNaN(age));
  }
  return [];
};

const HotelDetails = ({ id }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hid = id.id;

  const city = searchParams.get("city");
  const pleaseId = searchParams.get("pleaseId");
  const checkInParam = searchParams.get("checkIn");
  const checkin = searchParams.get("checkIn");
  const checkOutParam = searchParams.get("checkOut");
  const checkout = searchParams.get("checkOut");
  const adultsParams = searchParams.get("adults");
  const childrenParams = searchParams.get("children");
  const childrenAgesParams = searchParams.get("childrenAges");
  
  const adults = parseInt(adultsParams, 10) || 2;
  const childern = parseInt(childrenParams, 10) || 0;
  const childrenAges = parseChildrenAges(childrenAgesParams);
  
  const checkIn = checkInParam ? new Date(checkInParam) : null;
  const checkOut = checkOutParam ? new Date(checkOutParam) : null;

  const [hotelData, setHotelData] = useState(null);
  const [hotel, setHotel] = useState({});
  const [images, setImages] = useState([]);
  const [hotelFacilities, setHotelFacilities] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const occupancies = [{ adults }];

        if (childern > 0 && childrenAges.length > 0) {
          occupancies[0].childern = childrenAges;
        }

        const body = {
          occupancies,
          hotelIds: [hid],
          currency: "AED",
          guestNationality: "US",
          checkin,
          checkout,
          roomMapping: true,
          includeHotelData: true,
          margin: 10,
        };

  useEffect(() => {
    let isMounted = true;
    const fetchNewData = async () => {
      setLoading(true);
      setError('');
      try {
        const [hotelRes, ratesRes] = await Promise.all ([
          
          hotelIdService.fetchHotelDetalis(id),
          hotelService.fetchHotelsList(body),

        ])
        const data = await hotelRes.data;
        const ratesData = await ratesRes.data;
console.log(data);

        if (isMounted && data && ratesData) {
          setHotelData(data);
          setHotel(data || {});
          setImages(data?.hotelImages || []);
          setHotelFacilities(data?.facilities || []);
          setRooms(data?.rooms || []);
          setRates(ratesData?.[0]?.roomTypes || []);
        }
      } catch (err) {
        if (isMounted) setError('Failed to load Hotels');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchNewData();
    return () => { isMounted = false; };
  }, [hid, checkInParam, checkOutParam, adults]);

  const sliderImages = useMemo(() => (images || []).slice(0, 10), [images]);

  let nights = useMemo(() => {
    if (checkIn && checkOut && checkOut > checkIn) {
      return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    }
    return 0;
  }, [checkIn, checkOut]);

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
    const match = facilityIcons.find(({ keywords }) => keywords.some((key) => word.includes(key)));
    const Icon = match?.icon || TaskAlt;
    return <Icon />;
  };

  const handleBack = () => {
    const params = new URLSearchParams();
    params.set("city", city || "");
    params.set("pleaseId", pleaseId || "");
    params.set("checkIn", checkInParam || "");
    params.set("checkOut", checkOutParam || "");
    params.set("adults", String(adults));
    params.set("children", String(childern));
    if (childrenAges?.length > 0) {
      params.set("childrenAges", childrenAges.join(","));
    }
    navigate(`/hotels?${params.toString()}`);
  };
console.log(hotel);

  return (
    <div className="maincontent">
      <div className="hcontainer">
        {loading ? (
          <div className="loader-not">
            <Loader />
            <span>Please wait</span>
          </div>
        ) : !hotelData ? (
          <div className="option-not">
            <img src={search} alt="hotel" />
            <h3>Nothing found matching your request</h3>
            <span>Please specify other search parameters</span>
          </div>
        ) : (
          <div className="hotinfo">
            <div className="backoption">
              <button onClick={handleBack}>
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
                    name="hotel-stars"
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
                      <span>{`${hotel.city || ""}, ${hotel.country || ""}`}</span>
                    </button>
                    <button><span>Show on map</span></button>
                    <button>
                      <img src={Share} alt="share" />
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
                    <img src={Share} alt="share" />
                    <span>Share</span>
                  </button>
                </div>
                <div className="hederpricehotel">
                  {rates.length > 0 && rates[0]?.offerInitialPrice ? (
                    <h1>from {rates[0].offerInitialPrice.amount} AED</h1>
                  ) : (
                    <h1>Price N/A</h1>
                  )}
                  <span>for {nights} nights</span>
                </div>
              </div>
            </div>

            <div className="hcarusel">
              <div className="hcarusell-left">
                <Carousel data={sliderImages} />
              </div>
              <div className="hcarusell-rigth">
                <h2>Hotel about</h2>
                <div className="hinfo-box">
                  <span>{(hotel.hotelDescription || "").replace(/<[^>]*>?/gm, '')}</span>
                </div>
                <h2>Hotel important</h2>
                <div className="hinfo-box">
                  <span>{(hotel.hotelImportantInformation || "").replace(/<[^>]*>?/gm, '')}</span>
                </div>
                <h2>Popular facticlies</h2>
                <div className="facti-box">
                  {hotelFacilities.slice(0, 10).map((item) => (
                    <div className="facti-btn" key={item.facilityId}>
                      {getFacilityIcon(item.name)} 
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Rooms hotel={hotel} rooms={rooms} rates={rates} />
          </div>
        )}
      </div>
    </div>
  );
};

export default HotelDetails;
