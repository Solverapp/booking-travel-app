// ============================================================
// tours-booking — Phase 1 tour checkout (Rayna Tours)
// actions: prebook | get
// Creates a pre-booking only. Never calls Rayna /booking.
// verify_jwt = true — see supabase/config.toml
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const RAYNA_BASE = "https://activities.raynatours.com/api/Tour";
const CONTRACT_ID = 300;
const MARKUP = 1.15;
const RAYNA_TIMEOUT_MS = 30_000;

const TRANSFER_WITHOUT = 41865;
const TRANSFER_SHARING = 41843;
const TRANSFER_PRIVATE = 41844;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

const err = (code: string, message: string, status = 400) =>
  json({ error: { code, message } }, status);

class AppError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

const asArray = (value: any): any[] =>
  Array.isArray(value) ? value : value == null ? [] : [value];

const cleanString = (value: any, max = 255) =>
  String(value ?? "").trim().slice(0, max);

const normalizeDigits = (value: any) =>
  String(value ?? "").replace(/\D/g, "");

const toNumber = (value: any, fallback = Number.NaN) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const round2 = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

function buildMobileNumber(countryCode: any, phoneNumber: any) {
  const code = normalizeDigits(countryCode);
  let number = normalizeDigits(phoneNumber);

  if (number.startsWith("00")) number = number.slice(2);
  if (number.startsWith("0")) number = number.slice(1);
  if (code && number.startsWith(code) && number.length > code.length + 5) {
    return number;
  }

  return `${code}${number}`;
}

