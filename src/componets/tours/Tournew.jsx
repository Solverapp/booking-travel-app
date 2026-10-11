import { useSearchParams, NavLink } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { Rating } from "@mui/material";
import SearchOption from "../hotelsearch/Toursearch";
import TourFilters from "../hotelFilters/TourFilters";
import FilterDrawer from "../filterdrawer/FilterDrawer";
import Loader from "../loaders/loading";
import loc from "../../img/icons/tabicons/location.svg";
import hotel from "../../img/icons/tabicons/not.svg";
import formatPrice from "../../utils/priceFormater";
import "./style.css";

// Импортируем наш новый сервис
import { supabaseTourService } from "../../services/supabaseTourService";

const Tour = () => {
  const [searchParams] = useSearchParams();
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

  // --- ЭФФЕКТ: Чистый запрос к Bubble Service ---
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await supabaseTourService.fetchToursByCity(city);
        if (isMounted) {
          setItems(data);
        }
      } catch (e) {
        console.error("Failed to load tours from Bubble:", e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [city]);

  // Обработчик для фильтра цены
  const handlePriceChange = (filterData) => {
    setPriceRange(filterData);
  };

  // Категории (Аменитис)
  const handleAmenityToggle = (amenityId) => {
    if (selectedAmenities === amenityId) {
      setSelectedAmenities(null);
    } else {
      setSelectedAmenities(amenityId);
      window.scrollTo(0, 0);
    }
  };

  // --- ДАТА-ПРОЦЕССОР (useMemo оптимизация сортировки и фильтрации) ---
  const filteredTours = useMemo(() => {
    // 1. Базовый фильтр: только туры с ценой
    let result = items.filter((tour) => tour.price != null);

    // 2. Сортировка по типу цены / популярности
    if (sortType === 9) result.sort((a, b) => a.price - b.price);
    if (sortType === 8) result.sort((a, b) => b.price - a.price);
    if (sortType === 7) result.sort((a, b) => a.popular - b.popular);
    if (sortType === 6) result.sort((a, b) => b.popular - a.popular);

    // 3. Фильтрация по диапазону цен
    result = result.filter(
      (tour) => tour.price >= priceRange.min && tour.price <= priceRange.max
    );

    // 4. Фильтрация по категории (Amenities)
    if (selectedAmenities !== null) {
      result = result.filter((tour) => tour.cityTourType === selectedAmenities);
    }

    return result;
  }, [items, priceRange, selectedAmenities, sortType]);

  return (
    <div className="maincontent">
      <SearchOption />
      <div className="mcontainer">
        <FilterDrawer>
          <TourFilters
            priceChange={handlePriceChange}
            selectedAmenities={selectedAmenities}
            onAmenityToggle={handleAmenityToggle}
            setSelectedAmenities={setSelectedAmenities}
            sortType={sortType}
            setSortType={setSortType}
          />
        </FilterDrawer>
        <div className="hotel-box">
          <div className="hotel-grid">
            {isLoading ? (
              <div className="hotel-not">
                <Loader />
                <span>Please wait</span>
              </div>
            ) : filteredTours.length === 0 ? (
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
                  <div className="tourgrid-item">
                    <img src={item.image} alt={item.tourName} />
                    <div className="item-heder">
                      <div className="item-heder-info">
                        <div className="info-left">
                          <h3>{item.tourName}</h3>
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
                        <div className="rating">{item.rating}</div>
                      </div>
                      <div className="item-heder-loc">
                        <div className="loc-name">
                          <img src={loc} alt="location" />
                          <p>{`${item.cityName}, ${item.countryName}`}</p>
                        </div>
                      </div>
                    </div>
                    <div className="item-footer">
                      <div className="footer-price">
                        <p>From {formatPrice(item.price)} AED</p>
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
};

export default Tour;
