import { supabase } from "../supabaseClient";

export const hotelBookService = {
  /**
   * 1. Получение списка отелей места (Rates_Place)
   */
  async fetchBook(params) {
    // ОБЪЯВЛЯЕМ ПЕРЕМЕННУЮ response
    const response = await supabase.functions.invoke('liteapi-proxy', {
      method: 'POST',
      headers: {
        'x-target-url': 'https://api.liteapi.travel/v3.0/rates/book',
        'x-service-type': 'hotels'
      },
      body: params
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
