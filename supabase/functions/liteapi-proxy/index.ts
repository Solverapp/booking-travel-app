Deno.serve(async (req) => {
  // 1. Извлекаем секретные ключи из защищенной среды Supabase
  const LITE_API_KEY = Deno.env.get("LITE_API_KEY");
  const RAYNA_API_KEY = Deno.env.get("RAYNA_API_KEY");

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-target-url, x-service-type', 
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Получаем метаданные назначения из заголовков React
    const targetUrl = req.headers.get('x-target-url');
    const serviceType = req.headers.get('x-service-type'); // 'hotels' или 'tours'

    if (!targetUrl) throw new Error("Missing 'x-target-url' header");

    // Читаем тело запроса, если это не GET
    let bodyParams = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      bodyParams = await req.json();
    }

    // 3. Формируем заголовки и динамически определяем авторизацию
    const headers: Record<string, string> = {
      'accept': 'application/json',
      'content-type': 'application/json'
    };
    
    if (serviceType === "tours") {
      // Для Rayna Tour передаем ключ в заголовок Authorization в чистом виде
      headers['Authorization'] = RAYNA_API_KEY || '';
    } else {
      // По умолчанию для LiteAPI отелей
      headers['X-API-Key'] = LITE_API_KEY || '';
    }

    const requestOptions: RequestInit = {
      method: req.method,
      headers: headers
    };

    if (bodyParams) {
      requestOptions.body = JSON.stringify(bodyParams);
    }

    // 4. Отправляем запрос на реальный сервер шлюза (LiteAPI или Rayna)
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
