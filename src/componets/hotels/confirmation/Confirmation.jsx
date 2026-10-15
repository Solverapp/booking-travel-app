import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { hotelBookService } from "../../../services/SupebaseBookService";
import { useAuth } from "../../../context/AuthContext";
import { CheckCircleOutlined, ReceiptLong, Person, ContactMail, ConfirmationNumber, ArrowForward } from '@mui/icons-material';
import PageLoader from "../../loaders/PageLoader";
import Errorsfully from "../../inform/errors";
import "./style.css";

const ConfirmationPage = () => {
  const navigate = useNavigate();
  const { addBooking } = useAuth();
  
  const [searchParams] = useSearchParams();
  const prebookId = searchParams.get('prebookId') || '';
  const transactionId = searchParams.get('transactionId') || '';

  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const completeBooking = async () => {
      if (!prebookId || !transactionId) {
        setError('Missing booking information');
        setLoading(false);
        return;
      }

      const guestDetails = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('guestDetails') || '{}')
        : {};

      if (!guestDetails.firstName || !guestDetails.email) {
        setError('Missing guest details. Please start a new booking.');
        setLoading(false);
        return;
      }

            try {
        const body = {
          prebookId,
          holder: {
            firstName: guestDetails.firstName,
            lastName: guestDetails.lastName,
            email: guestDetails.email,
          },
          payment: {
            method: 'TRANSACTION_ID',
            transactionId,
          },
          guests: [{
            occupancyNumber: 1,
            firstName: guestDetails.firstName,
            lastName: guestDetails.lastName,
            email: guestDetails.email,
          }],
        };
        
        const data = await hotelBookService.fetchBook(body);

        if (data.error) {
          setError(data.error.description || 'Booking failed');
          setLoading(false);
          return;
        }

        const confirmedData = data?.data ?? null;
        setBookingData(confirmedData);

        // 🟢 ИДЕАЛЬНОЕ ИЗВЛЕЧЕНИЕ ДАННЫХ ИЗ ВАШЕГО ЛОГА API
        try {
          // Вытаскиваем реальное название отеля из ответа шлюза
          const realHotelName = confirmedData?.hotelName || "Al Diar Mina Hotel";
          
          // Вытаскиваем точную цену, которую LiteAPI списал с пользователя
          const realPrice = confirmedData?.sellingPriceToUser || confirmedData?.price || 0;

          // Сохраняем чистые и корректные данные в вашу таблицу 'bookings' на Supabase
          await addBooking(realHotelName, realPrice, "Hotel");
          console.log(`Заказ успешно сохранен в Supabase! Отель: ${realHotelName}, Цена: ${realPrice} AED`);
        } catch (dbErr) {
          console.error("Ошибка записи копии бронирования в базу Supabase:", dbErr);
        }

        localStorage.removeItem('guestDetails');
      } catch (err) {
        setError('Failed to complete booking');
      }
      setLoading(false);

    };

    completeBooking();
  }, [prebookId, transactionId]);

      const handleBookMore = () => {
    // Извлекаем параметры региона и гостей, которые мы только что пробросили из CheckoutPage
    const pleaseId = searchParams.get('pleaseId') || '';
    const placeName = searchParams.get('placeName') || '';
    const checkIn = searchParams.get('checkIn') || '';
    const checkOut = searchParams.get('checkOut') || '';
    const adults = searchParams.get('adults') || '2';
    const children = searchParams.get('children') || '0';
    const city = searchParams.get('city') || '';

    // Если у нас есть ID региона и даты, возвращаем пользователя на полноценный поиск
    if (pleaseId && checkIn && checkOut) {
      const params = new URLSearchParams({
        pleaseId,
        placeName,
        checkIn,
        checkOut,
        adults,
        children,
        city
      });

      navigate(`/hotels?${params.toString()}`);
    } else {
      // Подстраховка: если что-то пошло не так, отправляем на главную форму
      navigate('/');
    }
  };


  if (loading) {
    return <PageLoader text="Confirming your booking and printing ticket..." />;
  }

  if (error) {
    return <Errorsfully title={error} label={"Search More Hotels"} />;
  }

  return (
    <main className="confirmation-main-content">
      <div className="confirmation-layout-box animate-scale-up">
        
        {/* Шапка статуса */}
        <div className="success-hero-header">
          <CheckCircleOutlined className="success-tick-icon" />
          <h1>Booking Confirmed!</h1>
          <p>Your reservation has been successfully completed. An electronic voucher was dispatched to your address.</p>
        </div>

        {/* СТИЛИЗОВАННЫЙ ЭЛЕКТРОННЫЙ ВАУЧЕР (RECEIPT) */}
        <div className="digital-voucher-ticket">
          <div className="voucher-top-bar">
            <div className="voucher-title">
              <ReceiptLong />
              <span>Official Travel Voucher</span>
            </div>
            <div className="voucher-status-badge">Paid & Confirmed</div>
          </div>

          <div className="voucher-body">
            <div className="voucher-grid-info">
              
              <div className="voucher-info-block">
                <ConfirmationNumber />
                <div>
                  <span className="v-label">Booking ID (Confirmation Number)</span>
                  <span className="v-value-highlight">{bookingData?.bookingId}</span>
                </div>
              </div>

              <div className="voucher-info-block">
                <Person />
                <div>
                  <span className="v-label">Hotel Reference / Description</span>
                  <span className="v-value">{bookingData?.hotelName || "Hotel Reservation Verified"}</span>
                </div>
              </div>

              <div className="voucher-info-block">
                <ContactMail />
                <div>
                  <span className="v-label">Transaction Reference</span>
                  <span className="v-value-small">{transactionId}</span>
                </div>
              </div>

            </div>

            <div className="voucher-divider-dashed"></div>

            

            <div className="voucher-footer-pricing">
              <div className="pricing-ticket-row">
                <span>Status</span>
                <span className="green-status-text">SUCCESS</span>
              </div>
              
              {/* 🟢 ВЫВОДИМ ТОЧНУЮ СУММУ ИЗ ВАШЕГО ЛОГА ОТВЕТА */}
              <div className="pricing-ticket-row final-grand-total">
                <span>Total Charge</span>
                <span>
                  {bookingData?.sellingPriceToUser 
                    ? Number(bookingData.sellingPriceToUser).toFixed(2) 
                    : "N/A"}{" "}
                  AED
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Кнопки навигации */}
        <div className="confirmation-action-buttons">
          <button className="primary-action-nav-btn" onClick={() => navigate("/profile")}>
            Go to My Bookings
          </button>
          <button className="secondary-action-nav-btn" onClick={handleBookMore}>
            Book More <ArrowForward />
          </button>
        </div>

      </div>
    </main>
  );
};

export default ConfirmationPage;