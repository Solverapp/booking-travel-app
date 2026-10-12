import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./style.css";
import PleaseSearch from "../qureytour/Pleasenew";
import CityTour from "../qureytour/CityTour"
import DatePickerOne from "../datepicker/DatePickerOne";
import DatePickerH from "../datepickerhotel/DatePickerH";
import Questselector from "../quest/QuestSelector";
import MobileSearch from "../searchfields/MobileSearch";
import useMediaQuery from "../../utils/useMediaQuery";
import defaultdates from "../../utils/defaultdates";

import tur from "../../img/icons/tabicons/sun.svg";
import hotel from "../../img/icons/tabicons/building-4.svg";
import hotelactiv from "../../img/icons/tabicons/building-4active.svg";
import air from "../../img/icons/tabicons/airplane.svg";
import airdark from "../../img/icons/tabicons/airplane-dark.svg";
import revers from "../../img/icons/tabicons/arrow-2.svg";
import sbtn from "../../img/icons/tabicons/search.svg";


const HOTEL_LOCATION_HINT = "Select a city from the suggestions";

const Search = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 968px)");
  const [activeTab, setActiveTab] = useState("tour");
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [checkInH, setCheckInH] = useState(null);
  const [checkOutH, setCheckOutH] = useState(null);
  const [pleaseId, setPleaseId] = useState("");
  const [city, setCity] = useState("");
  const [guestsHotel, setGuestsHotel] = useState({ adults: 1, children: 0, childrenAges: [],});

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setCity("");
    setPleaseId("");
  };

  const activtab = () => {
    switchTab("tour");
  };

  const activtabH = () => {
    switchTab("hotel");
  };

  const activtabA = () => {
    switchTab("air");
  };

  const handleGuestsChangeHotel = (newGuests) => {
    setGuestsHotel(newGuests);
  };
  const handleCityChange = (newCity, newPleaseId) => {
    setCity(newCity);
    setPleaseId(newPleaseId);
  };

  const handleCityEdit = () => {
    setPleaseId("");
  };

  const handleSearchHotel = () => {
    if (!pleaseId) return;
    const fmt = (date) => {
      if (!date) return "";
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    const params = new URLSearchParams();
    
        params.set("city", city || "");
        params.set("pleaseId", pleaseId || "");
        params.set("checkIn", fmt(checkInH) || defaultdates.tomorrow);
        params.set("checkOut", fmt(checkOutH) || defaultdates.dayAfterTomorrow);
        params.set("adults", String(guestsHotel.adults));
        params.set("children", String(guestsHotel.children));
    
        if (guestsHotel.childrenAges?.length > 0) {
          params.set("childrenAges", guestsHotel.childrenAges.join(","));
        } else {
          params.delete("childrenAges");
        }
    
    

    navigate(`/hotels?${params.toString()}`);
  };
  const handleSearchTour = () => {
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
      // checkOut: fmt(checkOutH) || defaultdates.dayAfterTomorrow,
      adults: String(guestsHotel.adults),
      children: String(guestsHotel.children),
      infants: 0,
    });

    navigate(`/tours?${params.toString()}`);
  };

  return (
    <div className="searchcontainer">
      <div className="tabsoption">
        <div
          className={`tab-btn ${activeTab === "tour" ? "actives" : ""}`}
          onClick={activtab}
        >
          <img src={tur} alt="tur" />
          <span>Tour</span>
        </div>
        <div
          className={`tab-btn ${activeTab === "hotel" ? "actives" : ""}`}
          onClick={activtabH}
        >
          <img src={activeTab === "hotel" ? hotelactiv : hotel} alt="tur" />
          <span>Hotels</span>
        </div>
        <div
          className={`tab-btn ${activeTab === "air" ? "actives" : ""}`}
          onClick={activtabA}
        >
          <img src={activeTab === "air" ? airdark : air} alt="tur" />
          <span>Flights</span>
        </div>
      </div>
      {isMobile && activeTab !== "air" && (
        <MobileSearch
          variant="home"
          mode={activeTab === "tour" ? "tour" : "hotel"}
          city={city}
          onCityChange={handleCityChange}
          dateMode={activeTab === "tour" ? "single" : "range"}
          checkIn={activeTab === "tour" ? checkIn : checkInH}
          checkOut={activeTab === "tour" ? checkOut : checkOutH}
          onCheckInChange={activeTab === "tour" ? setCheckIn : setCheckInH}
          onCheckOutChange={activeTab === "tour" ? setCheckOut : setCheckOutH}
          guests={guestsHotel}
          onGuestsChange={handleGuestsChangeHotel}
          onSearch={
            activeTab === "tour" ? handleSearchTour : handleSearchHotel
          }
          searchDisabled={activeTab === "hotel" && !pleaseId}
          searchHint={HOTEL_LOCATION_HINT}
          onCityEdit={handleCityEdit}
        />
      )}
      {!isMobile && (
        <>
      <div className={`searchbox ${activeTab === "tour" ? "" : "hiden"}`}>
        <div className="s-optiontour">
          <CityTour
            onCityChange={handleCityChange}
            initialCity={city}
            key={`tour-city-${city}`}
          />
          {/* <ThemeTour /> */}
          <DatePickerOne
            checkIn={checkIn}
            checkOut={checkOut}
            onCheckInChange={setCheckIn}
            onCheckOutChange={setCheckOut}
          />
          {/* <div className="sop-box-theme">
            <p>Guests</p>
            <span>2 adults, no children</span>
          </div> */}
          <div className="sop-btn" onClick={handleSearchTour}>
            <img src={sbtn} alt="sbtn" />
            <span>Search</span>
          </div>
        </div>
        {/* <div className="tourTypes">
          <div className="tourTypes-checkbox">
            <img src={checkbox} alt="check" />
            <span>Only tour</span>
          </div>
          <div className="tourTypes-checkbox">
            <img src={checkbox} alt="check" />
            <span>Tour & hotel</span>
          </div>
          <div className="tourTypes-checkbox">
            <img src={checkbox} alt="check" />
            <span>All inclusive (tour, flights, hotel)</span>
          </div>
        </div> */}
      </div>
      <div className={`searchbox ${activeTab === "hotel" ? "" : "hiden"}`}>
        <div className="s-optiontour">
          <PleaseSearch
            onCityChange={handleCityChange}
            onCityEdit={handleCityEdit}
            initialCity={city}
            key={`hotel-city-${city}`}
          />
          <DatePickerH
            checkInH={checkInH}
            checkOutH={checkOutH}
            onCheckInChangeH={setCheckInH}
            onCheckOutChangeH={setCheckOutH}
          />
          <Questselector
            value={guestsHotel}
            onGuestsChange={handleGuestsChangeHotel}
          />
          <div
            className={`sop-btn${pleaseId ? "" : " is-disabled"}`}
            aria-disabled={!pleaseId}
            onClick={handleSearchHotel}
          >
            <img src={sbtn} alt="sbtn" />
            <span>Search</span>
          </div>
        </div>
        {!pleaseId && <p className="s-hint">{HOTEL_LOCATION_HINT}</p>}
      </div>
      <div className={`searchbox ${activeTab === "air" ? "" : "hiden"}`}>
        <div className="s-optiontour">
          <div className="sop-box-search-air">
            <div className="air-item">
              <div className="air-item-box">
                <p>From</p>
                <span>Moscow</span>
              </div>
              <span className="gray">MOW</span>
            </div>
            <div className="air-item-revers">
              <img src={revers} alt="arrow" />
            </div>
            <div className="air-item">
              <div className="air-item-box">
                <p>To</p>
                <span>Hanoi</span>
              </div>
              <span className="gray">HAN</span>
            </div>
          </div>
          <div className="sop-box-dpicker">
            <div className="dpicker-checkin">
              <p>When</p>
              <span>16.12.2025</span>
            </div>
            <div className="dpicker-checout">
              <p>Return</p>
              <span>16.12.2025</span>
            </div>
          </div>
          <div className="sop-box-theme">
            <p>Guests</p>
            <span>2 addivts, no children</span>
          </div>
          <div className="sop-btn">
            <img src={sbtn} alt="sbtn" />
            <span>Search</span>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default Search;
