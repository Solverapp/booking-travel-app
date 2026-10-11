import { useEffect, useState } from "react";
import "./style.css";
import { AccessTime, PeopleOutlined } from "@mui/icons-material";

// Импортируем чистую функцию запроса слотов из вашего сервиса
import { fetchTourSlots } from "../../services/raynaService";

const Slots = ({
  option,
  traveldate,
  isSlot,
  selectedSlot,
  handleSlotToggle,
  count,
}) => {
  const [slotsData, setSlotsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tourId = option?.tourId ?? option?.tourId ?? option?.tourid;

  useEffect(() => {
    // Если слоты не нужны или параметров не хватает, очищаем массив и выходим
    if (
      !isSlot ||
      !traveldate ||
      !option?.tourOptionId ||
      !option?.transferId
    ) {
      setSlotsData([]);
      return;
    }

    const fetchNewSlots = async () => {
      setLoading(true);
      setError("");

      try {
        // Вызываем функцию из единого сервиса вместо локального fetch
        const data = await fetchTourSlots({
          tourId,
          travelDate: traveldate,
          tourOptionId: option.tourOptionId,
          transferId: option.transferId,
        });

        setSlotsData(data);
      } catch (err) {
        setError("Failed to load slots");
        setSlotsData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNewSlots();
  }, [isSlot, traveldate, option?.tourOptionId, option?.transferId, tourId]);

  if (!isSlot) return null;
  if (loading) return <div className="slot-box">Loading slots...</div>;
  if (error) return <div className="slot-box">{error}</div>;

  return (
    <div className="slot-box">
      {slotsData.length === 0 ? (
        <span>No slots available</span>
      ) : (
        slotsData.map((slot) => {
          const slotKey = slot.timeSlotId || slot.id || slot.timeSlot;
          const slotLabel =
            slot.timeSlot || slot.slotName || slot.name || slot.time;
          const isChecked = selectedSlot.id === slotKey;
          const slotDisabled = slot.available < count;

          const onChange = () =>
            handleSlotToggle({
              id: slotKey,
              opId: option.tourOptionId,
              count: slot.available,
              time: slotLabel,
            });

          return (
            <button
              className={`slot-checkbox ${isChecked ? "active" : ""}`}
              onClick={onChange}
              key={slotKey}
              disabled={slotDisabled}
            >
              <AccessTime />
              <span>{slotLabel}</span>
              <PeopleOutlined />
              <span>{slot.available}</span>
            </button>
          );
        })
      )}
    </div>
  );
};

export default Slots;
