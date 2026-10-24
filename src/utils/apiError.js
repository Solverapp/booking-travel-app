export class ApiError extends Error {
  constructor(message, { code = "API_ERROR", status, details, cause } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.cause = cause;
  }
}

export const createAbortError = () => {
  const error = new Error("Request aborted");
  error.name = "AbortError";
  return error;
};

export const isAbortError = (error) =>
  error?.name === "AbortError" || /aborted/i.test(String(error?.message ?? ""));

export const apiErrorFromData = (data, fallback = "Request failed") => {
  const upstream = data?.error;
  const message =
    upstream?.message || upstream?.description || upstream?.details || fallback;
  return new ApiError(message, {
    code: upstream?.code || "API_ERROR",
    details: upstream ?? data,
  });
};

export const apiErrorFromResponse = async (response) => {
  const context = response?.error?.context;
  let body;

  try {
    body = await context?.clone?.().json?.();
  } catch {
    body = undefined;
  }

  if (!body) {
    try {
      const text = await context?.text?.();
      if (text) {
        body = { error: { message: text.slice(0, 500) } };
      }
    } catch {
      body = undefined;
    }
  }

  const upstream = body?.error;
  const status = context?.status ?? response?.response?.status;
  const fallback =
    status === 504
      ? "The booking service timed out. Check My Bookings before retrying."
      : response?.error?.message || `Request failed${status ? ` (${status})` : ""}`;
  const message = upstream?.message || upstream?.description || fallback;

  return new ApiError(message, {
    code:
      upstream?.code ||
      (status === 504
        ? "GATEWAY_TIMEOUT"
        : status === 546
          ? "WORKER_LIMIT"
          : response?.error?.name || "FUNCTIONS_ERROR"),
    status,
    details: body ?? response?.error,
    cause: response?.error,
  });
};
