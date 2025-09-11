import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, LoginDto } from '../types';
import { authService } from '../services/auth';
import { message } from 'antd';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CLEAR_ERROR' };

interface AuthContextType extends AuthState {
  login: (loginData: LoginDto) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  clearError: () => void;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 初始化认证状态
  useEffect(() => {
    const initAuth = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      try {
        if (authService.isAuthenticated()) {
          // 验证token有效性并获取最新用户信息
          const user = await authService.getCurrentUser();
          dispatch({ type: 'SET_USER', payload: user });
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        // Token可能已过期，清除本地存储
        await logout();
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initAuth();
  }, []);

  const login = async (loginData: LoginDto) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const response = await authService.login(loginData);
      dispatch({ type: 'LOGIN_SUCCESS', payload: response.user as User });
      message.success('登录成功');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '登录失败';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      message.error(errorMessage);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
      message.success('已安全退出');
    }
  };

  const updateUser = (user: User) => {
    dispatch({ type: 'SET_USER', payload: user });
    localStorage.setItem('user', JSON.stringify(user));
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    updateUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};