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
    const externalSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    const useInternalSocket =
      process.env.NODE_ENV !== "production" ||
      process.env.NEXT_PUBLIC_ENABLE_INTERNAL_SOCKET === "true";

    if (!externalSocketUrl && !useInternalSocket) {
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const socketUrl = externalSocketUrl || window.location.origin;
    const socketInstance = new (ClientIO as any)(socketUrl, {
      path: process.env.NEXT_PUBLIC_SOCKET_PATH || (externalSocketUrl ? "/socket.io" : "/api/socket/io"),
      ...(externalSocketUrl ? {} : { addTrailingSlash: false }),
      ...(externalSocketUrl ? { transports: ["websocket"] } : {}),
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 10000,
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
