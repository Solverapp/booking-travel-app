import { supabase } from "../supabaseClient";

export const hotelIdService = {
  /**
   * 1. Получение конкретный отел (hotel/data)
   */
  async fetchHotelDetalis(params) {
    const hotelId = params.id;
    // ОБЪЯВЛЯЕМ ПЕРЕМЕННУЮ response
    const response = await supabase.functions.invoke('liteapi-proxy', {
      method: 'GET',
      headers: {
        'x-target-url': `https://api.liteapi.travel/v3.0/data/hotel?hotelId=${hotelId}&timeout=4`,
        'x-service-type': 'hotels'
      },
      
    });

    // Теперь эта проверка сработает идеально, так как response существует!
    if (response.error) {
      throw new Error(`Supabase System Error: ${response.error.message}`);
    }

    // Достаем данные от LiteAPI, которые лежат внутри response.data
    const liteApiData = response.data;

    if (liteApiData?.error) {
      throw new Error(`LiteAPI Error: ${liteApiData.error.message || "Bad Request"}`);
    }

    // Возвращаем чистый объект отелей в компонент
    return liteApiData;
  },
};
