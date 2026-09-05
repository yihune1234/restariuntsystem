import { io } from "socket.io-client";

/**
 * Socket.IO client configuration.
 *
 * The backend exposes the same HTTP server for both REST and Socket.IO.
 * When connecting, we authenticate with either:
 *   - Staff  -> auth.token = "Bearer <accessToken>"
 *   - Customer -> auth.sessionToken = "<customerSessionToken>"
 *
 * Server emits canonical events (see src/sockets/events.js on backend):
 *   order:payment-required, order:confirmed, order:preparing,
 *   order:ready, order:taken, order:delivered, order:created,
 *   order:cancelled, food:sold-out, etc.
 */

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === "development"
    ? "http://localhost:5000"
    : "https://restariuntsystem-2.onrender.com");

const STORAGE_KEYS = {
  accessToken: "ts_access_token",
  customerSessionToken: "ts_customer_session_token",
};

let socket = null;

const buildAuth = () => {
  // Try staff token first; fall back to customer session token.
  const staff = localStorage.getItem(STORAGE_KEYS.accessToken);
  if (staff) {
    return { token: `Bearer ${staff}` };
  }
  const customer = localStorage.getItem(STORAGE_KEYS.customerSessionToken);
  if (customer) {
    return { sessionToken: customer };
  }
  return {};
};

export const initSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false, // we control connect/disconnect lifecycle
      transports: ["websocket", "polling"],
      auth: buildAuth(),
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      console.log("[socket] connected", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("[socket] disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.warn("[socket] connect_error:", err.message);
    });
  } else {
    // Refresh auth payload (e.g. after login/logout)
    socket.auth = buildAuth();
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) return initSocket();
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  s.auth = buildAuth();
  if (!s.connected) s.connect();
};

export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
};

/**
 * Subscribe to a backend order:track room for real-time updates on a
 * specific order. The customer-side emits this event from the client.
 *
 * Safely queues the emit when the socket isn't connected yet — the
 * server will only join the order room after authenticating the session
 * token, and any `order:*` events we miss during the brief connect window
 * are reflected by the next REST fetch.
 */
export const trackOrder = (orderId) => {
  const s = getSocket();
  const send = () => s.emit("order:track", { orderId });
  if (s.connected) {
    send();
    return;
  }
  connectSocket();
  s.once("connect", send);
};
