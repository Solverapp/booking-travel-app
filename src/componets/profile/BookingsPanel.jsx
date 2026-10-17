import { useMemo, useState } from "react";
import LuggageOutlined from "@mui/icons-material/LuggageOutlined";
import PageLoader from "../loaders/PageLoader";
import BookingCard from "./BookingCard";
import BookingDetailsPopup from "./BookingDetailsPopup";
import { normalizeStatus } from "./bookingUtils";
import "./style.css";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "confirmed", label: "Confirmed" },
  { id: "pending", label: "Pending" },
  { id: "cancelled", label: "Cancelled" },
  { id: "completed", label: "Completed" },
];

const BookingsPanel = ({ bookings, loading, error, onRetry }) => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const statusCounts = useMemo(() => {
    const counts = { all: bookings.length };
    bookings.forEach((item) => {
      const status = normalizeStatus(item.status);
      counts[status] = (counts[status] ?? 0) + 1;
    });
    return counts;
  }, [bookings]);

  const serviceTypes = useMemo(() => {
    const counts = new Map();
    bookings.forEach((item) => {
      const service = item.Service || "Other";
      counts.set(service, (counts.get(service) ?? 0) + 1);
    });
    return Array.from(counts, ([id, count]) => ({ id, count }));
  }, [bookings]);

  const visible = useMemo(
    () =>
      bookings.filter((item) => {
        if (statusFilter !== "all" && normalizeStatus(item.status) !== statusFilter) {
          return false;
        }
        if (typeFilter !== "all" && (item.Service || "Other") !== typeFilter) {
          return false;
        }
        return true;
      }),
    [bookings, statusFilter, typeFilter],
  );

  const resetFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
  };

  const renderBody = () => {
    if (loading) return <PageLoader embedded text="Loading your bookings" />;

    if (error) {
      return (
        <div className="bookings-state">
          <p>{error}</p>
          <button type="button" className="bookings-retry" onClick={onRetry}>
            Try again
          </button>
        </div>
      );
    }

    if (bookings.length === 0) {
      return (
        <div className="bookings-state">
          <LuggageOutlined fontSize="inherit" />
          <h3>No bookings yet</h3>
          <p>When you book a flight, hotel or tour, it will show up here.</p>
        </div>
      );
    }

    if (visible.length === 0) {
      return (
        <div className="bookings-state">
          <LuggageOutlined fontSize="inherit" />
          <h3>Nothing matches your filters</h3>
          <button type="button" className="bookings-retry" onClick={resetFilters}>
            Reset filters
          </button>
        </div>
      );
    }

    return (
      <div className="bookings-list">
        {visible.map((booking) => (
          <BookingCard key={booking.id} booking={booking} onOpen={setSelected} />
        ))}
      </div>
    );
  };

  return (
    <div className="profile-panel">
      <section className="profile-card">
        <h2 className="profile-card-title">My bookings</h2>

        {bookings.length > 0 && (
          <div className="bookings-toolbar">
            <div className="bookings-filter-row">
              {STATUS_FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={`booking-chip ${statusFilter === id ? "is-active" : ""}`}
                  onClick={() => setStatusFilter(id)}
                >
                  {label} ({statusCounts[id] ?? 0})
                </button>
              ))}
            </div>

            {serviceTypes.length > 1 && (
              <div className="bookings-filter-row">
                <button
                  type="button"
                  className={`booking-chip ${typeFilter === "all" ? "is-active" : ""}`}
                  onClick={() => setTypeFilter("all")}
                >
                  All types ({bookings.length})
                </button>
                {serviceTypes.map(({ id, count }) => (
                  <button
                    key={id}
                    type="button"
                    className={`booking-chip ${typeFilter === id ? "is-active" : ""}`}
                    onClick={() => setTypeFilter(id)}
                  >
                    {id} ({count})
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {renderBody()}
      </section>

      <BookingDetailsPopup booking={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default BookingsPanel;
