import { useState } from "react";
import { useNavigate } from "react-router-dom";
import HotelOutlined from "@mui/icons-material/HotelOutlined";
import FlightTakeoffOutlined from "@mui/icons-material/FlightTakeoffOutlined";
import ShoppingBagOutlined from "@mui/icons-material/ShoppingBagOutlined";
import TourOutlined from "@mui/icons-material/TourOutlined";
import TravelExploreOutlined from "@mui/icons-material/TravelExploreOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import PageLoader from "../loaders/PageLoader";
import { useAuth } from "../../context/AuthContext";
import defaultdates from "../../utils/defaultdates";
import { buildFlightsParams } from "../../utils/flightSearch";
import FlightSearchForm from "../flights/FlightSearchForm";
import {
  DEFAULT_TOUR_CITY,
  POPULAR_HOTEL_DESTINATIONS,
} from "../../mock/searchDestinations";
import "./style.css";

const initialsOf = (user) => {
  const letters = `${user?.firstname?.[0] ?? ""}${user?.lastname?.[0] ?? ""}`;
  return (letters || user?.email?.[0] || "T").toUpperCase();
};

const SERVICE_STATS = [
  { id: "all", label: "Total bookings", icon: ShoppingBagOutlined },
  { id: "Flight", label: "Flights", icon: FlightTakeoffOutlined },
  { id: "Hotel", label: "Hotels", icon: HotelOutlined },
  { id: "Tour", label: "Tours", icon: TourOutlined },
];

const DEFAULT_HOTEL_DESTINATION =
  POPULAR_HOTEL_DESTINATIONS.find(({ id }) => id === "dubai") ?? {
    name: "Dubai",
    placeId: "",
  };

const OverviewPanel = ({ bookings, loading, onTabChange }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [flightSearchOpen, setFlightSearchOpen] = useState(false);
  const fullName = [user?.firstname, user?.lastname].filter(Boolean).join(" ");

  const countOf = (service) =>
    service === "all"
      ? bookings.length
      : bookings.filter((item) => item.Service === service).length;

  const handleFindHotel = () => {
    const params = new URLSearchParams({
      city: DEFAULT_HOTEL_DESTINATION.name,
      pleaseId: DEFAULT_HOTEL_DESTINATION.placeId,
      checkIn: defaultdates.tomorrow,
      checkOut: defaultdates.dayAfterTomorrow,
      adults: "1",
      children: "0",
    });
    navigate(`/hotels?${params.toString()}`);
  };

  const handleFlightSearch = (values) => {
    setFlightSearchOpen(false);
    navigate(`/flights?${buildFlightsParams(values).toString()}`);
  };

  const handleExploreTours = () => {
    const params = new URLSearchParams({
      city: DEFAULT_TOUR_CITY,
      checkIn: defaultdates.tomorrow,
      adults: "1",
      children: "0",
      infants: "0",
    });
    navigate(`/tours?${params.toString()}`);
  };

  return (
    <div className="profile-panel">
      <section className="profile-card profile-hero">
        <span className="profile-avatar profile-avatar--lg">{initialsOf(user)}</span>
        <div className="profile-hero-info">
          <h1>{fullName || "Traveler"}</h1>
          <p>{user?.email}</p>
          <span className="profile-account-id">Account ID: {user?.uid}</span>
        </div>
      </section>

      <section className="profile-card">
        <h2 className="profile-card-title">Your activity</h2>
        {loading ? (
          <PageLoader embedded text="Loading your trips" />
        ) : (
          <div className="profile-stats">
            {SERVICE_STATS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className="profile-stat"
                onClick={() => onTabChange("bookings")}
              >
                <span className="profile-stat-icon">
                  <Icon fontSize="inherit" />
                </span>
                <strong>{countOf(id)}</strong>
                <span className="profile-stat-label">{label}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="profile-card">
        <h2 className="profile-card-title">Plan your next trip</h2>
        <div className="profile-actions">
          <button
            type="button"
            className="profile-action-btn"
            onClick={handleFindHotel}
          >
            <HotelOutlined fontSize="inherit" />
            <span>Find a hotel</span>
          </button>
          <button
            type="button"
            className={`profile-action-btn${flightSearchOpen ? " is-active" : ""}`}
            aria-expanded={flightSearchOpen}
            aria-controls="profile-flight-search"
            onClick={() => setFlightSearchOpen((open) => !open)}
          >
            <FlightTakeoffOutlined fontSize="inherit" />
            <span>Find a flight</span>
          </button>
          <button
            type="button"
            className="profile-action-btn"
            onClick={handleExploreTours}
          >
            <TravelExploreOutlined fontSize="inherit" />
            <span>Explore tours</span>
          </button>
        </div>

        {flightSearchOpen && (
          <div className="profile-trip-search" id="profile-flight-search">
            <div className="profile-trip-search-head">
              <h3>Find a flight</h3>
              <button
                type="button"
                className="profile-trip-search-close"
                aria-label="Close flight search"
                onClick={() => setFlightSearchOpen(false)}
              >
                <CloseOutlined fontSize="small" />
              </button>
            </div>
            <FlightSearchForm onSearch={handleFlightSearch} />
          </div>
        )}
      </section>
    </div>
  );
};

export default OverviewPanel;
