import { useRef, useState } from "react";
import GuestsContent from "./GuestsContent";
import AnchoredPopover from "../searchfields/AnchoredPopover";
import { normalizeHotelGuests, guestsDisplayText } from "./guestsUtils";

const Questselector = ({ value, initialGuests, onGuestsChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [innerValue, setInnerValue] = useState(() =>
    normalizeHotelGuests(initialGuests),
  );
  const containerRef = useRef(null);

  const guests = value ?? innerValue;

  const handleChange = (next) => {
    if (value === undefined) {
      setInnerValue(next);
    }
    onGuestsChange?.(next);
  };

  return (
    <div className="dp-box">
      <p>Guests</p>
      <div className="qb-wrapper" ref={containerRef}>
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="dp">
          <span>{guestsDisplayText(guests)}</span>
        </button>

        <AnchoredPopover
          open={isOpen}
          anchorRef={containerRef}
          onClose={() => setIsOpen(false)}
          preferredWidth={378}
          ariaLabel="Choose guests"
        >
          <GuestsContent
            variant="anchored"
            mode="hotel"
            value={guests}
            onChange={handleChange}
            onDone={() => setIsOpen(false)}
          />
        </AnchoredPopover>
      </div>
    </div>
  );
};

export default Questselector;