function normalizeTime(value: any) {
  const raw = String(value ?? "").trim();
  const match = raw.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return "";

  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  const seconds = Math.min(59, Math.max(0, Number(match[3] ?? 0)));

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function isTruthy(value: any) {
  if (value === true || value === 1) return true;
  const text = String(value ?? "").trim().toLowerCase();
  return text === "true" || text === "1" || text === "yes";
}

function inferTransferType(transferId: number, transferName: string) {
  if (transferId === TRANSFER_WITHOUT) return "without";
  if (transferId === TRANSFER_SHARING) return "sharing";
  if (transferId === TRANSFER_PRIVATE) return "private";

  const name = transferName.toLowerCase();
  if (
    name.includes("without") ||
    name.includes("no transfer") ||
    name.includes("без трансфер")
  ) {
    return "without";
  }
  if (
    name.includes("sharing") ||
    name.includes("shared") ||
    name.includes("группов")
  ) {
    return "sharing";
  }
  if (
    name.includes("private") ||
    name.includes("индивидуаль")
  ) {
    return "private";
  }

  return "other";
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function todayInDubai() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function parseClient(raw: any) {
  const source = raw && typeof raw === "object" ? raw : {};

  const prefix = cleanString(source.prefix, 8).replace(/\.$/, "");
  if (!["Mr", "Ms", "Mrs"].includes(prefix)) {
    throw new AppError("INVALID_CLIENT", "Please select a valid prefix.", 400);
  }

  const firstName = cleanString(source.firstName, 80);
  const lastName = cleanString(source.lastName, 80);
  if (!firstName || !lastName) {
    throw new AppError("INVALID_CLIENT", "Please enter your first and last name.", 400);
  }

  const email = cleanString(source.email, 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("INVALID_CLIENT", "Please enter a valid email address.", 400);
  }

  const phoneCountryCode = normalizeDigits(source.phoneCountryCode);
  const phoneNumber = normalizeDigits(source.phoneNumber);
  if (!phoneCountryCode || phoneCountryCode.length > 4) {
    throw new AppError("INVALID_CLIENT", "Please select a valid country code.", 400);
  }
  if (phoneNumber.length < 6 || phoneNumber.length > 15) {
    throw new AppError("INVALID_CLIENT", "Please enter a valid phone number.", 400);
  }

  const nationality = cleanString(source.nationality, 80);
  if (!nationality) {
    throw new AppError("INVALID_CLIENT", "Please enter your nationality.", 400);
  }

  return {
    prefix,
    firstName,
    lastName,
    email,
    phoneCountryCode,
    phoneNumber,
    mobile: buildMobileNumber(phoneCountryCode, phoneNumber),
    nationality,
  };
}

function parseInput(body: any) {
  const tourId = Math.trunc(toNumber(body?.tourId, 0));
  const optionId = Math.trunc(toNumber(body?.optionId, 0));
  const transferId = Math.trunc(toNumber(body?.transferId, 0));

  if (tourId <= 0) throw new AppError("INVALID_INPUT", "A valid tour is required.", 400);
  if (optionId <= 0) throw new AppError("INVALID_INPUT", "A valid tour option is required.", 400);
  if (transferId <= 0) throw new AppError("INVALID_INPUT", "A valid transfer is required.", 400);

  const tourDate = cleanString(body?.tourDate, 10);
  if (!isValidDate(tourDate)) {
    throw new AppError("INVALID_INPUT", "Please select a valid tour date.", 400);
  }
  if (tourDate < todayInDubai()) {
    throw new AppError("INVALID_INPUT", "Tour date cannot be in the past.", 400);
  }

  const adult = Math.trunc(toNumber(body?.adult, 0));
  const child = Math.trunc(toNumber(body?.child, 0));
  const infant = Math.trunc(toNumber(body?.infant, 0));

  if (adult < 1) throw new AppError("INVALID_INPUT", "At least one adult is required.", 400);
  if (child < 0 || infant < 0) {
    throw new AppError("INVALID_INPUT", "Guest counts cannot be negative.", 400);
  }
  if (adult + child + infant > 50) {
    throw new AppError("INVALID_INPUT", "Too many guests for one booking.", 400);
  }

  return {
    tourId,
    optionId,
    transferId,
    tourDate,
    adult,
    child,
    infant,
    slotId: cleanString(body?.slotId, 40),
    pickup: cleanString(body?.pickup, 255),
    client: parseClient(body?.client),
    fallbackTourName: cleanString(body?.tourName, 200),
    fallbackCity: cleanString(body?.city, 120),
    fallbackImage: cleanString(body?.tourImage, 1000),
  };
}

async function rayna(path: string, body: Record<string, unknown>) {
  const apiKey = Deno.env.get("RAYNA_API_KEY");
  if (!apiKey) {
    throw new AppError("RAYNA_NOT_CONFIGURED", "Tour provider is not configured.", 500);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RAYNA_TIMEOUT_MS);

  try {
    const response = await fetch(`${RAYNA_BASE}${path}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const message =
        data?.message ||
        data?.error ||
        `Tour provider request failed (${response.status}).`;
      throw new AppError("RAYNA_ERROR", String(message), 502);
    }

    return data;
  } catch (error: any) {
    if (error instanceof AppError) throw error;

    const timedOut = error?.name === "AbortError";
    throw new AppError(
      timedOut ? "RAYNA_TIMEOUT" : "RAYNA_UNAVAILABLE",
      timedOut
        ? "Tour provider timed out. Please try again."
        : "Tour provider is unavailable. Please try again.",
      502,
    );
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOptions(input: ReturnType<typeof parseInput>) {
  const data = await rayna("/touroption", {
    tourId: input.tourId,
    contractId: CONTRACT_ID,
    travelDate: input.tourDate,
    noOfAdult: input.adult,
    noOfChild: input.child,
    noOfInfant: input.infant,
  });

  return asArray(data?.result);
}

async function fetchStaticOptions(tourId: number) {
  const data = await rayna("/touroptionstaticdata", {
    tourId,
    contractId: CONTRACT_ID,
  });

  return asArray(data?.result?.touroption);
}

async function fetchSlots(input: ReturnType<typeof parseInput>) {
  const data = await rayna("/timeslot", {
    tourId: input.tourId,
    contractId: CONTRACT_ID,
    travelDate: input.tourDate,
    tourOptionId: input.optionId,
    transferId: input.transferId,
  });

  return asArray(data?.result);
}

async function fetchTourStaticRow(admin: any, tourId: number) {
  const { data, error } = await admin
    .from("tours_static")
    .select("tourId,tourName,cityName,countryName,image")
    .eq("tourId", String(tourId))
    .limit(1);

  if (error) {
    console.warn("tours_static lookup failed:", error.message);
    return null;
  }

  return Array.isArray(data) && data.length ? data[0] : null;
}

async function fetchDiscount(
  admin: any,
  tourId: number,
  optionId: number,
  transferId: number,
) {
  const select =
    "discount_adult_price,discount_child_price,b2b_adult_price,b2b_child_price";

  for (const column of ["transfer_Id", "transfer_id"]) {
    const { data, error } = await admin
      .from("tour_discount_rates")
      .select(select)
      .eq("tour_id", String(tourId))
      .eq("tour_option_id", String(optionId))
      .eq(column, String(transferId))
      .eq("is_active", true)
      .limit(1);

    if (!error) {
      return Array.isArray(data) && data.length ? data[0] : null;
    }

    if (error.code !== "42703") {
      console.warn("tour_discount_rates lookup failed:", error.message);
      return null;
    }
  }

  return null;
}

async function allocateReferences(admin: any) {
  const { data, error } = await admin.rpc("next_tour_booking_refs");
  if (error) {
    console.error("next_tour_booking_refs failed:", error.message);
    throw new AppError(
      "REFERENCE_ERROR",
      "Could not allocate a booking reference. Please try again.",
      500,
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  const uniqueNo = Math.trunc(toNumber(row?.unique_no, 0));
  const serviceUniqueId = Math.trunc(toNumber(row?.service_unique_id, 0));
  const clientReferenceNo = cleanString(row?.client_reference_no, 20);

  if (!uniqueNo || !serviceUniqueId || !clientReferenceNo) {
    throw new AppError(
      "REFERENCE_ERROR",
      "Could not allocate a booking reference. Please try again.",
      500,
    );
  }

  return { uniqueNo, serviceUniqueId, clientReferenceNo };
}

function sanitizePrebooking(row: any) {
  return {
    id: row.id,
    reference: row.client_reference_no,
    status: row.status,
    paymentStatus: row.payment_status,
    currency: row.currency,
    tourId: Number(row.tour_id),
    tourName: row.tour_name,
    tourCity: row.tour_city,
    tourImage: row.tour_image,
    optionId: Number(row.option_id),
    optionName: row.option_name,
    transferId: Number(row.transfer_id),
    transferType: row.transfer_type,
    transferName: row.transfer_name,
    tourDate: row.tour_date,
    timeSlotId: row.time_slot_id,
    startTime: row.start_time,
    adult: row.adult_count,
    child: row.child_count,
    infant: row.infant_count,
    pickup: row.pickup,
    adultRateB2c: Number(row.adult_rate_b2c),
    childRateB2c: Number(row.child_rate_b2c),
    total: Number(row.total_b2c),
    client: row.client,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  };
}

async function handlePrebook(admin: any, userId: string, body: any) {
  const input = parseInput(body);

  const [options, staticOptions, tourRow] = await Promise.all([
    fetchOptions(input),
    fetchStaticOptions(input.tourId).catch(() => []),
    fetchTourStaticRow(admin, input.tourId),
  ]);

  const option = options.find(
    (item: any) =>
      Math.trunc(toNumber(item?.tourOptionId, 0)) === input.optionId &&
      Math.trunc(toNumber(item?.transferId, 0)) === input.transferId,
  );

  if (!option) {
    throw new AppError(
      "OPTION_NOT_FOUND",
      "This tour option is no longer available. Please choose another option.",
      409,
    );
  }

  if (input.child > 0 && isTruthy(option.disableChild)) {
    throw new AppError(
      "CHILD_NOT_ALLOWED",
      "This option does not allow child guests. Please choose another option.",
      409,
    );
  }

  if (input.infant > 0 && isTruthy(option.disableInfant)) {
    throw new AppError(
      "INFANT_NOT_ALLOWED",
      "This option does not allow infant guests. Please choose another option.",
      409,
    );
  }

  const totalGuests = input.adult + input.child + input.infant;
  const minimumPax = Math.trunc(toNumber(option.minimumPax, 0));
  if (minimumPax > 0 && totalGuests < minimumPax) {
    throw new AppError(
      "MINIMUM_PAX",
      `This option requires at least ${minimumPax} guests.`,
      409,
    );
  }

  const staticInfo = staticOptions.find(
    (item: any) =>
      String(item?.tourOptionId ?? "").trim() === String(input.optionId),
  );

  const transferName = cleanString(
    option.transferName || staticInfo?.transferName,
    160,
  );
  const transferType = inferTransferType(input.transferId, transferName);
  const pickup = transferType === "without" ? "" : input.pickup;

  if (transferType !== "without" && !pickup) {
    throw new AppError(
      "PICKUP_REQUIRED",
      "Please enter the pickup location for this transfer.",
      400,
    );
  }

  let timeSlotId = "0";
  let startTime = normalizeTime(option.startTime);

  if (isTruthy(option.isSlot)) {
    if (!input.slotId || input.slotId === "0") {
      throw new AppError("SLOT_REQUIRED", "Please select a time slot.", 400);
    }

    const slots = await fetchSlots(input);
    const slot = slots.find((item: any) => {
      const id =
        item?.timeSlotId ?? item?.id ?? item?.timeSlot ?? item?.slotId ?? "";
      return String(id).trim() === input.slotId;
    });

    if (!slot) {
      throw new AppError(
        "SLOT_NOT_AVAILABLE",
        "This time slot is no longer available. Please choose another slot.",
        409,
      );
    }

    const slotStatus = String(slot?.status ?? "").trim().toLowerCase();
    if (["unavailable", "inactive", "false", "0"].includes(slotStatus)) {
      throw new AppError(
        "SLOT_NOT_AVAILABLE",
        "This time slot is no longer available. Please choose another slot.",
        409,
      );
    }

    const available = toNumber(slot?.available, Number.NaN);
    if (Number.isFinite(available) && available < totalGuests) {
      throw new AppError(
        "SLOT_NOT_AVAILABLE",
        "Not enough places are left in this time slot. Please choose another slot.",
        409,
      );
    }

    timeSlotId = input.slotId;
    startTime =
      normalizeTime(
        slot?.timeSlot ||
          slot?.slotName ||
          slot?.name ||
          slot?.time ||
          slot?.startTime,
      ) || startTime;
  }

  if (!startTime) startTime = "00:00:00";

  const adultRateB2b = round2(toNumber(option.adultPrice, 0));
  const childRateB2b = round2(toNumber(option.childPrice, 0));
  const infantRateB2b = round2(toNumber(option.infantPrice, 0));
  const computedTotalB2b = round2(
    adultRateB2b * input.adult +
      childRateB2b * input.child +
      infantRateB2b * input.infant,
  );
  const serviceTotalB2b = round2(
    toNumber(option.finalAmount, computedTotalB2b),
  );

  if (adultRateB2b <= 0 || serviceTotalB2b <= 0) {
    throw new AppError(
      "PRICE_ERROR",
      "This tour option has an invalid price. Please choose another option.",
      409,
    );
  }

  const discount = await fetchDiscount(
    admin,
    input.tourId,
    input.optionId,
    input.transferId,
  );

  const discountedAdult = toNumber(discount?.discount_adult_price, 0);
  const discountedChild = toNumber(discount?.discount_child_price, 0);

  const adultRateB2c = round2(
    discountedAdult > 0 ? discountedAdult : adultRateB2b * MARKUP,
  );
  const childRateB2c = round2(
    discountedChild > 0 ? discountedChild : childRateB2b * MARKUP,
  );
  const totalB2c = round2(
    adultRateB2c * input.adult + childRateB2c * input.child,
  );

  if (totalB2c <= 0) {
    throw new AppError(
      "PRICE_ERROR",
      "This tour option has an invalid price. Please choose another option.",
      409,
    );
  }

  const refs = await allocateReferences(admin);

  const tourName =
    cleanString(tourRow?.tourName, 200) ||
    input.fallbackTourName ||
    `Tour ${input.tourId}`;
  const tourCity =
    cleanString(tourRow?.cityName, 120) || input.fallbackCity || null;
  const tourImage =
    cleanString(tourRow?.image, 1000) || input.fallbackImage || null;
  const optionName =
    cleanString(staticInfo?.optionName, 160) || `Option ${input.optionId}`;

  const raynaPayload = {
    uniqueNo: refs.uniqueNo,
    TourDetails: [
      {
        serviceUniqueId: refs.serviceUniqueId,
        tourId: input.tourId,
        optionId: input.optionId,
        adult: input.adult,
        child: input.child,
        infant: input.infant,
        tourDate: input.tourDate,
        timeSlotId,
        startTime,
        transferId: input.transferId,
        pickup,
        adultRate: adultRateB2b,
        childRate: childRateB2b,
        serviceTotal: serviceTotalB2b,
      },
    ],
    passengers: [
      {
        serviceType: "Tour",
        prefix: input.client.prefix,
        firstName: input.client.firstName,
        lastName: input.client.lastName,
        email: input.client.email,
        mobile: input.client.mobile,
        nationality: input.client.nationality,
        message: "message",
        leadPassenger: totalGuests,
        paxType: "Adult",
        clientReferenceNo: refs.clientReferenceNo,
      },
    ],
  };

  const { data: inserted, error: insertError } = await admin
    .from("tours_pre_bookings")
    .insert({
      user_id: userId,
      status: "pending_payment",
      payment_status: "unpaid",
      currency: "AED",
      unique_no: refs.uniqueNo,
      service_unique_id: refs.serviceUniqueId,
      client_reference_no: refs.clientReferenceNo,
      tour_id: String(input.tourId),
      tour_name: tourName,
      tour_city: tourCity,
      tour_image: tourImage,
      option_id: String(input.optionId),
      option_name: optionName,
      transfer_id: String(input.transferId),
      transfer_type: transferType,
      transfer_name: transferName || null,
      tour_date: input.tourDate,
      time_slot_id: timeSlotId,
      start_time: startTime,
      adult_count: input.adult,
      child_count: input.child,
      infant_count: input.infant,
      pickup,
      adult_rate_b2b: adultRateB2b,
      child_rate_b2b: childRateB2b,
      infant_rate_b2b: infantRateB2b,
      adult_rate_b2c: adultRateB2c,
      child_rate_b2c: childRateB2c,
      service_total_b2b: serviceTotalB2b,
      total_b2c: totalB2c,
      client: input.client,
      rayna_payload: raynaPayload,
      tour_snapshot: {
        option,
        static: staticInfo ?? null,
        discount: discount ?? null,
        requested: {
          tourId: input.tourId,
          optionId: input.optionId,
          transferId: input.transferId,
          tourDate: input.tourDate,
          adult: input.adult,
          child: input.child,
          infant: input.infant,
          slotId: input.slotId || null,
          pickup,
        },
      },
    })
    .select(
      "id, client_reference_no, status, payment_status, currency, total_b2c, created_at",
    )
    .single();

  if (insertError || !inserted) {
    console.error("tours_pre_bookings insert failed:", insertError?.message);
    throw new AppError(
      "SAVE_ERROR",
      "Could not save your pre-booking. Please try again.",
      500,
    );
  }

  return json({
    prebooking: {
      id: inserted.id,
      reference: inserted.client_reference_no,
      status: inserted.status,
      paymentStatus: inserted.payment_status,
      currency: inserted.currency,
      total: Number(inserted.total_b2c),
      adultRateB2c: adultRateB2c,
      childRateB2c: childRateB2c,
      tourName,
      optionName,
      tourDate: input.tourDate,
      startTime,
      adult: input.adult,
      child: input.child,
      infant: input.infant,
      transferType,
      pickup,
      createdAt: inserted.created_at,
    },
  });
}

async function handleGet(admin: any, userId: string, body: any) {
  const prebookingId = cleanString(body?.prebookingId, 64);
  if (!prebookingId) {
    throw new AppError("INVALID_INPUT", "prebookingId is required.", 400);
  }

  const { data, error } = await admin
    .from("tours_pre_bookings")
    .select(
      "id, status, payment_status, currency, client_reference_no, tour_id, tour_name, tour_city, tour_image, option_id, option_name, transfer_id, transfer_type, transfer_name, tour_date, time_slot_id, start_time, adult_count, child_count, infant_count, pickup, adult_rate_b2c, child_rate_b2c, total_b2c, client, created_at, paid_at",
    )
    .eq("id", prebookingId)
    .eq("user_id", userId)
    .limit(1);

  if (error) {
    console.error("tours_pre_bookings get failed:", error.message);
    throw new AppError("READ_ERROR", "Could not load your pre-booking.", 500);
  }

  const row = Array.isArray(data) && data.length ? data[0] : null;
  if (!row) {
    throw new AppError("NOT_FOUND", "Pre-booking not found.", 404);
  }

  return json({ prebooking: sanitizePrebooking(row) });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return err("METHOD_NOT_ALLOWED", "Use POST.", 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new AppError("CONFIG_ERROR", "Server is not configured.", 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      throw new AppError("UNAUTHORIZED", "Please sign in again.", 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) {
      throw new AppError("UNAUTHORIZED", "Please sign in again.", 401);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new AppError("INVALID_INPUT", "Request body is required.", 400);
    }

    const action = cleanString(body.action, 32).toLowerCase();
    if (action === "prebook") {
      return await handlePrebook(admin, userData.user.id, body);
    }
    if (action === "get") {
      return await handleGet(admin, userData.user.id, body);
    }

    throw new AppError("INVALID_ACTION", "Unsupported action.", 400);
  } catch (error: any) {
    if (error instanceof AppError) {
      return err(error.code, error.message, error.status);
    }

    console.error("tours-booking unexpected error:", error);
    return err("INTERNAL_ERROR", "Something went wrong. Please try again.", 500);
  }
});
