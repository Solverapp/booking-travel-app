import { useNavigate } from "react-router-dom";
import HotelOutlined from "@mui/icons-material/HotelOutlined";
import FlightTakeoffOutlined from "@mui/icons-material/FlightTakeoffOutlined";
import ShoppingBagOutlined from "@mui/icons-material/ShoppingBagOutlined";
import TourOutlined from "@mui/icons-material/TourOutlined";
import TravelExploreOutlined from "@mui/icons-material/TravelExploreOutlined";
import PageLoader from "../loaders/PageLoader";
import { useAuth } from "../../context/AuthContext";
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

const OverviewPanel = ({ bookings, loading, onTabChange }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fullName = [user?.firstname, user?.lastname].filter(Boolean).join(" ");

  const countOf = (service) =>
    service === "all"
      ? bookings.length
      : bookings.filter((item) => item.Service === service).length;

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
            onClick={() => navigate("/hotels")}
          >
            <HotelOutlined fontSize="inherit" />
            <span>Find a hotel</span>
          </button>
          <button
            type="button"
            className="profile-action-btn"
            onClick={() => navigate("/flights")}
          >
            <FlightTakeoffOutlined fontSize="inherit" />
            <span>Find a flight</span>
          </button>
          <button
            type="button"
            className="profile-action-btn"
            onClick={() => navigate("/tours")}
          >
            <TravelExploreOutlined fontSize="inherit" />
            <span>Explore tours</span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default OverviewPanel;
