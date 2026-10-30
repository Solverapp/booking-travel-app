import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TourOutlined from "@mui/icons-material/TourOutlined";
import HotelOutlined from "@mui/icons-material/HotelOutlined";
import FavoriteOutlined from "@mui/icons-material/FavoriteOutlined";
import PageLoader from "../loaders/PageLoader";
import formatPrice from "../../utils/priceFormater";
import "./style.css";

const SUBTABS = [
  { id: "tours", label: "Tours", icon: TourOutlined },
  { id: "hotels", label: "Hotels", icon: HotelOutlined },
];

const FavoritesPanel = ({ favorites, loading, error, onRetry }) => {
  const [subtab, setSubtab] = useState("tours");
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  const items = useMemo(() => {
  if (!Array.isArray(favorites)) return [];
  const serviceType = subtab === "tours" ? "tour" : "hotel";
  return favorites.filter((f) => f.service_type === serviceType);
}, [favorites, subtab]);

  const handleOpenItem = (item) => {
    const meta = item.meta || {};
    if (item.service_type === "tour") {
      const params = new URLSearchParams();
      if (meta.checkIn) params.set("checkIn", meta.checkIn);
      if (meta.adults) params.set("adults", meta.adults);
      if (meta.children) params.set("children", meta.children);
      if (meta.infants) params.set("infants", meta.infants);
      navigate(`/tourspage/${item.item_id}?${params.toString()}`);
    } else if (item.service_type === "hotel") {
      const params = new URLSearchParams();
      if (meta.city) params.set("city", meta.city);
      if (meta.pleaseId) params.set("pleaseId", meta.pleaseId);
      if (meta.checkIn) params.set("checkIn", meta.checkIn);
      if (meta.checkOut) params.set("checkOut", meta.checkOut);
      if (meta.adults) params.set("adults", meta.adults);
      if (meta.children) params.set("children", meta.children);
      if (meta.childrenAges) params.set("childrenAges", meta.childrenAges);
      navigate(`/hotelpage/${item.item_id}?${params.toString()}`);
    }
  };

  const renderEmpty = () => (
    <div className="fav-state">
      <FavoriteOutlined fontSize="inherit" />
      <h3>No {subtab === "tours" ? "tours" : "hotels"} yet</h3>
      <p>
        Open a {subtab === "tours" ? "tour" : "hotel"} page and tap the heart icon to save it here.
      </p>
    </div>
  );

  const renderBody = () => {
    if (loading) return <PageLoader embedded text="Loading your favorites" />;

    if (error) {
      return (
        <div className="fav-state">
          <p>{error}</p>
          <button type="button" className="fav-retry" onClick={onRetry}>
            Try again
          </button>
        </div>
      );
    }

    if (items.length === 0) return renderEmpty();

    return (
      <div className="fav-list">
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            className="fav-card"
            onClick={() => handleOpenItem(item)}
          >
            <span className="fav-card-icon">
              {item.service_type === "tour" ? <TourOutlined fontSize="inherit" /> : <HotelOutlined fontSize="inherit" />}
            </span>

            <span className="fav-card-main">
              <span className="fav-card-name">{item.item_name || "Untitled"}</span>
              <span className="fav-card-meta">
                {item.item_city && item.item_country ? (
                  <>
                    <span>{item.item_city}</span>
                    <span>, {item.item_country}</span>
                  </>
                ) : null}
                {item.item_price != null ? (
                  <span>· {formatPrice(item.item_price)} AED</span>
                ) : null}
              </span>
            </span>

            <span className="fav-card-arrow">
              <span>→</span>
            </span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="profile-panel">
      <section className="profile-card">
        <h2 className="profile-card-title">Favorites</h2>

        <div className="fav-subtabs">
          {SUBTABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`fav-subtab ${subtab === id ? "is-active" : ""}`}
              onClick={() => setSubtab(id)}
            >
              <Icon className="fav-subtab-icon" fontSize="inherit" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {renderBody()}

        {selected && (
          <div className="fav-details-overlay" />
        )}
      </section>
    </div>
  );
};

export default FavoritesPanel;
