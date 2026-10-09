Deno.serve(async (req) => {
  // 1. Считываем ВСЕ секретные ключи, которые вы сохраните в Supabase
  const LITE_API_KEY = Deno.env.get("LITE_API_KEY");
  const FLIGHTS_API_KEY = Deno.env.get("FLIGHTS_API_KEY"); // Ключ для авиабилетов
  const TOURS_API_KEY = Deno.env.get("TOURS_API_KEY");     // Ключ для туров

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-target-url, x-service-type', 
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Получаем из заголовков полный URL и тип сервиса
    const targetUrl = req.headers.get('x-target-url'); // Например: https://liteapi.travel
    const serviceType = req.headers.get('x-service-type'); // Например: hotels, flights, tours

    if (!targetUrl) throw new Error("Missing 'x-target-url' header");

    // 3. Выбираем правильный секретный ключ в зависимости от сервиса
    let apiKey = "";
    let authHeaderName = "X-API-Key"; // По умолчанию для LiteAPI

    if (serviceType === "flights") {
      apiKey = FLIGHTS_API_KEY || "";
      authHeaderName = "Authorization"; // Например, авиабилеты требуют 'Authorization: Bearer ...'
    } else if (serviceType === "tours") {
      apiKey = TOURS_API_KEY || "";
      authHeaderName = "apikey"; // Например, туры требуют заголовок 'apikey'
    } else {
      apiKey = LITE_API_KEY || ""; // По умолчанию берем ключ отелей
    }

    // Читаем тело запроса, если это не GET
    let bodyParams = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      bodyParams = await req.json();
    }

    // 4. Формируем заголовки для внешнего сервиса
    const headers: Record<string, string> = {
      'accept': 'application/json',
      'content-type': 'application/json'
    };
    
    // Динамически подставляем нужный ключ под нужным именем заголовка
    if (apiKey) {
      headers[authHeaderName] = serviceType === "flights" ? `Bearer ${apiKey}` : apiKey;
    }

    const requestOptions: RequestInit = {
      method: req.method,
      headers: headers
    };

    if (bodyParams) {
      requestOptions.body = JSON.stringify(bodyParams);
    }

    // 5. Отправляем запрос на любой адрес в интернете
    const res = await fetch(targetUrl, requestOptions);
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: res.status
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: "Gateway Exception", details: error.message }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400
    });
  }
})
