/* Singleton socket client.
   - Auto-(re)connects on first call once we have an auth token in localStorage.
   - Reuses the same connection across the whole app.
   - Disconnect on logout via disconnectSocket(). */

import { io } from 'socket.io-client';

const SOCKET_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/api\/?$/, '');

let socket = null;

export const getSocket = () => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    // No login → no socket. Caller should re-invoke after login.
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  if (socket && socket.connected) return socket;

  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
  } else {
    // Token may have rotated since last connect.
    socket.auth = { token };
    socket.connect();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default getSocket;
