import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

// 创建axios实例
const api: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:3000/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 添加认证token
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 添加时间戳防止缓存
    if (config.method === "get") {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 处理401错误（token过期）
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
          const response = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            {
              refresh_token: refreshToken,
            },
          );

          const { access_token } = response.data;
          localStorage.setItem("access_token", access_token);

          // 重新发送原请求
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // 刷新token失败，跳转到登录页
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

// 通用请求方法
export const request = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    api.get(url, config).then((res) => res.data),

  post: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> => api.post(url, data, config).then((res) => res.data),

  put: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> => api.put(url, data, config).then((res) => res.data),

  patch: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> => api.patch(url, data, config).then((res) => res.data),

  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    api.delete(url, config).then((res) => res.data),
};

// 文件上传方法
export const uploadFile = async (
  file: File,
  onProgress?: (progress: number) => void,
) => {
  const formData = new FormData();
  formData.append("file", file);

  return api
    .post("/files/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          onProgress(Math.round(progress));
        }
      },
    })
    .then((res) => res.data);
};

// API接口类型定义
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    studentId?: string;
    avatar?: string;
    profile?: any;
    department?: string;
    major?: string;
    grade?: string;
  };
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'student';
  studentId?: string;
  phone?: string;
  department?: string;
  major?: string;
  grade?: string;
}

// 认证相关API
export const authAPI = {
  // 登录
  login: (credentials: LoginRequest): Promise<LoginResponse> => {
    return request.post<LoginResponse>('/auth/login', credentials);
  },

  // 注册
  register: (userData: RegisterRequest): Promise<LoginResponse> => {
    return request.post<LoginResponse>('/auth/register', userData);
  },

  // 登出
  logout: (): Promise<void> => {
    return request.post<void>('/auth/logout');
  },

  // 获取用户信息
  getProfile: (): Promise<LoginResponse['user']> => {
    return request.get<LoginResponse['user']>('/auth/me');
  },

  // 刷新Token
  refreshToken: (refreshToken: string): Promise<{ access_token: string; refresh_token: string }> => {
    return request.post<{ access_token: string; refresh_token: string }>('/auth/refresh', {
      refresh_token: refreshToken,
    });
  },

  // 修改密码
  changePassword: (oldPassword: string, newPassword: string): Promise<void> => {
    return request.put<void>('/auth/password', {
      oldPassword,
      newPassword,
    });
  },
};

// 学生相关API
export const studentAPI = {
  // 获取今日课程
  getTodaySchedule: (): Promise<any[]> => {
    return request.get<any[]>('/student/today-schedule');
  },

  // 获取学生状态统计
  getStats: (): Promise<any> => {
    return request.get<any>('/student/stats');
  },

  // 获取课程列表
  getCourses: (): Promise<any[]> => {
    return request.get<any[]>('/student/courses');
  },

  // 获取作业列表
  getAssignments: (params?: { status?: string; limit?: number }): Promise<any[]> => {
    return request.get<any[]>('/student/assignments', { params });
  },

  // 获取签到记录
  getAttendances: (params?: { limit?: number; courseId?: string }): Promise<any[]> => {
    return request.get<any[]>('/student/attendances', { params });
  },
};

// 通知相关API
export const notificationAPI = {
  // 获取通知列表
  getNotifications: (params?: { limit?: number; unread?: boolean }): Promise<any[]> => {
    return request.get<any[]>('/notifications', { params });
  },

  // 标记通知为已读
  markAsRead: (notificationId: string): Promise<void> => {
    return request.patch<void>(`/notifications/${notificationId}/read`);
  },

  // 标记所有通知为已读
  markAllAsRead: (): Promise<void> => {
    return request.patch<void>('/notifications/mark-all-read');
  },
};

// 组合所有API
export const apiService = {
  auth: authAPI,
  student: studentAPI,
  notification: notificationAPI,
};

export default api;
