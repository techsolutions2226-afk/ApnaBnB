/* Socket singleton — notifications only.
 *
 * Mirrors the server: one connection per logged-in user, no outbound events.
 * Self-noops without a token so calling it while logged out is harmless.
 */
import { io } from "socket.io-client";

const SOCKET_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

let socket = null;

export const getSocket = () => {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }
  if (socket?.connected) return socket;
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
