/* Socket singleton — notifications only.
 *
 * Mirrors the server: one connection per logged-in user, no outbound events.
 * Self-noops without a token so calling it while logged out is harmless.
 *
 * Also listens for the server's `session:revoked` event — sent when an admin
 * deletes / suspends / deactivates the account (see Backend/sockets kickUser).
 * On receipt the local session is wiped and the user is bounced to /login so
 * the logout is instant and does not depend on the next REST call failing.
 */
import { io } from "socket.io-client";

const SOCKET_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

let socket = null;

/* Force-logout handler shared by every connected socket. Fires on the server's
   `session:revoked` push — the account was deleted / suspended / deactivated
   by an admin. */
const handleSessionRevoked = () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("current_user");
  if (socket) {
    socket.off("session:revoked");
    socket.disconnect();
    socket = null;
  }
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
};

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
    socket.on("session:revoked", handleSessionRevoked);
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.off("session:revoked");
    socket.disconnect();
    socket = null;
  }
};
