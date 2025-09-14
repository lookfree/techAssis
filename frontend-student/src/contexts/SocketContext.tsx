import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import io, { Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

// 获取WebSocket URL配置
const getWebSocketUrl = () => {
  // 优先使用运行时配置（生产环境）
  if (window._env_ && window._env_.REACT_APP_WS_URL) {
    return window._env_.REACT_APP_WS_URL;
  }

  // 其次使用构建时配置（开发环境）
  if (process.env.REACT_APP_WS_URL) {
    return process.env.REACT_APP_WS_URL;
  }

  // 如果有API URL配置，尝试从API URL推导WebSocket URL
  let apiUrl: string;
  if (window._env_ && window._env_.REACT_APP_API_URL) {
    apiUrl = window._env_.REACT_APP_API_URL;
  } else {
    apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3000";
  }

  // Socket.io 使用 HTTP 协议，不需要转换为 ws://
  return apiUrl.replace('/api', '');
};

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  emit: () => {},
  on: () => {},
  off: () => {},
});

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (user) {
      // 创建socket连接到classrooms namespace
      const socketUrl = getWebSocketUrl() + "/classrooms";
      console.log('Connecting to WebSocket:', socketUrl);

      const newSocket = io(socketUrl, {
        transports: ['polling', 'websocket'], // 先尝试polling
        query: {
          userId: user.id,
          userType: user.role || 'student'
        },
        auth: {
          token: localStorage.getItem("access_token") || '',
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        timeout: 20000,
      });

      newSocket.on("connect", () => {
        console.log("Socket connected");
        setIsConnected(true);
      });

      newSocket.on("disconnect", () => {
        console.log("Socket disconnected");
        setIsConnected(false);
      });

      newSocket.on("error", (error) => {
        console.error("Socket error:", error);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      // 用户未登录时关闭连接
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [user]);

  const emit = (event: string, data?: any) => {
    if (socket) {
      socket.emit(event, data);
    }
  };

  const on = (event: string, callback: (data: any) => void) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event: string, callback?: (data: any) => void) => {
    if (socket) {
      if (callback) {
        socket.off(event, callback);
      } else {
        socket.off(event);
      }
    }
  };

  const contextValue: SocketContextType = {
    socket,
    isConnected,
    emit,
    on,
    off,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
