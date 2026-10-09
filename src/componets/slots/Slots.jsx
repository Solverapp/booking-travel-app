import { useEffect, useState } from "react";
import "./style.css";
import { AccessTime, PeopleOutlined } from "@mui/icons-material";
import { Icon } from "@mui/material";

const API_KEY =
  "Bearer eyJhbGciOiJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0YzFlYzJmMC01ZjcwLTRhMzQtYjk2Yy00ZTNiNjc0NWQ3MTkiLCJVc2VySWQiOiI1MDk0MCIsIlVzZXJUeXBlIjoiQWdlbnQiLCJQYXJlbnRJRCI6IjAiLCJFbWFpbElEIjoic29sdmVyLmN1c3RvbWVyc0BnbWFpbC5jb20iLCJpc3MiOiJodHRwOi8vcmF5bmF3ZWJhcGlhd3MucmF5bmF0b3Vycy5jb20iLCJhdWQiOiJodHRwOi8vcmF5bmF3ZWJhcGlhd3MucmF5bmF0b3Vycy5jb20ifQ.s-eCu52tC5VnudmyYMITfKUIhBDJosNV8GIkRT04kh8";

const Slots = ({ option, traveldate, isSlot, selectedSlot, handleSlotToggle, setSelectedSlot, count }) => {
  const [slotsData, setSlotsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  

  useEffect(() => {
    if (!isSlot || !traveldate || !option?.tourOptionId || !option?.transferId) {
      setSlotsData([]);
      return;
    }

    const fetchNewSlots = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("https://activities.raynatours.com/api/Tour/timeslot", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: API_KEY,
          },
          body: JSON.stringify({
            tourId: option?.tourId ?? option?.tourId ?? option?.tourid,
            contractId: 300,
            travelDate: traveldate,
            tourOptionId: option.tourOptionId,
            transferId: option.transferId,
          }),
        });

        const data = await res.json();
        setSlotsData(Array.isArray(data?.result) ? data.result : []);
      } catch (err) {
        setError("Failed to load slots");
        setSlotsData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNewSlots();
  }, [isSlot, traveldate, option?.tourOptionId, option?.transferId]);

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
          const slotLabel = slot.timeSlot || slot.slotName || slot.name || slot.time;
          const isChecked= selectedSlot.id === slotKey || null
          const slotDisabled = slot.available < count ;
          const onChange=(() => handleSlotToggle({id:slotKey, opId:slot.tourOptionId, count:slot.available, time:slotLabel}))

          return (
            
            
            <button className={`slot-checkbox ${isChecked ? "active" : ""}`}
               onClick={onChange} key={slotKey} disabled = {slotDisabled}
            >
              
              <AccessTime/>
              <span>{slotLabel}</span>
              <PeopleOutlined/>
              <span>{slot.available}</span>
            </button>
          );
        })
      )}
    </div>
  );
};

export default Slots;

