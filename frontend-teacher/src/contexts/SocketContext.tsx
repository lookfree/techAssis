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
    if (!isAuthenticated || !user) {
      // 未认证时断开连接
      if (socketRef.current) {
        console.log('🔌 Disconnecting socket (user not authenticated)');
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // 已认证时建立连接
    if (!socketRef.current) {
      console.log('🚀 Connecting to WebSocket server...');

      const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
      console.log('🔑 Token for WebSocket:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');

      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3000';
      const socket = io(`${wsUrl.replace('ws://', 'http://').replace('wss://', 'https://')}/classrooms`, {
        transports: ['polling', 'websocket'], // 改变顺序，先尝试polling
        query: {
          userId: user.id,
          userType: user.role || 'teacher'
        },
        auth: {
          token: token
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
      });

      socket.on('connect', () => {
        console.log('✅ Socket connected:', socket.id);
        setIsConnected(true);

        // 显示连接成功提示
        message.success({
          content: '实时连接已建立',
          duration: 2,
          key: 'socket-connection'
        });
      });

      // 监听服务端发送的connected事件
      socket.on('connected', (data) => {
        console.log('📨 Received connected event from server:', data);
      });

      socket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('🔴 Socket connection error:', error);
        console.error('Error message:', error.message);
        setIsConnected(false);

        // 显示连接失败提示
        message.warning({
          content: '实时连接失败，部分功能可能受影响',
          duration: 3,
          key: 'socket-connection-error'
        });
      });

      socketRef.current = socket;
    }

    // Clean up function
    return () => {
      if (socketRef.current) {
        console.log('🔌 Cleaning up socket connection');
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