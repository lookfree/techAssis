import React, { createContext, useState, useEffect, ReactNode } from "react";
import { User, LoginDto, AuthResponse } from "../types";
import { apiService, request } from "../services/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginDto) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
  refreshToken: () => Promise<string>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  updateUser: () => {},
  refreshToken: async () => "",
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const userData = await apiService.auth.getProfile();
      setUser(userData as User);
    } catch (error) {
      // Token无效，清除存储的token
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginDto) => {
    try {
      const response = await apiService.auth.login({
        email: credentials.email,
        password: credentials.password,
      });

      // 存储tokens
      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("refresh_token", response.refresh_token);

      setUser(response.user as User);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiService.auth.logout();
    } catch (error) {
      // 即使退出请求失败，也要清除本地数据
      console.warn("Logout request failed:", error);
    } finally {
      // 清除本地存储
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setUser(null);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const refreshToken = async () => {
    const refresh_token = localStorage.getItem("refresh_token");
    if (!refresh_token) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await apiService.auth.refreshToken(refresh_token);

      localStorage.setItem("access_token", response.access_token);
      if (response.refresh_token) {
        localStorage.setItem("refresh_token", response.refresh_token);
      }
      return response.access_token;
    } catch (error) {
      // 刷新token失败，清除所有token并跳转登录
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setUser(null);
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    user,
    loading,
    login,
    logout,
    updateUser,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
