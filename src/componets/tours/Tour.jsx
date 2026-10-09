import { useSearchParams, NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { Rating } from "@mui/material";
import SearchOption from "../hotelsearch/Toursearch";
import TourFilters from "../hotelFilters/TourFilters";
import Loader from "../loaders/loading";
import loc from "../../img/icons/tabicons/location.svg";
import hotel from "../../img/icons/tabicons/not.svg";
import formatPrice from "../../utils/priceFormater";
import "./style.css";


const Tour = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [priceRange, setPriceRange] = useState({ min: 0, max: Infinity });
  const [selectedAmenities, setSelectedAmenities] = useState(null);
  const [sortType, setSortType] = useState(6);

  const city = searchParams.get("city");
  const checkInParam = searchParams.get("checkIn");
  const checkOutParam = searchParams.get("checkOut");
  const adultsParams = searchParams.get("adults");
  const childrenParams = searchParams.get("children");
  const infantsParams = searchParams.get("infants");

  useEffect(() => {
    const encodedCity = encodeURIComponent(city || "Dubai");
    const url = `https://solver-14372.bubbleapps.io/version-live/api/1.1/obj/TourData?constraints=[{"key":"cityname","constraint_type":"equals","value":"${encodedCity}"}]`;
    fetch(
      url
    )
      .then((res) => res.json())
      .then((results) => {
        // API возвращает { response: { results: [...] } }
        const data = results?.response?.results ?? [];
        setItems(data);
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  }, [city]);

  // Получаем параметры из URL
  
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

  // Обработчик для фильтра цены
  const handlePriceChange = (filterData) => {
    setPriceRange(filterData);
  };

  // Category
  const handleAmenityToggle = (amenityId) => {
    if (selectedAmenities === amenityId) {
      setSelectedAmenities(null);
    } else {
      setSelectedAmenities(amenityId);
      window.scrollTo(0, 0)
    }
  };

  // Фильтруем tours по городу
  let filteredTours = items.filter(
    (tour) =>
      (
      tour.price != null)
  );

  // сортировка по цене ASC (1-100)
  if (sortType === 9) {
    const priceAscendic = [...filteredTours].sort((a, b) => a.price - b.price);
    filteredTours = priceAscendic
  }
  

  // сортировка по цене DESC (100-1)
  if (sortType === 8) {
    const priceDescendic = [...filteredTours].sort((a, b) => b.price - a.price);
    filteredTours = priceDescendic;
  }
 

  // сортировка по популярности ASC (false-true)
  if (sortType === 7) {
    const popularAscendic = [...filteredTours].sort(
      (a, b) => a.popular - b.popular,
    );
    filteredTours = popularAscendic;
  }
  
  // сортировка по популярности DESC (true-fals)
if (sortType === 6) {
  const popularDescendic = [...filteredTours].sort(
  
    (a, b) => b.popular - a.popular,
  );
   filteredTours = popularDescendic
}



  // Фильтруем по цене
  filteredTours = filteredTours.filter((tour) => {
    const totalPrice = tour.price;
    if (totalPrice === null) return false;
    return totalPrice >= priceRange.min && totalPrice <= priceRange.max;
  });

  // Filters Categorys

  if (selectedAmenities !== null) {
    filteredTours = filteredTours.filter(
      (tour) => tour.cityTourType === selectedAmenities,
    );
  }
  
  
  
  return (
    <div className="maincontent">
      <SearchOption />
      <div className="mcontainer">
        <div className="filter-wrapper">
          <TourFilters
            priceChange={handlePriceChange}
            selectedAmenities={selectedAmenities}
            onAmenityToggle={handleAmenityToggle}
            setSelectedAmenities={setSelectedAmenities}
            sortType={sortType}
            setSortType={setSortType}
          />
        </div>
        <div className="hotel-box">
          <div className="hotel-grid">
            {isLoading ? (
              <div className="hotel-not">
                <Loader />
                <span>Please wait</span>
              </div>
            ) : !Array.isArray(filteredTours) || filteredTours.length === 0 ? (
              <div className="hotel-not">
                <img src={hotel} alt="hotel" />
                <h3>Nothing found matching your request</h3>
                <span>Please specify other search parameters</span>
              </div>
            ) : (
              filteredTours.map((item) => (
                <NavLink
                  key={`${item.tourId}`}
                  to={`/tourspage/${item.tourId}?city=${city}&checkIn=${checkInParam}&adults=${adultsParams}&children=${childrenParams}&infants=${infantsParams}`}
                  state={{ tour: item }}
                >
                  <div className="tourgrid-item" key={item.tourId}>
                    <img src={item.image} alt={item.tourName} />
                    <div className="item-heder">
                      <div className="item-heder-info">
                        <div className="info-left">
                          <h3>{`${item.tourName}`}</h3>
                          <div className="info-left-star">
                            <Rating
                              name="half-rating-read"
                              defaultValue={item.rating}
                              max={item.rating}
                              precision={1}
                              readOnly
                              size="small"
                            />
                            <span>{item.reviewCount} reviews</span>
                          </div>
                        </div>
                        <div className="rating">{`${item.rating}`}</div>
                      </div>
                      <div className="item-heder-loc">
                        <div className="loc-name">
                          <img src={loc} alt="location" />
                          <p>{`${item.cityName},${item.countryName}`}</p>
                        </div>
                        
                      </div>
                    </div>
                    <div className="item-footer">
                      <div className="footer-price">
                        <p>From {`${formatPrice(item.price)}`} AED</p>
                      </div>
                    </div>
                  </div>
                </NavLink>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};;;;;;;

export default Tour;
