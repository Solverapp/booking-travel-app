import { useState, useEffect, useRef } from "react";
import "./style.css";
import minus from "../../img/icons/tabicons/minus.svg";
import plus from "../../img/icons/tabicons/plus.svg";


const Roomstselector = ({
  onRoomChange,
  removeToCart,
  count,
  rateCount,
  price,
  cartItems,
  id,
  type
}) => {
  const [counts, setCounts] = useState(rateCount || 0);
  // const [cartItem, setCartItem] = useState(cartItems || []);

  const MAX_TOTAL = count;

 

  const onRoomChangeRef = useRef(onRoomChange);
  useEffect(() => {
    onRoomChangeRef.current = onRoomChange;
  }, [onRoomChange]);

  useEffect(() => {
    if (typeof onRoomChangeRef.current === "function") {
      const total = counts * price;
      onRoomChangeRef.current(counts, price, total, removeToCart, type); // передаём (кол-во, цена за номер, итог)
    }
  }, [counts, price]);

  const handleIncrement = () => {
    if (counts >= MAX_TOTAL) return;
    setCounts((c) => c + 1);
  };

  const handleDecrement = (id) => {
    
    if (counts <= 0) return;
    if (counts <= 1) {removeToCart(id)};
    setCounts((c) => c - 1);
  };
  // const handleDelete = (id) => {
  //   if (counts <= 1) {removeToCart(id)};
    
   
    
  // };

  const totalPrice = counts * price;

  return (
    <div className="item-counter">
      <button
        className="counter-btn"
        onClick={() => {handleDecrement(id)}}
        disabled={counts === 0}
      >
        <img src={minus} alt="minus" />
      </button>
      <p>{counts}</p>
      <button
        className="counter-btn"
        onClick={handleIncrement}
        disabled={counts >= MAX_TOTAL}
      >
        <img src={plus} alt="plus" />
      </button>
    </div>
  );
};

export default Roomstselector;

