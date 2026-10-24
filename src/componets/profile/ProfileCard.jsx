import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useBookings } from "../../hooks/queries/useBookings";
import ProfileNav from "./ProfileNav";
import OverviewPanel from "./OverviewPanel";
import BookingsPanel from "./BookingsPanel";
import SettingsPanel from "./SettingsPanel";
import "./style.css";

const TABS = ["overview", "bookings", "settings"];

export const ProfileCard = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const bookingsQuery = useBookings();

  const tabParam = searchParams.get("tab");
  const activeTab = TABS.includes(tabParam) ? tabParam : "overview";
  const bookings = Array.isArray(bookingsQuery.data) ? bookingsQuery.data : [];
  const bookingsLoading = bookingsQuery.isLoading;
  const bookingsError = bookingsQuery.error ? "Could not load your bookings" : "";

  const handleTabChange = (tab) => {
    setSearchParams(tab === "overview" ? {} : { tab });
  };

  const handleRetry = () => {
    bookingsQuery.refetch();
  };

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
