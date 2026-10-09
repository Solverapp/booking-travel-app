import { useSearchParams, NavLink } from "react-router-dom";
import { useState } from "react";
import hotels from "../../mock/hotels";
import { Rating } from "@mui/material";
import SearchOption from "../hotelsearch/Hotelsearch";
import HotelFilters from "../hotelFilters/HotelFilters";

import star from "../../img/icons/tabicons/star.svg";
import loc from "../../img/icons/tabicons/location.svg";
import hotel from "../../img/icons/tabicons/not.svg";
import formatPrice from "../../utils/priceFormater";
import "./style.css";


const Hotel = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [selectedStars, setSelectedStars] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: Infinity });
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [minGuestRating, setMinGuestRating] = useState(null);

  // Получаем параметры из URL
  const city = searchParams.get("city");
  const checkInParam = searchParams.get("checkIn");
  const checkOutParam = searchParams.get("checkOut");
  const adultsParams = searchParams.get("adults");
  const childrenParams = searchParams.get("children");
  const infantsParams = searchParams.get("infants");
  const adults = parseInt(adultsParams) || 2;
  const childern = parseInt(childrenParams) || 0;
  const infants = parseInt(infantsParams) || 0;
  const quests = adults + childern + infants;
  const checkIn = checkInParam ? new Date(checkInParam) : null;
  const checkOut = checkOutParam ? new Date(checkOutParam) : null;

  let nights = 0;
  if (checkIn && checkOut && checkOut > checkIn) {
    nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

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
  let filteredHotels = city
    ? hotels.filter((hotel) => hotel.city.toLowerCase() === city.toLowerCase())
    : hotels;

  // Фильтруем по звездам
  if (selectedStars.length > 0) {
    filteredHotels = filteredHotels.filter((hotel) =>
      selectedStars.includes(hotel.star),
    );
  }

  // Фильтруем по rating

  if (minGuestRating !== null) {
    filteredHotels = filteredHotels.filter(
      (hotel) => hotel.rating >= minGuestRating,
    );
  }

  // Фильтруем по цене
  filteredHotels = filteredHotels.filter((hotel) => {
    const totalPrice = getTotalPrice(hotel);
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
          <div className="hotel-grid">
            {filteredHotels.length > 0 ? (
              filteredHotels.map((item) => (
                <NavLink
                  key={`${item.id}`}
                  to={`/hotelspage/${item.id}?city=${city}&checkIn=${checkInParam}&checkOut=${checkOutParam}&adults=${adultsParams}&children=${childrenParams}&infants=${infantsParams}`}
                >
                  <div className="grid-item" key={`${item.id}`}>
                    <img src={item.image} alt={item.name} />
                    <div className="item-heder">
                      <div className="item-heder-info">
                        <div className="info-left">
                          <h3>{`${item.name}`}</h3>
                          <div className="info-left-star">
                            <Rating
                              name="half-rating-read"
                              defaultValue={item.star}
                              max={item.star}
                              precision={1}
                              readOnly
                              size="small"
                            />
                            <span>2,234 reviews</span>
                          </div>
                        </div>
                        <div className="rating">{`${item.rating}`}</div>
                      </div>
                      <div className="item-heder-loc">
                        <div className="loc-name">
                          <img src={loc} alt="location" />
                          <p>{`${item.city},${item.location}`}</p>
                        </div>
                        <div className="loc-dist">
                          <p>6.3 km from the city center{`${item.id}`}</p>
                        </div>
                      </div>
                    </div>
                    <div className="item-footer">
                      <div className="footer-price">
                        <p>
                          {`${formatPrice(getTotalPrice(item) || item.price)}`}{" "}
                          ₽
                        </p>
                        <span>{`${nights} nights, ${quests} quests`}</span>
                      </div>
                    </div>
                  </div>
                </NavLink>
              ))
            ) : (
              <div className="hotel-not">
                <img src={hotel} alt="hotel" />
                <h3>Nothing found matching your request</h3>
                <span>Please specify other search parameters</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};;

export default Hotel;
