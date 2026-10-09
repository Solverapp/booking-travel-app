
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./style.css";
import Roomstselector from "../roomcounter/RoomSelector";
import guest from "../../img/icons/Hotelicons/Guest.svg";
import meals from "../../img/icons/Hotelicons/meals.svg";
import bed from "../../img/icons/Hotelicons/bed.svg";


const Card = ({ hotel, cartItems,  removeToCart,}) => {
  const rooms = hotel.rooms;
  
  // const [cartItems, setcartItem] = useState([]);

  const [searchParams, setSearchParams] = useSearchParams();
  const city = searchParams.get("city");
  const checkInParam = searchParams.get("checkIn");
  const checkOutParam = searchParams.get("checkOut");
  const adultsParams = searchParams.get("adults");
  const childrenParams = searchParams.get("children");
  const infantsParams = searchParams.get("infants");
  const adults = parseInt(adultsParams);
  const childern = parseInt(childrenParams);
  const infants = parseInt(infantsParams);
  const quests = adults + childern + infants;
  const checkIn = checkInParam ? new Date(checkInParam) : null;
  const checkOut = checkOutParam ? new Date(checkOutParam) : null;
  const commission = hotel.commission || 0;

  // храним total для каждого rate по ключу `${roomId}-${rateId}`
  const [totals, setTotals] = useState({});

  
  // считаем общую сумму и количество номера в корзине
  const [cartTotal, setCartTotal] = useState({
    total: cartItems.reduce((prev, curr) => {
      return prev + curr.totalPrice;
    }, 0),
    count: cartItems.reduce((prev, curr) => {
      return prev + curr.qty;
    }, 0),
  });
  // считаем общую сумму и количество номеров в корзине
  useEffect(() => {
    setCartTotal({
      total: cartItems.reduce((prev, curr) => {
        return prev + curr.totalPrice;
      }, 0),
      count: cartItems.reduce((prev, curr) => {
        return prev + curr.qty;
      }, 0),
    });
  }, [cartItems]);

  let nights = 0;
  if (checkIn && checkOut && checkOut > checkIn) {
    nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  // теперь handle принимает ключ + counts + price
  // const handleCounthange = (key, newCounts, newPrice) => {
  //   const p = Number(newPrice || 0);
  //   const c = Number(newCounts || 0);
  //   const t = Number(p * c || 0);
  //   setTotals((prev) => ({ ...prev, [key]: p * c }));
  //   // handle принимает изменение количество и тотал в каждом item carte
  //   setcartItem((cartItems) => {
  //     return cartItems.map((item) => {
  //       if (item.id === key) {
  //         return {
  //           ...item,
  //           qty: c,
  //           totalPrice: c * item.price,
  //         };
  //       }
  //       return item;
  //     });
  //   });
  // };

  // const addToCart = (obj) => {
  //   setcartItem((prev) => [
  //     ...prev,
  //     {
  //       id: obj.id,
  //       name: obj.name,
  //       price: Math.round(obj.price * nights * (1 + commission / 100)),
  //       bedType: obj.bedType,
  //       meals: obj.meals,
  //       count: obj.count,
  //       qty: 1,
  //       totalPrice: 0,
  //     },
  //   ]);
  // };
  // const removeToCart = (id, removeToCart) => {
  //   setcartItem((cartItem) => cartItem.filter((value) => id !== value.id));
  // };

 

  return (
    <div className="card">
      <span>
        {cartItems.length === 0 ? "Card empty" : `${cartItems.length} room for`}
      </span>
      <div className="cart-box">
        {cartItems.map((item) => {
          const key = `${item.id}`;
          return (
            <div className="cart-item" key={key}>
              <div className="cart-item-price">
                <h4>{item.name}</h4>
                <p>{item.totalPrice}₽</p>
              </div>

              <Roomstselector
                onRoomChange={(newCounts, newPrice) =>
                  handleCounthange(key, newCounts, newPrice)
                }
                removeToCart={removeToCart}
                count={item.count}
                rateCount={0}
                id={key}
                cartItems={cartItems}
                price={Math.round(item.price * nights * (1 + commission / 100))}
              />
            </div>
          );
        })}
      </div>

      <span> {cartTotal.total} </span>
    </div>
  );
};

export default Card;

