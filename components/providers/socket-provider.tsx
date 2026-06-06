"use client";

import { 
  createContext,
  useContext,
  useEffect,
  useState
} from "react";
import { io as ClientIO } from "socket.io-client";

type SocketContextType = {
  socket: any | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ 
  children 
}: { 
  children: React.ReactNode 
}) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const socketInstance = new (ClientIO as any)(socketUrl, {
      path: "/api/socket/io",
      addTrailingSlash: false,
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const heartbeat = async () => {
      if (!isMounted) {
        return;
      }

      await fetch("/api/presence/heartbeat", {
        method: "POST",
      }).catch(() => null);
    };

    heartbeat();
    const interval = window.setInterval(heartbeat, 30 * 1000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}
