import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import QureyTour from "../qureytour/CityTour";
import DatePickerOne from "../datepicker/DatePickerOne";
import MobileSearch from "../searchfields/MobileSearch";
import useMediaQuery from "../../utils/useMediaQuery";
import defaultdates from "../../utils/defaultdates";
import { DEFAULT_TOUR_CITY } from "../../mock/searchDestinations";
import sbtn from "../../img/icons/tabicons/search.svg";

import "./style.css";

const SearchOption = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useMediaQuery("(max-width: 968px)");

  const [checkIn, setCheckIn] = useState(null);
  const [city, setCity] = useState(DEFAULT_TOUR_CITY);
  const [isInitialized, setIsInitialized] = useState(false);

  // Инициализируем из URL параметров при загрузке и при изменении searchParams
  useEffect(() => {
    const urlCheckIn = searchParams.get("checkIn");
    const urlCity = searchParams.get("city");

    if (urlCheckIn) {
      const [y, m, d] = urlCheckIn.split("-");
      setCheckIn(new Date(Number(y), Number(m) - 1, Number(d)));
    }

    if (urlCity) {
      setCity(urlCity);
    } else {
      setCity(DEFAULT_TOUR_CITY);
    }

    setIsInitialized(true);
  }, [searchParams]);

  const handleCityChange = (newCity) => {
    setCity(newCity);
  };

    const handleSearchHotel = () => {
      const fmt = (date) => {
        if (!date) return "";
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      };

      const params = new URLSearchParams({
        city: city,
        checkIn: fmt(checkIn) || defaultdates.tomorrow,
        adults: "1",
        children: "0",
        infants: "0",
      });

      if (window.location.pathname.includes("/tours")) {
        setSearchParams(Object.fromEntries(params));
      } else {
        navigate(`/tours?${params.toString()}`);
      }
    };

  if (!isInitialized) {
    return null; // Не рендерим, пока не инициализировали
  }

  // Мобильный режим: липкая панель полей убирается, вместо неё
  // кнопка-саммари (видна над кнопкой Filters) с одной шторкой поиска
  if (isMobile) {
    return (
      <MobileSearch
        variant="results"
        mode="tour"
        city={city}
        onCityChange={handleCityChange}
        dateMode="single"
        checkIn={checkIn}
        onCheckInChange={setCheckIn}
        onSearch={handleSearchHotel}
      />
    );
  }

  return (
    <div className="s-container">
      <div className="s-option">
        <QureyTour
          onCityChange={handleCityChange}
          initialCity={city}
          key={`city-${city}`}
        />
        <DatePickerOne
          checkIn={checkIn}
          onCheckInChange={setCheckIn}
        />
        <div className="sop-btn" onClick={handleSearchHotel}>
          <img src={sbtn} alt="sbtn"  />
          <span>Search</span>
        </div>
      </div>
    </div>
  );
};

export default SearchOption;
