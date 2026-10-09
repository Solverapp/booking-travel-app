// ...existing code...
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./style.css";
import Roomstselector from "../roomcounter/RoomSelector";
import guest from "../../img/icons/Hotelicons/Guest.svg";
import meals from "../../img/icons/Hotelicons/meals.svg";
import bed from "../../img/icons/Hotelicons/bed.svg";


const Rooms = ({ hotel }) => {
  const rooms = hotel.rooms;

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

  const [cartItem, setcartItem] = useState([]);
  // считаем общую сумму и количество номера в корзине
  const [cartTotal, setCartTotal] = useState({
    total: cartItem.reduce((prev, curr) => {
      return prev + curr.totalPrice;
    }, 0),
    count: cartItem.reduce((prev, curr) => {
      return prev + curr.qty;
    }, 0),
  });
  // считаем общую сумму и количество номеров в корзине
  useEffect(() => {
    setCartTotal({
      total: cartItem.reduce((prev, curr) => {
        return prev + curr.totalPrice;
      }, 0),
      count: cartItem.reduce((prev, curr) => {
        return prev + curr.qty;
      }, 0),
    });
  }, [cartItem]);

  let nights = 0;
  if (checkIn && checkOut && checkOut > checkIn) {
    nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  // теперь handle принимает ключ + counts + price
  const handleCounthange = (key, newCounts, newPrice) => {
    const p = Number(newPrice || 0);
    const c = Number(newCounts || 0);
    const t = Number(p * c || 0);
    setTotals((prev) => ({ ...prev, [key]: p * c }));
    // handle принимает изменение количество и тотал в каждом item carte
    setcartItem((cartItem) => {
      return cartItem.map((item) => {
        if (item.id === key) {
          return {
            ...item,
            qty: c,
            totalPrice: c * item.price,
          };
        }
        return item;
      });
    });
  };

  const addToCart = (obj) => {
    setcartItem((prev) => [
      ...prev,
      {
        id: obj.id,
        name: obj.name,
        price: Math.round(obj.price * nights * (1 + commission / 100)),
        bedType: obj.bedType,
        meals: obj.meals,
        count: obj.count,
        qty: 1,
        totalPrice: 0,
      },
    ]);
  };
  const removeToCart = (id, removeToCart) => {
    setcartItem((cartItem) => cartItem.filter((value) => id !== value.id));
  };

  console.log(totals);

  return (
    <div className="rcontainer">
      <div className="content">
        <h2>Available rooms</h2>
        <div className="content-row">
          <div className="room-content">
            {rooms.map((room) => (
              <div className="rooms-box" key={`${room.id}`}>
                <div className="romm-info">
                  <span>Only {`${room.count}`} rooms left on our website</span>
                  <img src={room.images[0]} alt="" />
                  <h4>{`${room.name}`}</h4>
                </div>
                <div className="rate-box">
                  {room.rates.map((rate) => {
                    const key = `${room.id}-${rate.id}`;
                    return (
                      <div className="rate-item" key={key}>
                        <div className="infoitem">
                          <div className="infoprice">
                            <div className="guest">
                              <img src={guest} alt="guests" />
                            </div>
                            <h2>
                              {`${
                                totals[key] ||
                                Math.round(
                                  rate.price * nights * (1 + commission / 100),
                                )
                              }`}
                              ₽
                            </h2>
                            <span>Including taxes and fees</span>
                          </div>
                          <div className="rate-amenit">
                            <button>
                              <img src={meals} alt="meals" />
                              <span>{rate.meals || "Room only"}</span>
                            </button>
                            <button>
                              <img src={bed} alt="bed" />
                              <span>{rate.bedType}</span>
                            </button>
                          </div>
                          {/* <Roomstselector
                            onRoomChange={(newCounts, newPrice) =>
                              handleCounthange(key, newCounts, newPrice)}
                            count={rate.count}
                            rateCount={0}
                            price={Math.round(
                              rate.price * nights * (1 + commission / 100),)}
                          /> */}
                        </div>
                        <div className="addCard">
                          <button
                            key={rate.id}
                            disabled={cartItem.some(
                              (item) => item.id === rate.id,
                            )}
                            onClick={() => addToCart(rate)}
                          >
                            Add to card
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <span>
              {cartItem.length === 0
                ? "Card empty"
                : `${cartItem.length} room for`}
            </span>
            <div className="cart-box">
              {cartItem.map((item) => {
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
                      cartItems={cartItem}
                      price={Math.round(
                        item.price * nights * (1 + commission / 100),
                      )}
                    />
                  </div>
                );
              })}
            </div>
            <div className="cart-total">
              <div className="total-info">
                <h4>Total</h4>
                <p>{cartTotal.total}</p>
              </div>
              <div className="total-button">
                <button>I’m booking</button>
                <span>You won’t be charged yet</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rooms;
// ...existing code...
