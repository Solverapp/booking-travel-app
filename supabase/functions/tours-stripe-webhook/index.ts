// ============================================================
// tours-stripe-webhook — Phase 2 Stripe webhook for tour payments
// verify_jwt = false — signature is verified below.
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const SIGNATURE_TOLERANCE_SECONDS = 300;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });

const cleanString = (value: unknown, max = 255) =>
  String(value ?? "").trim().slice(0, max);

const toInt = (value: unknown, fallback = 0) => {
  const number = Math.trunc(Number(value));
  return Number.isFinite(number) ? number : fallback;
};

async function hmacHex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

async function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
) {
  if (!header) return false;

  let timestamp = "";
  const signatures: string[] = [];

  for (const part of header.split(",")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === "t") timestamp = value;
    if (key === "v1") signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;

  const age = Math.abs(Date.now() / 1000 - timestampSeconds);
  if (age > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = await hmacHex(secret, `${timestamp}.${rawBody}`);
  return signatures.some((signature) => timingSafeEqualHex(expected, signature));
}

async function findPrebookingByPaymentIntent(admin: any, paymentIntentId: string) {
  const { data: attempt, error: attemptError } = await admin
    .from("tours_payment_attempts")
    .select("id, prebooking_id, user_id, status")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (attemptError) {
    console.error("webhook attempt lookup failed:", attemptError.message);
  }
  if (attempt?.prebooking_id) return attempt;

  const { data: prebooking, error: prebookingError } = await admin
    .from("tours_pre_bookings")
    .select("id, user_id, status, payment_status")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (prebookingError) {
    console.error("webhook prebooking lookup failed:", prebookingError.message);
  }

  return prebooking
    ? {
        prebooking_id: prebooking.id,
        user_id: prebooking.user_id,
        status: prebooking.status,
        payment_status: prebooking.payment_status,
      }
    : null;
}

async function updateAttemptByPaymentIntent(
  admin: any,
  paymentIntentId: string,
  patch: Record<string, unknown>,
) {
  const { error } = await admin
    .from("tours_payment_attempts")
    .update(patch)
    .eq("stripe_payment_intent_id", paymentIntentId);

  if (error) {
    console.error("webhook attempt update failed:", error.message);
  }
}

async function markPrebookingFailed(admin: any, prebookingId: string) {
  const { error } = await admin
    .from("tours_pre_bookings")
    .update({ payment_status: "failed" })
    .eq("id", prebookingId)
    .neq("payment_status", "paid")
    .neq("payment_status", "refunded");

  if (error) {
    console.error("webhook prebooking failed update error:", error.message);
  }
}

async function handleSucceeded(admin: any, paymentIntent: any, eventId: string) {
  const paymentIntentId = cleanString(paymentIntent?.id, 200);
  const prebookingId = cleanString(paymentIntent?.metadata?.prebooking_id, 64);

  if (!paymentIntentId || !prebookingId) {
    console.error(
      JSON.stringify({
        fn: "tours-stripe-webhook",
        eventId,
        error: "Missing payment_intent id or metadata.prebooking_id",
      }),
    );
    return;
  }

  const amount = toInt(paymentIntent.amount_received ?? paymentIntent.amount);
  const currency = cleanString(paymentIntent.currency, 8).toUpperCase();

  const { data: bookingId, error } = await admin.rpc("finalize_tour_payment", {
    p_prebooking_id: prebookingId,
    p_payment_intent_id: paymentIntentId,
    p_amount: amount,
    p_currency: currency,
  });

  if (error) {
    console.error(
      JSON.stringify({
        fn: "tours-stripe-webhook",
        eventId,
        action: "finalize",
        prebookingId,
        paymentIntentId,
        error: error.message,
      }),
    );
    throw new Error(`finalize_tour_payment failed: ${error.message}`);
  }

  await updateAttemptByPaymentIntent(admin, paymentIntentId, {
    status: "succeeded",
    error_code: null,
    error_message: null,
  });

  console.log(
    JSON.stringify({
      fn: "tours-stripe-webhook",
      eventId,
      action: "succeeded",
      prebookingId,
      paymentIntentId,
      bookingId,
    }),
  );
}

async function handlePaymentFailed(admin: any, paymentIntent: any, eventId: string) {
  const paymentIntentId = cleanString(paymentIntent?.id, 200);
  if (!paymentIntentId) return;

  const found = await findPrebookingByPaymentIntent(admin, paymentIntentId);
  if (!found?.prebooking_id) {
    console.error(
      JSON.stringify({
        fn: "tours-stripe-webhook",
        eventId,
        error: "Pre-booking not found for failed payment",
        paymentIntentId,
      }),
    );
    return;
  }

  await updateAttemptByPaymentIntent(admin, paymentIntentId, {
    status: "failed",
    error_code: cleanString(paymentIntent?.last_payment_error?.code, 120) || null,
    error_message:
      cleanString(paymentIntent?.last_payment_error?.message, 500) || null,
  });

  await markPrebookingFailed(admin, found.prebooking_id);
}

async function handleCanceled(admin: any, paymentIntent: any, eventId: string) {
  const paymentIntentId = cleanString(paymentIntent?.id, 200);
  if (!paymentIntentId) return;

  const found = await findPrebookingByPaymentIntent(admin, paymentIntentId);
  if (!found?.prebooking_id) return;

  await updateAttemptByPaymentIntent(admin, paymentIntentId, {
    status: "canceled",
    error_code: "CANCELED",
    error_message: "PaymentIntent was canceled.",
  });

  await markPrebookingFailed(admin, found.prebooking_id);
}

async function handleProcessing(admin: any, paymentIntent: any) {
  const paymentIntentId = cleanString(paymentIntent?.id, 200);
  if (!paymentIntentId) return;

  const found = await findPrebookingByPaymentIntent(admin, paymentIntentId);
  if (!found?.prebooking_id) return;

  await updateAttemptByPaymentIntent(admin, paymentIntentId, {
    status: "processing",
  });

  const { error } = await admin
    .from("tours_pre_bookings")
    .update({ payment_status: "processing" })
    .eq("id", found.prebooking_id)
    .neq("payment_status", "paid")
    .neq("payment_status", "refunded");

  if (error) {
    console.error("webhook processing update error:", error.message);
  }
}

async function handleRefunded(admin: any, charge: any, eventId: string) {
  if (charge?.refunded !== true) return;

  const paymentIntentId = cleanString(charge?.payment_intent, 200);
  if (!paymentIntentId) return;

  const found = await findPrebookingByPaymentIntent(admin, paymentIntentId);
  if (!found?.prebooking_id) {
    console.error(
      JSON.stringify({
        fn: "tours-stripe-webhook",
        eventId,
        error: "Pre-booking not found for refund",
        paymentIntentId,
      }),
    );
    return;
  }

  const { error: prebookingError } = await admin
    .from("tours_pre_bookings")
    .update({ payment_status: "refunded", status: "cancelled" })
    .eq("id", found.prebooking_id);

  if (prebookingError) {
    console.error("webhook refunded prebooking update error:", prebookingError.message);
  }

  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("id, meta")
    .eq("order_ref", found.prebooking_id)
    .eq("Service", "Tour")
    .maybeSingle();

  if (bookingError) {
    console.error("webhook refunded booking lookup error:", bookingError.message);
    return;
  }

  if (booking?.id) {
    const { error: bookingUpdateError } = await admin
      .from("bookings")
      .update({
        status: "Cancelled",
        meta: {
          ...(booking.meta && typeof booking.meta === "object" ? booking.meta : {}),
          payment_status: "refunded",
        },
      })
      .eq("id", booking.id);

    if (bookingUpdateError) {
      console.error("webhook refunded booking update error:", bookingUpdateError.message);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok");
  }

  if (req.method !== "POST") {
    return json({ error: "Use POST." }, 405);
  }

  try {
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
      console.error("tours-stripe-webhook is not configured");
      return json({ error: "Webhook is not configured." }, 500);
    }

    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");
    const valid = await verifyStripeSignature(rawBody, signature, webhookSecret);

    if (!valid) {
      console.error("tours-stripe-webhook signature verification failed");
      return json({ error: "Invalid signature." }, 400);
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return json({ error: "Invalid JSON." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const eventId = cleanString(event?.id, 200);
    const eventType = cleanString(event?.type, 100);
    const object = event?.data?.object;

    console.log(
      JSON.stringify({
        fn: "tours-stripe-webhook",
        eventId,
        eventType,
        paymentIntentId: object?.id ?? object?.payment_intent ?? null,
      }),
    );

    if (eventType === "payment_intent.succeeded") {
      await handleSucceeded(admin, object, eventId);
    } else if (eventType === "payment_intent.payment_failed") {
      await handlePaymentFailed(admin, object, eventId);
    } else if (eventType === "payment_intent.canceled") {
      await handleCanceled(admin, object, eventId);
    } else if (eventType === "payment_intent.processing") {
      await handleProcessing(admin, object);
    } else if (eventType === "charge.refunded") {
      await handleRefunded(admin, object, eventId);
    }

    return json({ received: true });
  } catch (error: any) {
    console.error("tours-stripe-webhook unexpected error:", error);
    return json({ error: "Webhook handler failed." }, 500);
  }
});
