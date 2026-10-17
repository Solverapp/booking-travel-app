import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./style.css";
import { RoundedCorner, People, Wifi, LocalParking, AcUnit, FitnessCenter, Pool, SmokeFree, TaskAlt, Tv, CoffeeMaker, ShoppingCart } from '@mui/icons-material';
import RoomDetailsPopup from "./RoomDetailsPopup";
import meals from "../../../img/icons/Hotelicons/meals.svg";
import bed from "../../../img/icons/Hotelicons/bed.svg";
import { getStoredCurrency } from "../../../utils/currency";

const Rooms = ({ hotel, rooms, rates }) => {
const [searchParams] = useSearchParams();
const navigate = useNavigate();
  const adults = searchParams.get("adults");
  const children = searchParams.get("children");
  const checkin = searchParams.get("checkIn");
  const checkout = searchParams.get("checkOut");
  const pleaseId = searchParams.get('pleaseId');
  const cityname = searchParams.get('city');
  const hotelId = hotel.id;
  const [offerItem, setOfferItem] = useState([]);
  const [detailRoom, setDetailRoom] = useState(null);
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

  const addCheckout = (offerId, roomname, totalamount, rate, roomInfo) => {
    const guests = (Number(adults) || 0) + (Number(children) || 0);
    const cancelInfo = rate?.cancellationPolicies?.cancelPolicyInfos?.[0] ?? null;
    const totalInfo = rate?.retailRate?.total?.[0] ?? null;
    const newItem = {
      offerId : offerId,
      hid: hotelId,
      imgurl: hotel.main_photo,
      roomName : roomname,
      boardName : rate?.boardName || "",
      hotelName : hotel.name,
      refundableTag : rate?.cancellationPolicies?.refundableTag || "",
      checkinDate : checkin,
      checkoutDate : checkout,
      adults : adults,
      childrens : children,
      guests : guests,
      totalAmount : totalamount,
      please : pleaseId,
      city : cityname,
      rateId : rate?.rateId || "",
      bedType : roomInfo?.bedTypes?.[0]?.bedType || "",
      roomSize : [roomInfo?.roomSizeSquare, roomInfo?.roomSizeUnit].filter(Boolean).join(" "),
      maxGuests : (Number(roomInfo?.maxAdults) || 0) + (Number(roomInfo?.maxChildren) || 0) || null,
      cancelPolicy : cancelInfo ? {
        deadline : cancelInfo.cancelTime || "",
        amount : Number(cancelInfo.amount) || 0,
        currency : cancelInfo.currency || "",
        timezone : cancelInfo.timezone || "",
      } : null,
      priceInfo : totalInfo ? {
        amount : Number(totalInfo.amount) || 0,
        currency : totalInfo.currency || "AED",
      } : null,
      taxes : Array.isArray(rate?.retailRate?.taxesAndFees)
        ? rate.retailRate.taxesAndFees.map((tax) => ({
            description : tax.description || "",
            amount : Number(tax.amount) || 0,
            currency : tax.currency || "",
            included : Boolean(tax.included),
          }))
        : [],
      hotelInfo : {
        id : hotelId,
        name : hotel.name || "",
        photo : hotel.main_photo || "",
        address : hotel.address || "",
        city : hotel.city || "",
        country : hotel.country || "",
        stars : Number(hotel.starRating) || null,
        rating : Number(hotel.rating) || null,
      },
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
                    <button
                      type="button"
                      className="room-details-btn"
                      onClick={() =>
                        setDetailRoom({
                          room: room.roomInfos[0] || {},
                          roomName,
                          hotelPhoto: hotel?.main_photo || "",
                        })
                      }
                    >
                      Room details
                    </button>
                    <h4>{roomName}</h4>
                    <div className="romm-info-detalis">
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
                      const rateCurrency = item.rate.retailRate?.total?.[0]?.currency || getStoredCurrency();
                      const isRefundable = item.rate.cancellationPolicies?.refundableTag === "RFN";
                      const cancelTime = item.rate.cancellationPolicies?.cancelPolicyInfos?.[0]?.cancelTime || "";

                      return (
                        <div className="rates-item" key={key}>
                          <div className="infoitem">
                            <div className="infoprice">
                              <h2>{ratePrice} {rateCurrency}</h2>
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
                            <button onClick={() => addCheckout(item.offerId, roomName, ratePrice, item.rate, bedroom)}>
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

      {detailRoom && (
        <RoomDetailsPopup
          room={detailRoom.room}
          roomName={detailRoom.roomName}
          hotelPhoto={detailRoom.hotelPhoto}
          onClose={() => setDetailRoom(null)}
        />
      )}
    </div>
  );
};

export default Rooms;
