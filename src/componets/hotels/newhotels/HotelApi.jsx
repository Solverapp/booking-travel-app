import { useSearchParams, NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import Loader from "../../loaders/loading";
import Sorting from "../sorting/sorting";
import { Rating } from "@mui/material";
import SingleBedIcon from '@mui/icons-material/SingleBed';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import SearchOption from "../../hotelsearch/NewHotelSearch";
import HotelFilters from "../../hotelFilters/HotelFilters";

import formatPrice from "../../../utils/priceFormater";
import "./style.css";
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

const Hotel = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [selectedStars, setSelectedStars] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: Infinity });
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [minGuestRating, setMinGuestRating] = useState(null);
  const [sortType, setSortType] = useState(6);

  // Получаем параметры из URL
  const city = searchParams.get("city");
  const pleaseId = searchParams.get("pleaseId");
  const checkInParam = searchParams.get("checkIn");
  const checkOutParam = searchParams.get("checkOut");
  const adultsParams = searchParams.get("adults");
  const childrenParams = searchParams.get("children");
  const childrenAgesParams = searchParams.get("childrenAges");
  const adults = parseInt(adultsParams, 10) || 2;
  const children = parseInt(childrenParams, 10) || 0;
  const childrenAges = parseChildrenAges(childrenAgesParams);
  const normalizedChildrenAges =
    childrenAges.length > 0 ? childrenAges : Array.from({ length: children }, () => 5);
  const quests = adults + children;
  const checkIn = checkInParam ? new Date(checkInParam) : null;
  const checkOut = checkOutParam ? new Date(checkOutParam) : null;
  const [hotelData, setHotelData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  let nights = 0;
  if (checkIn && checkOut && checkOut > checkIn) {
    nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

useEffect(() => {
    const fetchNewData = async () => {
      setLoading(true);
      try {
        const [optionNewRes] = await Promise.all([
          fetch("https://x8ki-letl-twmt.n7.xano.io/api:mJRCJ-pi/Rates_Plase", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              
            },
            body: JSON.stringify({
              placeId: pleaseId,
              CheckInDate: checkInParam,
              CheckOutDate: checkOutParam,
              currency: "AED",
              national: "RU",
              limit: 40,
              questjson: {
                adults,
                children: normalizedChildrenAges,},
            }),
          }),
        ]);
        const Data = await optionNewRes.json();
        if (Data.final_hotels) {
          setHotelData(Data.final_hotels);
        }
      } catch (err) {
        setError('Failed to load Hotels');
      }
      setLoading(false);
    };
    fetchNewData();
  }, [pleaseId, checkInParam, adultsParams,childrenParams]);



  const getMinRoomRatePrice = (hotel) => {
    if (!hotel.rooms || hotel.rooms.length === 0) return null;
    const allRates = hotel.rooms.flatMap((r) => r.rates);
    if (allRates.length === 0) return null;
    return Math.min(...allRates.map((rate) => rate.price));
  };

  const getTotalPrice = (hotel) => {
    const minRate = getMinRoomRatePrice(hotel);
    if (minRate === null) return null;
    if (nights === 0) return minRate;
    const commission = hotel.commission || 0;
    return Math.round(minRate * nights * (1 + commission / 100));
  };

  // Обработчик для фильтра звезд
  const handleStarChange = (filterData) => {
    setSelectedStars(filterData.star);
  };

  // Обработчик для фильтра цены
  const handlePriceChange = (filterData) => {
    setPriceRange(filterData);
  };

  // Amenities
  const handleAmenityToggle = (amenityId) => {
    setSelectedAmenities(
      (prev) =>
        prev.includes(amenityId)
          ? prev.filter((id) => id !== amenityId) // убираем если был
          : [...prev, amenityId], // добавляем если не было
    );
  };

  // Фильтруем отели по городу, звездам, amenities и цене
  let filteredHotels = hotelData;

  // сортировка по цене ASC (1-100)
  if (sortType === 9) {
    const priceAscendic = [...filteredHotels].sort((a, b) => a.priceCelling - b.priceCelling);
    filteredHotels = priceAscendic
  }
  

  // сортировка по цене DESC (100-1)
  if (sortType === 8) {
    const priceDescendic = [...filteredHotels].sort((a, b) => b.priceCelling - a.priceCelling);
    filteredHotels = priceDescendic;
  }

  // сортировка по популярности ASC (false-true)
  if (sortType === 7) {
    const popularAscendic = [...filteredHotels].sort(
      (a, b) => a.hotelInfo[0].rating - b.hotelInfo[0].rating,
    );
    
    popularAscendic? filteredHotels = popularAscendic : filteredHotels;
  }
  
  // сортировка по популярности DESC (true-fals)
