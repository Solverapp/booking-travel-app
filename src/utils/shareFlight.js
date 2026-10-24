export const shareFlightLink = async (title = "Flight offer") => {
  const url = window.location.href;
  if (typeof navigator.share === "function") {
    await navigator.share({ title, url });
    return "shared";
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return "copied";
  }
  return "unsupported";
};
