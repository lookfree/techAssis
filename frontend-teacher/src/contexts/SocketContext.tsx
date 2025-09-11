import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { message } from 'antd';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  emitEvent: (event: string, data?: any) => void;
  addEventListener: (event: string, handler: (data: any) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);

  useEffect(() => {
    // WebSocket functionality disabled until backend Socket.io implementation is ready
    // TODO: Enable WebSocket connections when backend WebSocket gateway is implemented
    
    // Clean up function
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, [isAuthenticated, user]);

  const emitEvent = (event: string, data?: any) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  };

  const addEventListener = (event: string, handler: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
      
      // 返回清理函数
      return () => {
        if (socketRef.current) {
          socketRef.current.off(event, handler);
        }
      };
    }
    
    return () => {}; // 空的清理函数
  };

  const value: SocketContextType = {
    socket: socketRef.current,
    isConnected,
    emitEvent,
    addEventListener,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};