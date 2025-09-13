import { request } from './api';
import { message } from 'antd';

export enum CheckInMethod {
  VERIFICATION_CODE = 'verification_code',
  QR_CODE = 'qr_code', 
  SEAT_MAP = 'seat_selection',
  MANUAL = 'manual'
}

export interface StartCheckInParams {
  courseId: string;
  checkInMethod: CheckInMethod;
  duration?: number;
  sessionDate?: string;
  location?: any;
  description?: string;
}

export interface CheckInSession {
  id: string;
  courseId: string;
  sessionNumber: number;
  sessionDate: string;
  status: 'scheduled' | 'active' | 'closed';
  checkInMethod: CheckInMethod;
  duration: number;
  verificationCode?: string;
  qrCodeUrl?: string;
  location?: any;
  attendanceRecords: any[];
  startTime?: string;
  totalStudents?: number;
  checkedInStudents?: number;
}

/**
 * 统一的签到服务类
 * 整合所有签到相关功能，避免重复逻辑
 */
class AttendanceService {
  
  /**
   * 🚀 统一发起签到入口
   * 支持所有签到方式：验证码、二维码、座位图、手动
   */
  async startCheckIn(params: StartCheckInParams): Promise<CheckInSession> {
    try {
      // 🔧 修复：确保数据格式匹配后端 StartSessionDto
      const sessionData = {
        checkInMethod: params.checkInMethod,
        duration: params.duration || 30,
        // 自动生成验证码（如果是验证码签到）
        verificationCode: params.checkInMethod === CheckInMethod.VERIFICATION_CODE ? 
          Math.random().toString(36).substring(2, 8).toUpperCase() : undefined,
        // 二维码内容（如果是二维码签到）
        qrCode: params.checkInMethod === CheckInMethod.QR_CODE ? 
          `checkin_${params.courseId}_${Date.now()}` : undefined
      };

      console.log('🚀 发起签到请求:', {
        url: `/attendance/sessions/${params.courseId}/start`,
        data: sessionData
      });

      const response = await request.post(`/attendance/sessions/${params.courseId}/start`, sessionData);
      
      message.success(`${this.getMethodName(params.checkInMethod)}签到已开始`);
      return response;
      
    } catch (error: any) {
      const methodName = this.getMethodName(params.checkInMethod);
      console.error('❌ 启动签到失败:', error);
      const errorMessage = error.response?.data?.message || error.message || `启动${methodName}签到失败`;
      message.error(errorMessage);
      throw error;
    }
  }

  /**
   * 结束签到会话
   */
  async endCheckIn(sessionId: string): Promise<void> {
    try {
      await request.patch(`/attendance/sessions/${sessionId}/end`);
      message.success('签到已结束');
    } catch (error) {
      message.error('结束签到失败');
      throw error;
    }
  }

  /**
   * 获取签到会话列表
   */
  async getSessions(courseId: string): Promise<CheckInSession[]> {
    try {
      const response = await request.get(`/attendance/sessions/${courseId}`);
      return response;
    } catch (error) {
      message.error('加载签到会话失败');
      throw error;
    }
  }

  /**
   * 获取今日活跃会话
   */
  async getTodayActiveSession(courseId: string): Promise<CheckInSession | null> {
    try {
      const response = await request.get(`/attendance/sessions/today/${courseId}`);
      return response;
    } catch (error) {
      // 今日无活跃会话，正常情况
      return null;
    }
  }

  /**
   * 获取签到统计数据
   */
  async getAttendanceStats(courseId: string) {
    try {
      const response = await request.get(`/attendance/stats/${courseId}`);
      return response;
    } catch (error) {
      message.error('加载考勤统计失败');
      throw error;
    }
  }

  /**
   * 更新学生考勤状态
   */
  async updateAttendanceRecord(sessionId: string, studentId: string, status: string) {
    try {
      await request.patch(`/attendance/records/${sessionId}/${studentId}`, { status });
      message.success('考勤状态更新成功');
    } catch (error) {
      message.error('更新考勤状态失败');
      throw error;
    }
  }

  /**
   * 导出考勤数据
   */
  async exportAttendanceData(courseId: string, format: 'excel' | 'csv' = 'excel', dateRange?: [string, string]) {
    try {
      const params: any = {
        format,
        includeStats: true
      };

      if (dateRange) {
        params.startDate = dateRange[0];
        params.endDate = dateRange[1];
      }

      const response = await request.get(`/attendance/export/${courseId}`, {
        params,
        responseType: 'blob'
      });

      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-${courseId}-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success('考勤数据导出成功');
    } catch (error) {
      message.error('导出考勤数据失败');
      throw error;
    }
  }

  /**
   * 获取签到方式的显示名称
   */
  private getMethodName(method: CheckInMethod): string {
    const methodNames = {
      [CheckInMethod.VERIFICATION_CODE]: '验证码',
      [CheckInMethod.QR_CODE]: '二维码', 
      [CheckInMethod.SEAT_MAP]: '座位图',
      [CheckInMethod.MANUAL]: '手动'
    };
    return methodNames[method] || '未知';
  }

  /**
   * 获取签到方式的图标
   */
  getMethodIcon(method: CheckInMethod): string {
    const methodIcons = {
      [CheckInMethod.VERIFICATION_CODE]: '🔢',
      [CheckInMethod.QR_CODE]: '📱',
      [CheckInMethod.SEAT_MAP]: '🪑',
      [CheckInMethod.MANUAL]: '✋'
    };
    return methodIcons[method] || '📝';
  }

  /**
   * 获取会话状态的显示名称和颜色
   */
  getSessionStatus(status: string) {
    const statusConfig = {
      scheduled: { text: '已安排', color: 'default' },
      active: { text: '进行中', color: 'processing' },
      closed: { text: '已结束', color: 'success' }
    };
    return statusConfig[status as keyof typeof statusConfig] || { text: status, color: 'default' };
  }
}

// 导出单例实例
export const attendanceService = new AttendanceService();
export default attendanceService;