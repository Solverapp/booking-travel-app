import { supabase } from "../supabaseClient";

const BASE_URL = "https://activities.raynatours.com/api/Tour";
export const COMISSION = 1 + (15 / 100);

export const roundTo = (num, places = 2) => {
  const factor = 10 ** places;
  return Math.round(num * factor) / factor;
};

// 1. Безопасный запрос динамических опций и цен через Supabase
export async function fetchTourOptions(params) {
  const response = await supabase.functions.invoke('liteapi-proxy', {
    method: 'POST',
    headers: {
      'x-target-url': `${BASE_URL}/touroption`,
      'x-service-type': 'tours' // Шлюз подставит RAYNA_API_KEY
    },
    body: {
      tourId: params.tourId,
      contractId: 300,
      travelDate: params.travelDate,
      noOfAdult: params.adults,
      noOfChild: params.children,
      noOfInfant: params.infants,
    }
  });

  if (response.error) throw new Error(`Supabase Error: ${response.error.message}`);
  return response.data?.result || [];
}

// 2. Безопасный запрос статических данных тура через Supabase
export async function fetchTourStatic(tourId) {
  const response = await supabase.functions.invoke('liteapi-proxy', {
    method: 'POST',
    headers: {
      'x-target-url': `${BASE_URL}/touroptionstaticdata`,
      'x-service-type': 'tours'
    },
    body: {
      tourId: tourId,
      contractId: 300,
    }
  });

  if (response.error) throw new Error(`Supabase Error: ${response.error.message}`);
  return response.data?.result?.touroption || [];
}

// 3. Безопасный запрос тайм-слотов через Supabase
export async function fetchTourSlots(params) {
  const response = await supabase.functions.invoke('liteapi-proxy', {
    method: 'POST',
    headers: {
      'x-target-url': `${BASE_URL}/timeslot`,
      'x-service-type': 'tours'
    },
    body: {
      tourId: params.tourId,
      contractId: 300,
      travelDate: params.travelDate,
      tourOptionId: params.tourOptionId,
      transferId: params.transferId,
    }
  });

  if (response.error) throw new Error(`Supabase Error: ${response.error.message}`);
  return Array.isArray(response.data?.result) ? response.data.result : [];
}

// Улучшенный процессор данных: строгое и безопасное сравнение с базой Supabase
export function processTourData(options, staticData, dbDiscounts = []) {
  // Хелпер для очистки и безопасного превращения любого ID в чистую строку
  const cleanId = (value) => String(value ?? "").trim().toLowerCase();

  // Если из базы прилетел пустой массив или null, маппим стандартные цены от API
  if (!dbDiscounts || dbDiscounts.length === 0) {
    return options.map((opt) => {
      const staticInfo = staticData.find((s) => cleanId(s.tourOptionId) === cleanId(opt.tourOptionId));
      return {
        ...opt,
        optionName: staticInfo?.optionName || "Unknown Option",
        prices: {
          adult: roundTo(opt.adultPrice * COMISSION),
          child: roundTo(opt.childPrice * COMISSION),
          totalAuto: roundTo(opt.finalAmount * COMISSION),
        },
      };
    });
  }

  return options.map((opt) => {
    const staticInfo = staticData.find((s) => cleanId(s.tourOptionId) === cleanId(opt.tourOptionId));
    
    // СВЕРЯЕМ СТРОГО ПО tourOptionId (Убираем проверку transfer_id, чтобы типы данных не конфликтовали)
    const discountOpt = dbDiscounts.find(
      (d) => cleanId(d.tour_option_id) === cleanId(opt.tourOptionId)
    );

    // Если нашли точное совпадение тарифа и типа трансфера в нашей базе скидок Supabase
    if (discountOpt) {
      console.log(`🔥 СКИДКА НАЙДЕНА для тарифа ${opt.tourOptionId} с трансфером ${opt.transferId}!`);
      
      const finalAdultPrice = Number(discountOpt.discount_adult_price);
      const finalChildPrice = Number(discountOpt.discount_child_price);

      return {
        ...opt,
        optionName: staticInfo?.optionName || "Unknown Option",
        prices: {
          adult: finalAdultPrice,
          child: finalChildPrice,
          // Пересчитываем общую сумму авторасчета на основе количества гостей
          totalAuto: roundTo((finalAdultPrice * (opt.noOfAdult || 1)) + (finalChildPrice * (opt.noOfChild || 0))),
        },
      };
    }

    // Если скидки для этой комбинации нет — оставляем оригинальную цену Rayna API + 15% комиссии
    return {
      ...opt,
      optionName: staticInfo?.optionName || "Unknown Option",
      prices: {
        adult: roundTo(opt.adultPrice * COMISSION),
        child: roundTo(opt.childPrice * COMISSION),
        totalAuto: roundTo(opt.finalAmount * COMISSION),
      },
    };
  });
}
