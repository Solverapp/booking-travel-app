import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ProfileNav from "./ProfileNav";
import OverviewPanel from "./OverviewPanel";
import BookingsPanel from "./BookingsPanel";
import SettingsPanel from "./SettingsPanel";
import "./style.css";

const TABS = ["overview", "bookings", "settings"];

export const ProfileCard = () => {
  const { user, orders } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab = TABS.includes(tabParam) ? tabParam : "overview";

  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const handleTabChange = (tab) => {
    setSearchParams(tab === "overview" ? {} : { tab });
  };

  const handleRetry = () => {
    setBookingsLoading(true);
    setReloadKey((key) => key + 1);
  };

  useEffect(() => {
    if (!user?.uid) return;

    let cancelled = false;
    const load = async () => {
      try {
        const result = await orders(user.uid);
        if (cancelled) return;
        setBookings(Array.isArray(result) ? result : []);
        setBookingsError("");
      } catch (error) {
        if (cancelled) return;
        console.error("Не удалось загрузить ордера:", error);
        setBookingsError("Could not load your bookings");
      } finally {
        if (!cancelled) setBookingsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, orders, reloadKey]);

  if (!user) return <p>Пользователь не найден</p>;

  return (
    <div className="pcontainer">
      <ProfileNav activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="profile-box">
        {activeTab === "overview" && (
          <OverviewPanel
            bookings={bookings}
            loading={bookingsLoading}
            onTabChange={handleTabChange}
          />
        )}

        {activeTab === "bookings" && (
          <BookingsPanel
            bookings={bookings}
            loading={bookingsLoading}
            error={bookingsError}
            onRetry={handleRetry}
          />
        )}

        {activeTab === "settings" && <SettingsPanel />}
      </div>
    </div>
  );
};
