import { useSearchParams, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect} from "react";
import { hotelBookService } from "../../../services/SupebaseBookService";
import { useAuth } from "../../../context/AuthContext";
import "./style.css";
import Loader from "../../loaders/loading";
import { Button, Result } from 'antd';
import Errorsfully from "../../inform/errors";
import Successfully from "../../inform/succeses";


const classNamesObject = {
  root: 'demo-result-root',
  title: 'demo-result-title',
  subTitle: 'demo-result-subtitle',
  icon: 'demo-result-icon',
  extra: 'demo-result-extra',
  body: 'demo-result-body',
};
const classNamesFn = info => {
  if (info.props.status === 'success') {
    return {
      root: 'demo-result-root--success',
    };
  }
  return {
    root: 'demo-result-root--default',
  };
};
const stylesObject = {
  root: { borderWidth: 2, borderStyle: 'dashed', padding: 16 },
  title: { fontStyle: 'italic', color: '#1890ff' },
  subTitle: { fontWeight: 'bold' },
  icon: { opacity: 0.8 },
  extra: { backgroundColor: '#11253c', padding: 8 },
  body: { backgroundColor: '#fafafa', padding: 12 },
};
const stylesFn = info => {
  if (info.props.status === 'error') {
    return {
      root: { backgroundColor: 'var(--bg)', borderColor: '#ff4d4f' },
      title: { color: '#ff4d4f' },
    };
  } else {
    return {
      root: { backgroundColor: '#f6ffed', borderColor: '#52c41a' },
      title: { color: '#52c41a' },
    };
  }
};


const ConfirmationPage = () => {
  const navigate = useNavigate();
  const { addBooking } = useAuth();

  
  const [searchParams] = useSearchParams();
  const prebookId = searchParams.get('prebookId') || '';
  const transactionId = searchParams.get('transactionId') || '';

  const [bookingData, setBookingData] = useState(null);
  const [hotelData, setHotelData] = useState(null);
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
          
        }
        

        const data = await hotelBookService.fetchBook(body);

        if (data.error) {
          setError(data.error.description || 'Booking failed');
          setLoading(false);
          return;
        }

        setBookingData(data?.data ?? null);

        // 🔥 СОХРАНЯЕМ В БАЗУ ДАННЫХ SUPABASE ПОСЛЕ УСПЕШНОЙ БРОНИ
        try {
          // Имя отеля можно временно извлечь, например, из сохраненных ранее 
          // параметров или передать фиксированное, пока тестируете. 
          // Для теста запишем динамический ID бронирования в название:
          const hotelName = `Hotel Booking #${data?.data?.bookingId || 'New'}`;
          
          // Цену (sum) в идеале сохранять на шаге checkout в localStorage 
          // или сессию, чтобы передать сюда. Пока поставим заглушку 1000 для теста:
          const testPrice = data?.data?.price; 

          await addBooking(hotelName, testPrice, "Hotel");
          console.log("Бронирование успешно дублировано в Supabase!");
        } catch (dbErr) {
          // Если запись в вашу БД упала, мы не ломаем страницу для клиента, 
          // так как сам отель у поставщика уже забронирован
          console.error("Ошибка сохранения копии заказа в Supabase:", dbErr);
        }


        localStorage.removeItem('guestDetails');
      } catch (err) {
        setError('Failed to complete booking');
      }
      setLoading(false);
    };

    completeBooking();
  }, [prebookId, transactionId]);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };
console.log(bookingData);

  if (loading) {
    return (
      <div className="hconteiner">
        <div className="status-box">
          <Loader/>
          <p >Confirming your booking...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <> <Errorsfully title={error} label={"Search More Hotels"}/></>
      
    );
  }

  return (<main className="contents">
    <Successfully title={'Booking Confirmed!'} 
                  subTitle={`Your reservation has been successfully completed - Confirmation Number: ${bookingData?.bookingId}`} 
                  label={"Search More Hotels"}
                  />
        
      </main>
    );
};

export default ConfirmationPage;
