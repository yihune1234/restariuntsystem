/**
 * Customer-facing QR URL helpers.
 *
 * The base URL encoded into printed table/branch QR codes must always be a
 * host the CUSTOMER'S PHONE can reach. Priority:
 *
 *   1. window.location.origin — the origin the Manager/Owner is viewing the
 *      dashboard from right now. This keeps printed QR codes correct in every
 *      environment: localhost during development, the LAN IP when the IP
 *      changes (DHCP), and the deployed domain in production. The dashboard
 *      and the customer app are served from the same origin.
 *   2. VITE_CLIENT_URL — explicit build-time override for the rare setup
 *      where the customer app lives on a different public domain than the
 *      staff dashboard.
 */

export function getCustomerBaseUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return (import.meta.env.VITE_CLIENT_URL || "http://localhost:5173").replace(
    /\/+$/,
    ""
  );
}

/**
 * Full customer QR landing URL.
 * Uses token-based lookup: `/customer/qr?token=<qrToken>`
 */
export function buildCustomerQrUrl(qrToken) {
  if (!qrToken) return "";
  return `${getCustomerBaseUrl()}/customer/qr?token=${qrToken}`;
}
