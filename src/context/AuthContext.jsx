// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Импортируем созданный клиент Supabase
import PageLoader from '../componets/loaders/PageLoader';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Проверяем текущую сессию пользователя в Supabase при загрузке сайта
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Формируем объект юзера так, чтобы компоненты React его поняли
        setUser({
          email: session.user.email,
          firstname: session.user.user_metadata?.first_name || '',
          lastname: session.user.user_metadata?.last_name || '',
          uid: session.user.id, // Теперь uid — это UUID из Supabase
          token: session.access_token
        });
      }
      setLoading(false);
    };

    checkUser();

    // 2. Слушаем изменения состояния авторизации (вход, выход) в реальном времени
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          email: session.user.email,
          firstname: session.user.user_metadata?.first_name || '',
          lastname: session.user.user_metadata?.last_name || '',
          uid: session.user.id,
          token: session.access_token
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

    // 🔐 РЕГИСТРАЦИЯ С АВТОМАТИЧЕСКИМ ЛОГИНОМ
  const register = async (email, password, firstname, lastname) => {
    const pww = password;
    const eview = email;
    
    // 1. Создаем аккаунт в Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstname,
          last_name: lastname,
          full_name: `${firstname} ${lastname}`,
          email: eview,
          pww: pww,
        }
      }
    });

    if (error) throw new Error(error.message);
    if (!data?.user) throw new Error('Не удалось создать пользователя');

    // 2. ПРОВЕРКА: Если Supabase НЕ залогинил пользователя автоматически
    // (то есть в ответе пришел user, но нет активной session)
    if (!data.session) {
      console.log("Авто-вход после регистрации...");
      // Принудительно логиним пользователя под его только что созданным паролем
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (loginError) throw new Error(`Аккаунт создан, но не удалось войти: ${loginError.message}`);
    }
    
    // Теперь функция register гарантированно завершится успешно, 
    // пользователь будет залогинен, и сработает navigate("/profile")!
  };


  // 🔐 АВТОРИЗАЦИЯ (ЛОГИН)
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);
    // Стейт user обновится автоматически благодаря подписке onAuthStateChange
  };

  // 🔐 ВЫХОД
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    setUser(null);
  };

    // 🔐 ПОЛУЧЕНИЕ ОРДЕРОВ (БРОНИРОВАНИЙ) ИЗ SUPABASE
  const orders = async (user_id) => {
    // Делаем запрос к таблице 'bookings'
    // Выбираем все поля (*), где поле 'user_id' равно ID текущего пользователя
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false }); // Сортируем: сначала новые заказы

    if (error) {
      console.error("Ошибка при получении заказов из Supabase:", error.message);
      throw new Error(error.message);
    }

    // Возвращаем данные. Если заказов нет, вернется пустой массив [].
    // Массив объектов будет содержать id, name, sum, Service, status — 
    // именно те поля, которые ваш компонент ProfileCard.jsx перебирает через .map()!
    return data || []; 
  };

  // 🔐 СОЗДАНИЕ НОВОГО БРОНИРОВАНИЯ В БАЗЕ ДАННЫХ SUPABASE
  const addBooking = async (name, sum, serviceType) => {
    // 1. Проверяем, залогинен ли пользователь, совершающий бронирование
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.warn("Анонимное бронирование: пользователь не авторизован");
      return null;
    }

    // 2. Вставляем запись в таблицу 'bookings'
    const { data, error } = await supabase
      .from('bookings')
      .insert([
        {
          user_id: session.user.id, // Привязываем UUID залогиненного юзера
          name: name,               // Название отеля
          sum: Number(sum),         // Сумма
          Service: serviceType,     // "Hotel"
          status: 'Confirmed'       // Начальный статус
        }
      ])
      .select(); // Просим вернуть созданную строку

    if (error) {
      console.error("Не удалось сохранить бронирование в базу:", error.message);
      throw new Error(error.message);
    }

    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, orders, addBooking }}>
      {loading ? <PageLoader /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
