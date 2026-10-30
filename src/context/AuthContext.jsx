// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient'; // Импортируем созданный клиент Supabase
import BootLoader from '../componets/loaders/BootLoader';
import { normalizeCurrency, setStoredCurrency } from '../utils/currency';
import { normalizePhoneDigits } from '../utils/countries';
import { normalizeNationality, setStoredNationality } from '../utils/nationality';
import { queryKeys } from '../utils/queryKeys';


const AuthContext = createContext(null);

const userFromSession = (session) => {
  const metadata = session.user.user_metadata || {};
  return {
    email: session.user.email,
    firstname: metadata.first_name || '',
    lastname: metadata.last_name || '',
    uid: session.user.id,
    currency: normalizeCurrency(metadata.currency),
    phoneCountryCode: normalizePhoneDigits(metadata.phone_country_code),
    phoneNumber: normalizePhoneDigits(metadata.phone_number),
    nationality: metadata.nationality
      ? normalizeNationality(metadata.nationality)
      : '',
    token: session.access_token,
  };
};

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Проверяем текущую сессию пользователя в Supabase при загрузке сайта
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Формируем объект юзера так, чтобы компоненты React его поняли
        const nextUser = userFromSession(session);
        setStoredCurrency(nextUser.currency);
        if (nextUser.nationality) setStoredNationality(nextUser.nationality);
        setUser(nextUser);
      }
      setLoading(false);
    };

    checkUser();

    // 2. Слушаем изменения состояния авторизации (вход, выход) в реальном времени
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const nextUser = userFromSession(session);
        setStoredCurrency(nextUser.currency);
        if (nextUser.nationality) setStoredNationality(nextUser.nationality);
        setUser(nextUser);
      } else {
        setUser(null);
        queryClient.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

    // 🔐 РЕГИСТРАЦИЯ С АВТОМАТИЧЕСКИМ ЛОГИНОМ
  const register = async (email, password, firstname, lastname, nationality) => {
    if (!String(nationality || '').trim()) {
      throw new Error('Please select your nationality');
    }
    const cleanNationality = normalizeNationality(nationality);
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
          nationality: cleanNationality,
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

    setStoredNationality(cleanNationality);

    // Теперь функция register гарантированно завершится успешно, 
    // пользователь будет залогинен, и сработает navigate("/profile")!
  };


  // 🔐 АВТОРИЗАЦИЯ (ЛОГИН)
  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
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
    queryClient.clear();
  };

  // 🔐 ОБНОВЛЕНИЕ ЛИЧНЫХ ДАННЫХ (user_metadata)
  const updateProfile = async ({
    firstname,
    lastname,
    phoneCountryCode,
    phoneNumber,
    nationality,
  }) => {
    const metadata = {
      first_name: firstname,
      last_name: lastname,
      full_name: `${firstname} ${lastname}`.trim(),
    };
    const cleanPhoneCode =
      phoneCountryCode === undefined
        ? undefined
        : normalizePhoneDigits(phoneCountryCode);
    const cleanPhoneNumber =
      phoneNumber === undefined ? undefined : normalizePhoneDigits(phoneNumber);
    const cleanNationality =
      nationality === undefined
        ? undefined
        : String(nationality || "").trim()
          ? normalizeNationality(nationality)
          : "";

    if (cleanPhoneCode !== undefined) metadata.phone_country_code = cleanPhoneCode;
    if (cleanPhoneNumber !== undefined) metadata.phone_number = cleanPhoneNumber;
    if (cleanNationality !== undefined) metadata.nationality = cleanNationality;

    const { error } = await supabase.auth.updateUser({ data: metadata });

    if (error) throw new Error(error.message);

    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, firstname, lastname };
      if (cleanPhoneCode !== undefined) next.phoneCountryCode = cleanPhoneCode;
      if (cleanPhoneNumber !== undefined) next.phoneNumber = cleanPhoneNumber;
      if (cleanNationality !== undefined) next.nationality = cleanNationality;
      return next;
    });

    if (cleanNationality) setStoredNationality(cleanNationality);
    if (cleanNationality !== undefined) {
      queryClient.removeQueries({ queryKey: ["v1", "hotels", "rates"] });
      queryClient.removeQueries({ queryKey: ["v1", "flights", "rates"] });
    }
  };

  // 🔐 СМЕНА ВАЛЮТЫ (сохраняем в user_metadata + локальный кэш для сервисов)
  const updateCurrency = async (code) => {
    const currency = normalizeCurrency(code);
    const { error } = await supabase.auth.updateUser({ data: { currency } });
    if (error) throw new Error(error.message);

    setStoredCurrency(currency);
    setUser((prev) => (prev ? { ...prev, currency } : prev));
    queryClient.removeQueries({ queryKey: ["v1", "hotels", "rates"] });
    queryClient.removeQueries({ queryKey: ["v1", "flights", "rates"] });
  };

  // 🔐 СМЕНА ПАРОЛЯ: сначала подтверждаем текущий, затем меняем
  const updatePassword = async (currentPassword, newPassword) => {
    const email = user?.email;
    if (!email) throw new Error('Please sign in again to change your password');
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters');
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (verifyError) throw new Error('Current password is incorrect');

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  };

    // 🔐 ПОЛУЧЕНИЕ ОРДЕРОВ (БРОНИРОВАНИЙ) ИЗ SUPABASE
  const orders = useCallback(async (user_id) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Ошибка при получении заказов из Supabase:", error.message);
      throw new Error(error.message);
    }

    return data || [];
  }, []);

  // 🔐 СОЗДАНИЕ НОВОГО БРОНИРОВАНИЯ В БАЗЕ ДАННЫХ SUPABASE
  // extra: { reference, orderRef, meta, currency } — необязательные детали брони
  const addBooking = useCallback(async (name, sum, serviceType, extra = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.warn("Анонимное бронирование: пользователь не авторизован");
      return null;
    }

    const row = {
      user_id: session.user.id,
      name: name,
      sum: Number(sum),
      Service: serviceType,
      status: 'Confirmed'
    };
    if (extra.reference) row.reference = extra.reference;
    if (extra.orderRef) row.order_ref = extra.orderRef;
    if (extra.currency) row.currency = extra.currency;
    if (extra.meta && Object.keys(extra.meta).length) row.meta = extra.meta;

    if (extra.reference) {
      const { data: existing, error: existingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('reference', extra.reference)
        .limit(1);

      if (existingError) throw new Error(existingError.message);
      if (existing?.length) return existing;
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert([row])
      .select();

    if (error) {
      console.error("Не удалось сохранить бронирование в базу:", error.message);
      throw new Error(error.message);
    }

    return data;
  }, []);

  // 🔐 ПОЛУЧЕНИЕ ИЗБРАННОГО ПОЛЬЗОВАТЕЛЯ
  const getFavorites = useCallback(async (user_id) => {
    const { data, error } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Ошибка при получении избранного из Supabase:", error.message);
      throw new Error(error.message);
    }

    return data || [];
  }, []);

  // 🔐 ПЕРЕКЛЮЧЕНИЕ ИЗБРАННОГО (тур / отель)
 const toggleFavorite = useCallback(async (
  serviceType,
  itemId,
  shouldBeFavorite,
  item = {},
  meta = {},
) => {
  if (serviceType !== 'tour' && serviceType !== 'hotel') {
    throw new Error('Неподдерживаемый тип сервиса для избранного');
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const itemIdStr = String(itemId);
  const userId = session.user.id;
  const favoritesKey = queryKeys.favorites(userId);
  const isSameFavorite = (favorite) =>
    favorite.service_type === serviceType &&
    String(favorite.item_id) === itemIdStr;

  const cachedFavorites = queryClient.getQueryData(favoritesKey);
  const previousFavorite = Array.isArray(cachedFavorites)
    ? cachedFavorites.find(isSameFavorite)
    : null;

  const favoriteRow = {
    user_id: userId,
    service_type: serviceType,
    item_id: itemIdStr,
    item_name: item.item_name ?? item.tourName ?? item.name ?? '',
    item_image: item.item_image ?? item.image ??
      (Array.isArray(item.hotelImages) ? item.hotelImages[0] : null),
    item_city: item.item_city ?? item.city ?? item.cityName ?? '',
    item_country: item.item_country ?? item.country ?? item.countryName ?? '',
    item_price: item.item_price ?? item.price ?? null,
    meta: meta && Object.keys(meta).length ? meta : {},
  };

  // Сразу отражаем действие в избранном, не дожидаясь ответа Supabase.
  queryClient.setQueryData(favoritesKey, (current) => {
    const favorites = Array.isArray(current) ? current : [];
    const others = favorites.filter((favorite) => !isSameFavorite(favorite));

    if (!shouldBeFavorite) return others;
    if (previousFavorite) return [previousFavorite, ...others];

    return [{
      ...favoriteRow,
      id: `optimistic-${serviceType}-${itemIdStr}`,
      created_at: new Date().toISOString(),
    }, ...others];
  });

  try {
    if (shouldBeFavorite) {
      const { data, error } = await supabase
        .from('user_favorites')
        .upsert(favoriteRow, {
          onConflict: 'user_id,service_type,item_id',
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      queryClient.setQueryData(favoritesKey, (current) => {
        const favorites = Array.isArray(current) ? current : [];
        return [data, ...favorites.filter((favorite) => !isSameFavorite(favorite))];
      });

      return { action: 'added', data };
    }

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('service_type', serviceType)
      .eq('item_id', itemIdStr);

    if (error) throw new Error(error.message);
    return { action: 'removed' };
  } catch (error) {
    queryClient.setQueryData(favoritesKey, (current) => {
      const favorites = Array.isArray(current) ? current : [];
      const others = favorites.filter((favorite) => !isSameFavorite(favorite));
      return previousFavorite ? [previousFavorite, ...others] : others;
    });

    void queryClient.invalidateQueries({ queryKey: favoritesKey });
    throw error;
  }
}, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, updateProfile, updatePassword, updateCurrency, orders, addBooking, getFavorites, toggleFavorite }}>
      {loading ? <BootLoader /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
