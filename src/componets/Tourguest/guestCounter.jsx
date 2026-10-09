import { useState, useEffect, useRef } from "react";
import Select from "react-select";
import "./style.css";

const RateConter = ({
  onRoomChange,
  count,
  rateCount,
  price,
  id,
  type,
}) => {
  const options = [
    { value: 0, label: "0" },
    { value: 1, label: "1" },
    { value: 2, label: "2" },
    { value: 3, label: "3" },
    { value: 4, label: "4" },
    { value: 5, label: "5" },
    { value: 6, label: "6" },
    { value: 7, label: "7" },
    { value: 8, label: "8" },
    { value: 9, label: "9" },
    { value: 10, label: "10" },
  ];
  const [isSearchable, setIsSearchable] = useState(false);
  const [counts, setCounts] = useState(rateCount || 0);
const onRoomChangeRef = useRef(onRoomChange);
useEffect(() => {
  onRoomChangeRef.current = onRoomChange;
}, [onRoomChange]);

useEffect(() => {
  if (typeof onRoomChangeRef.current === "function") {
    const total = counts * price;
    onRoomChangeRef.current(counts, price, total, type); // передаём (кол-во, цена, тип, итог)
  }
}, [counts, price]);

const handleIncrement = (selectedOption) => {
  setCounts(selectedOption?.value ?? 1);
};

const selectedValue = options.find((opt) => opt.value === counts) || null;

  return (
    <div className="rsel-box">
      <Select
        defaultValue = {options[0]}
        value={selectedValue}
        isSearchable={isSearchable}
        onChange={handleIncrement}
        options={options}
      />
    </div>
  );
};
 
export default RateConter;

