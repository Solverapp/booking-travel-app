import { useSearchParams, NavLink } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import Loader from "../../loaders/loading";
import Sorting from "../sorting/sorting";
import { Rating } from "@mui/material";
import SingleBedIcon from '@mui/icons-material/SingleBed';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import SearchOption from "../../hotelsearch/NewHotelSearch";
import HotelFilters from "../../hotelFilters/HotelFilters";

import hotel from "../../../img/icons/tabicons/not.svg";
import formatPrice from "../../../utils/priceFormater";
import "./style.css";

// Импортируем наш сервис
import { hotelService } from "../../../services/hotelService";

const parseChildrenAges = (value) => {
  if (Array.isArray(value)) {
    return value.map((age) => parseInt(age, 10)).filter((age) => !Number.isNaN(age));
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((age) => parseInt(age, 10)).filter((age) => !Number.isNaN(age));
  }
  return [];
};

const HotelList = () => {
  const [searchParams] = useSearchParams();
  
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
  const normalizedChildrenAges = childrenAges.length > 0 ? childrenAges : Array.from({ length: children }, () => 5);
  const quests = adults + children;
  
  const checkIn = checkInParam ? new Date(checkInParam) : null;
  const checkOut = checkOutParam ? new Date(checkOutParam) : null;

  const [hotelData, setHotelData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  let nights = 0;
  if (checkIn && checkOut && checkOut > checkIn) {
    nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Запрос списка отелей через наш новый сервис
  useEffect(() => {
    let isMounted = true;
    const loadHotels = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await hotelService.fetchHotelsList({
          placeId: pleaseId,
          checkInDate: checkInParam,
          checkOutDate: checkOutParam,
          adults,
          children: normalizedChildrenAges
        });
        if (isMounted) setHotelData(data);
      } catch (err) {
        if (isMounted) setError('Failed to load Hotels');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadHotels();
    return () => { isMounted = false; };
  }, [pleaseId, checkInParam, checkOutParam, adultsParams, childrenParams]);

  // Обработчики фильтров
  const handleStarChange = (filterData) => setSelectedStars(filterData.star);
  const handlePriceChange = (filterData) => setPriceRange(filterData);
  const handleAmenityToggle = (amenityId) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenityId) ? prev.filter((id) => id !== amenityId) : [...prev, amenityId]
    );
  };

  // Конвейер фильтрации и сортировки на клиенте (useMemo)
  const filteredHotels = useMemo(() => {
    let result = [...hotelData];

    // 1. Фильтрация по звездам
    if (selectedStars.length > 0) {
      result = result.filter((h) => h.hotelInfo?.[0] && selectedStars.includes(h.hotelInfo[0].stars));
    }

    // 2. Фильтрация по рейтингу гостей
    if (minGuestRating !== null) {
      result = result.filter((h) => h.hotelInfo?.[0] && h.hotelInfo[0].rating >= minGuestRating);
    }

    // 3. Фильтрация по диапазону цен
    result = result.filter((h) => {
      const totalPrice = h.priceCelling;
      if (totalPrice === null || totalPrice === undefined) return false;
      return totalPrice >= priceRange.min && totalPrice <= priceRange.max;
    });

    // 4. Фильтрация по удобствам (Amenities)
    if (selectedAmenities.length > 0) {
      result = result.filter((h) => h.mealType && selectedAmenities.every((amenity) => h.mealType.includes(amenity)));
    }

    // 5. Сортировка данных
    if (sortType === 9) result.sort((a, b) => (a.priceCelling || 0) - (b.priceCelling || 0));
    if (sortType === 8) result.sort((a, b) => (b.priceCelling || 0) - (a.priceCelling || 0));
    if (sortType === 7) result.sort((a, b) => (a.hotelInfo?.[0]?.rating || 0) - (b.hotelInfo?.[0]?.rating || 0));
    if (sortType === 6) result.sort((a, b) => (b.hotelInfo?.[0]?.rating || 0) - (a.hotelInfo?.[0]?.rating || 0));

    return result;
  }, [hotelData, selectedStars, minGuestRating, priceRange, selectedAmenities, sortType]);

  const params = useMemo(() => {
    const urlParams = new URLSearchParams();
    urlParams.set("city", city || "");
    urlParams.set("pleaseId", pleaseId || "");
    urlParams.set("checkIn", checkInParam || "");
    urlParams.set("checkOut", checkOutParam || "");
    urlParams.set("adults", String(adults));
    urlParams.set("children", String(children));
    if (childrenAges?.length > 0) urlParams.set("childrenAges", childrenAges.join(","));
    return urlParams.toString();
  }, [city, pleaseId, checkInParam, checkOutParam, adults, children, childrenAges]);

  return (
    <div className="maincontent">
      <SearchOption />
      <div className="mcontainer">
        <div className="filter-wrapper">
          
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
          <Sorting sortType={sortType} setSortType={setSortType} />
          <div className="hotel-grid">
            {loading ? (
              <div className="hotel-not">
                <Loader />
                <span>Please wait</span>
              </div>
            ) : filteredHotels.length === 0 ? (
              <div className="hotel-not">
                <img src={hotel} alt="no hotels found" />
                <h3>Nothing found matching your request</h3>
                <span>Please specify other search parameters</span>
              </div>
            ) : (
              filteredHotels.map((item) => (
                <NavLink key={`${item.id}`} to={`/hotelpage/${item.id}?${params}`}>
                  <div className="grid-card">
                    <div className="grid-card-img-box">
                      <img src={item.hotelInfo?.[0]?.main_photo} alt="hotel_photo" loading="lazy" />
                      <div className="rating-card-ab">
                        <p>{item.hotelInfo?.[0]?.rating ?? 0}</p>
                        <span>{item.hotelInfo?.[0]?.review_count ?? 0} reviews</span>
                      </div>
                    </div>
                    <div className="card-heder">
                      <div className="card-heder-info">
                        <div className="infoleft">
                          <h3>{item.hotelName}</h3>
                          <div className="infoleft-star">
                            <Rating
                              name="read-only-stars"
                              defaultValue={item.hotelInfo?.[0]?.stars || 1}
                              max={item.hotelInfo?.[0]?.stars || 1}
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
                          <p>{item.hotelInfo?.[0]?.address.slice(0, 33) || ""}..</p>
                        </div>
                      </div>
                    </div>
                    <div className="card-footer">
                      <div className="card-heder-loc">
                        <div className="romname">
                          <SingleBedIcon />
                          <p>{item.roomName}</p>
                        </div>
                        <div className="locdist">
                          <p>{item.mealType}</p>
                        </div>
                      </div>
                      <div className="cardfooter-price">
                        <p>{formatPrice(item.priceCelling)} AED</p>
                        <span>{`${nights} nights, ${quests} guests`}</span>
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

export default HotelList;
