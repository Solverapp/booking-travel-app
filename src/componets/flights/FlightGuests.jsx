import { useRef, useState } from "react";
import GuestsContent from "../quest/GuestsContent";
import AnchoredPopover from "../searchfields/AnchoredPopover";
import { flightGuestsDisplayText } from "../quest/guestsUtils";
import "./style.css";

const FLIGHT_HINTS = { adults: "", children: "Ages 2-11", infants: "Under 2" };

const FlightGuests = ({ value, onChange, cabin, onCabinChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const guests = value ?? { adults: 1, children: 0, infants: 0 };

  return (
    <div className="dp-box">
      <p>Passengers</p>
      <div className="qb-wrapper" ref={ref}>
        <button type="button" className="dp" onClick={() => setOpen(!open)}>
          <span>{flightGuestsDisplayText(guests, cabin)}</span>
        </button>

        <AnchoredPopover
          open={open}
          anchorRef={ref}
          onClose={() => setOpen(false)}
          preferredWidth={378}
          ariaLabel="Choose passengers and cabin"
        >
          <GuestsContent
            variant="anchored"
            mode="tour"
            value={guests}
            onChange={onChange}
            hints={FLIGHT_HINTS}
            cabin={cabin}
            onCabinChange={onCabinChange}
            onDone={() => setOpen(false)}
          />
        </AnchoredPopover>
      </div>
    </div>
  );
};

export default FlightGuests;
