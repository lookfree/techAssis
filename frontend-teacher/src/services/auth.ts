import { request } from './api';
import { User, LoginDto, AuthResponse } from '@/types';

export const authService = {
  // 用户登录
  async login(loginData: LoginDto): Promise<AuthResponse> {
    const response = await request.post<AuthResponse>('/auth/login', loginData);
    
    // 保存token到localStorage
    if (response.access_token) {
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  },

  // 用户登出
  async logout(): Promise<void> {
    try {
      await request.post('/auth/logout');
    } finally {
      // 清除本地存储
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  },

  // 获取当前用户信息
  async getCurrentUser(): Promise<User> {
    return request.get<User>('/auth/me');
  },

  // 刷新访问令牌
  async refreshToken(): Promise<{ access_token: string }> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await request.post<{ access_token: string }>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    
    // 更新访问令牌
    localStorage.setItem('access_token', response.access_token);
    
    return response;
  },

  // 修改密码
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    return request.put('/auth/password', {
      oldPassword,
      newPassword,
    });
  },

  // 检查是否已登录
  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },

  // 获取存储的用户信息
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  // 获取访问令牌
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  },

  // 获取刷新令牌
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  },
};