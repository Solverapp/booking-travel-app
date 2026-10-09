import { useMemo, useState } from "react";
import { useSearchParams, NavLink, useNavigate } from "react-router-dom";
import "./style.css";
import { RoundedCorner, People, Wifi, LocalParking, AcUnit, FitnessCenter, Pool, SmokeFree, TaskAlt, Tv, CoffeeMaker, ShoppingCart } from '@mui/icons-material';
import meals from "../../../img/icons/Hotelicons/meals.svg";
import bed from "../../../img/icons/Hotelicons/bed.svg";

const Rooms = ({ hotel, rooms, rates }) => {
const [searchParams] = useSearchParams();
const navigate = useNavigate();
  const adults = searchParams.get("adults");
  const children = searchParams.get("children");
  const checkin = searchParams.get("checkIn");
  const checkout = searchParams.get("checkOut");
  const childrenAgesStr = searchParams.get("childrenAges") || "";
  const childrenAges = useMemo(
    () => (childrenAgesStr ? childrenAgesStr.split(",").map(Number) : []),
    [childrenAgesStr],
  );
  const pleaseId = searchParams.get('pleaseId');
  const cityname = searchParams.get('city');
  const hotelId = hotel.id;
  const [offerItem, setOfferItem] = useState([]);
  const roomsdata = rooms || [];
  const roomRates = rates || [];

  const getRoomImage = (mappedRoomId) => {
    if (!roomsdata.length) return null;
    const room = roomsdata.find(r => r.id === mappedRoomId);
    if (room?.photos && room.photos.length > 0) {
      return room.photos[0].url;
    }
    return hotel?.main_photo || '';
  };

  // Оптимизируем группировку тарифов, чтобы она не вызывалась на каждый чих рендера
  const allRooms = useMemo(() => {
    const grouped = {};
    
    roomRates.forEach(rt => {
      if (rt.rates && Array.isArray(rt.rates)) {
        rt.rates.forEach(rate => {
          const roomId = rate.mappedRoomId;
          if (!grouped[roomId]) {
            grouped[roomId] = [];
          }
          grouped[roomId].push({
            roomName: rate.name,
            image: getRoomImage(roomId) || '',
            offerId: rt.offerId,
            rate,
          });
        });
      }
    });

    return Object.entries(grouped).map(([id, data]) => {
      const parsedId = parseInt(id, 10);
      return {
        roomId: parsedId,
        roomInfos: roomsdata.filter((rd) => rd.id === parsedId),
        offers: data,
      };
    });
  }, [roomsdata, roomRates, hotel]);
  
  const facilityIcons = [
    { keywords: ["wifi"], icon: Wifi },
    { keywords: ["fitness"], icon: FitnessCenter },
    { keywords: ["parking"], icon: LocalParking },
    { keywords: ["pool"], icon: Pool },
    { keywords: ["conditioning"], icon: AcUnit },
    { keywords: ["smoking"], icon: SmokeFree },
    { keywords: ["tv"], icon: Tv },
    { keywords: ["coffee"], icon: CoffeeMaker },
  ];

  const getFacilityIcon = (name) => {
    const word = (name || "").toLowerCase();
    const match = facilityIcons.find(({ keywords }) => keywords.some((key) => word.includes(key)));
    const Icon = match?.icon || TaskAlt;
    return <Icon />;
  };

  const addCheckout = (offerId, roomname, totalamount) => {
    const guests = adults + children;
    const newItem = {
      offerId : offerId,
      hid: hotelId,
      imgurl: hotel.main_photo,
      roomName : roomname,
      hotelName : hotel.name,
      checkinDate : checkin,
      checkoutDate : checkout,
      adults : adults,
      childrens : children,
      guests : guests,
      totalAmount : totalamount,
      please : pleaseId,
      city : cityname
    };
   const next = [...offerItem, newItem];
   setOfferItem(next);
   navigate("/checkout/", { state: { offerItem: next } });



  }

  return (
    <div className="rcontainer">
      <div className="content">
        <h2>Available rooms</h2>
        <div className="content-row">
          <div className="room-content">
            {allRooms.map((room) => { 
              const roomName = room.offers[0]?.roomName || "Standard Room";
              const roomSqu = room.roomInfos[0]?.roomSizeSquare || "N/A";
              const roomSquSize = room.roomInfos[0]?.roomSizeUnit || "";
              const maxGuest = (room.roomInfos[0]?.maxAdults || 0) + (room.roomInfos[0]?.maxChildren || 0);
              const roomAmenities = room.roomInfos[0]?.roomAmenities || [];

              return (
                <div className="rooms-item" key={`${room.roomId}`}>
                  <div className="romm-item-info">
                    <span>Only 5 rooms left on our website</span>
                    <img src={room.offers[0]?.image} alt={roomName} />
                    <h4>{roomName}</h4>
                    <div className="romm-info-detalis">
                      <p>Room details</p>
                      <div className="detalis-heder">
                        <div className="detalis-heder-item">
                          <RoundedCorner />
                          <span>{roomSqu} {roomSquSize}</span>
                        </div>
                        <div className="detalis-heder-item">
                          <People />
                          <span>Sleep {maxGuest}</span>
                        </div>
                      </div>
                      <p>Room amenities</p>
                      <div className="amenites-box">
                        {roomAmenities.slice(0, 6).map((amenitet, idx) => (
                          <button className="amenites-btn" key={amenitet.amenitiesId || idx}>
                            {getFacilityIcon(amenitet.name)} 
                            <span>{amenitet.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="rate-box">
                    {room.offers.map((item, idx) => {
                      const key = `${idx}`;
                      const bedroom = room.roomInfos[0] || {};
                      const ratePrice = item.rate.retailRate?.total?.[0]?.amount?.toFixed(2) || 'N/A';
                      const isRefundable = item.rate.cancellationPolicies?.refundableTag === "RFN";
                      const cancelTime = item.rate.cancellationPolicies?.cancelPolicyInfos?.[0]?.cancelTime || "";

                      return (
                        <div className="rates-item" key={key}>
                          <div className="infoitem">
                            <div className="infoprice">
                              <h2>{ratePrice} AED</h2>
                              <span>Including taxes and fees</span>
                              <div className="canseletion">
                                <span className={`rfn ${isRefundable ? "rf" : ""}`}>
                                  {isRefundable ? `Refund to ${cancelTime}` : 'Non-refundable'}
                                </span>
                              </div>
                            </div>
                            <div className="rate-amenit">
                              <button>
                                <img src={meals} alt="meals" />
                                <span>{item.rate.boardName || "Room Only"}</span>
                              </button>
                              <button>
                                <img src={bed} alt="bed" />
                                <span>{bedroom.bedTypes?.[0]?.bedType || "Standard Bed"}</span>
                              </button>
                            </div>
                          </div>
                          <div className="addCard">
                            <button onClick={() => addCheckout(item.offerId, roomName, ratePrice)}>
                              <ShoppingCart />
                              Buy Now
                              
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rooms;