if (sortType === 6) {
  const popularDescendic = [...filteredHotels].sort(
  
    (a, b) => b.hotelInfo[0].rating - a.hotelInfo[0].rating,
  );
   filteredHotels = popularDescendic
}

  // Фильтруем по звездам
  if (selectedStars.length > 0) {
    filteredHotels = filteredHotels.filter((hotel) =>
      selectedStars.includes(hotel.hotelInfo[0].stars),
    );
  }

  // Фильтруем по rating

  if (minGuestRating !== null) {
    filteredHotels = filteredHotels.filter(
      (hotel) => hotel.hotelInfo[0].rating >= minGuestRating,
    );
  }

  // Фильтруем по цене
  filteredHotels = filteredHotels.filter((hotel) => {
    const totalPrice = hotel.priceCelling;
    if (totalPrice === null) return false;
    return totalPrice >= priceRange.min && totalPrice <= priceRange.max;
  });

  // Filters amenities
  filteredHotels = filteredHotels.filter((hotel) => {
    const matchesAmenities = selectedAmenities.every((amenity) =>
      hotel.amenities.includes(amenity),
    );
    return matchesAmenities;
  });
const params = new URLSearchParams();

    params.set("city", city || "");
    params.set("pleaseId", pleaseId || "");
    params.set("checkIn", checkInParam || defaultdates.tomorrow);
    params.set("checkOut", checkOutParam || defaultdates.dayAfterTomorrow);
    params.set("adults", String(adults));
    params.set("children", String(children));

    if (childrenAges?.length > 0) {
      params.set("childrenAges", childrenAges.join(","));
    } else {
      params.delete("childrenAges");
    }

  return (
    <div className="maincontent">
      <SearchOption />
      <div className="mcontainer">
        <div className="filter-wrapper">
          <div className="filter-map">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2245.3770!2d37.618!3d55.756!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTXCsDQ1JzIxLjYiTiAzN8KwMzcnMDQuOCJF!5e0!3m2!1sru!2sru!4v1"
              loading="lazy"
            ></iframe>
          </div>
          <HotelFilters
            starChange={handleStarChange}
            priceChange={handlePriceChange}
            selectedAmenities={selectedAmenities}
            onAmenityToggle={handleAmenityToggle}
            setSelectedAmenities={setSelectedAmenities}
            minGuestRating={minGuestRating}
            setMinGuestRating={setMinGuestRating}
          />
        </div>
        <div className="hotel-box">
          <Sorting sortType={sortType}
            setSortType={setSortType}/>
          <div className="hotel-grid">
            {loading ? (
              <div className="hotel-not">
                <Loader />
                <span>Please wait</span>
              </div>
            ) : !Array.isArray(hotelData) || hotelData.length === 0 ? (
                          <div className="option-not">
                            <img src={guest} alt="hotel" />
                            <h3>Nothing found matching your request</h3>
                            <span>Please specify other search parameters</span>
                          </div>
                        ) : (
              filteredHotels.map((item) => (
                <NavLink
                  key={`${item.id}`}
                  to={`/hotelpage/${item.id}?${params.toString()}`}
                >
                  <div className="grid-card" key={`${item.id}`}>
                    <div className="grid-card-img-box">
                    <img src={item.hotelInfo[0].main_photo} alt="hotel_photo" loading="lazy"/>
                    <div className="rating-card-ab">
                      <p>{`${item.hotelInfo[0].rating}`}</p>
                      <span>{item.hotelInfo[0].review_count} reviews</span>
                      </div>
                    </div>
                    <div className="card-heder">
                      <div className="card-heder-info">
                        <div className="infoleft">
                          <h3>{`${item.hotelName}`}</h3>
                          <div className="infoleft-star">
                            <Rating
                              name="half-rating-read"
                              defaultValue={item.hotelInfo[0].stars || 1}
                              max={item.hotelInfo[0].stars || 1}
                              precision={1}
                              readOnly
                              size="small"
                            />
                            
                          </div>
                        </div>
                        
                      </div>
                      <div className="card-heder-loc">
                        <div className="locname">
                          <PlaceOutlinedIcon />
                          <p>{`${item.hotelInfo[0].address}`}</p>
                        </div>
                      </div>
                    </div>
                    <div className="card-footer">
                      <div className="card-heder-loc">
                        <div className="romname">
                          <SingleBedIcon/>
                          
                          <p>{`${item.roomName}`}</p>
                        </div>
                        <div className="locdist">
                          <p>{`${item.mealType}`}</p>
                        </div>
                      </div>
                      <div className="cardfooter-price">
                        <p>
                        {`${formatPrice(item.priceCelling)} AED`}{" "}
                          
                        </p>
                        <span>{`${nights} nights, ${quests} quests`}</span>
                      </div>
                      
                    </div>
                  </div>
                </NavLink>
              ))
            ) }
          </div>
        </div>
      </div>
    </div>
  );
};;

export default Hotel;
