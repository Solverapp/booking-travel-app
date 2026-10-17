declare const EdgeRuntime:
  | { waitUntil(p: Promise<unknown>): void }
  | undefined;

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
    const serviceType = req.headers.get('x-service-type'); // 'hotels', 'flights' или 'tours'

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
      // LiteAPI (hotels + flights/v3.0) — ключ в X-API-Key
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

    // 5. Кэш аэропортов: тихо сохраняем в flight_airports (service-role),
    //    ответ клиенту не задерживаем и не ломаем при ошибке кэша
    if (
      serviceType === "flights" &&
      req.method === "GET" &&
      res.status === 200 &&
      targetUrl.includes("/data/flights/airports") &&
      !targetUrl.includes("/iatas")
    ) {
      cacheAirportsInBackground(data);
    }

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

function cacheAirportsInBackground(data: any) {
  try {
    const airports = data?.data?.[0]?.airports ?? data?.data?.airports;
    if (!Array.isArray(airports) || airports.length === 0) return;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return;

    const rows = airports
      .map((a: any) => ({
        iata: a?.iata,
        icao: a?.icao ?? null,
        name: a?.name ?? null,
        city: a?.city ?? null,
        country: a?.country ?? null,
        state: a?.state ?? null,
        tz: a?.tz ?? null,
        lat: a?.lat ?? null,
        lon: a?.lon ?? null,
        refreshed_at: new Date().toISOString(),
      }))
      .filter((r: any) => r.iata && r.name);

    if (rows.length === 0) return;

    const upsert = fetch(`${supabaseUrl}/rest/v1/flight_airports`, {
      method: "POST",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    }).catch(() => {});

    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(upsert);
    }
  } catch {
    // Кэш не должен влиять на основной ответ
  }
}
