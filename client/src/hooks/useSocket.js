import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSocket, disconnectSocket } from '../api/socket';

/** Hook that returns the singleton socket once the user is authenticated.
 *  Cleans up the connection if the user logs out. */
export const useSocket = () => {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      setSocket(null);
      return;
    }
    const s = getSocket();
    setSocket(s);
    // We deliberately don't disconnect on unmount — the socket is shared
    // across all pages and we want to stay subscribed while logged in.
  }, [isAuthenticated]);

  return socket;
};

export default useSocket;
