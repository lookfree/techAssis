import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Inject, forwardRef } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClassroomsService } from './classrooms.service';
import { LoggerService } from '../../common/logger/logger.service';

interface SeatUpdateData {
  classroomId: string;
  sessionDate: string;
  timeSlot?: string;
  seatId: string;
  studentId?: string;
  status: string;
  attendanceConfirmed?: boolean;
}

interface ClassroomStatusData {
  classroomId: string;
  status: 'active' | 'inactive' | 'break';
  currentSession?: any;
  onlineCount?: number;
}

@WebSocketGateway({
  namespace: 'classrooms',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ClassroomsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private classroomSessions: Map<string, Set<string>> = new Map();
  private userSockets: Map<string, string> = new Map();

  constructor(
    @Inject(forwardRef(() => ClassroomsService))
    private readonly classroomsService: ClassroomsService,
    private readonly logger: LoggerService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Classrooms WebSocket Gateway initialized', 'ClassroomsGateway');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`, 'ClassroomsGateway');
    
    // 从handshake中获取用户信息
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.userSockets.set(userId, client.id);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`, 'ClassroomsGateway');
    
    // 清理用户socket映射
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }

    // 从所有教室会话中移除
    this.classroomSessions.forEach((sockets, roomId) => {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.classroomSessions.delete(roomId);
      }
    });
  }

  // 加入教室会话
  @SubscribeMessage('join_classroom')
  async handleJoinClassroom(
    @MessageBody() data: { classroomId: string; sessionDate: string; timeSlot?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = `${data.classroomId}-${data.sessionDate}-${data.timeSlot || 'default'}`;
    
    // 加入Socket.IO房间
    await client.join(roomId);
    
    // 记录会话
    if (!this.classroomSessions.has(roomId)) {
      this.classroomSessions.set(roomId, new Set());
    }
    this.classroomSessions.get(roomId)?.add(client.id);

    this.logger.log(`Client ${client.id} joined classroom ${roomId}`, 'ClassroomsGateway');

    // 发送当前座位图状态
    try {
      const seatMap = await this.classroomsService.getSeatMap(
        data.classroomId,
        data.sessionDate,
        data.timeSlot,
      );
      client.emit('seat_map_initial', seatMap);
    } catch (error) {
      this.logger.error('Failed to get seat map', error.message, 'ClassroomsGateway');
    }

    // 广播在线人数
    this.broadcastOnlineCount(roomId);
  }

  // 离开教室会话
  @SubscribeMessage('leave_classroom')
  async handleLeaveClassroom(
    @MessageBody() data: { classroomId: string; sessionDate: string; timeSlot?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = `${data.classroomId}-${data.sessionDate}-${data.timeSlot || 'default'}`;
    
    // 离开Socket.IO房间
    await client.leave(roomId);
    
    // 从会话中移除
    this.classroomSessions.get(roomId)?.delete(client.id);
    
    this.logger.log(`Client ${client.id} left classroom ${roomId}`, 'ClassroomsGateway');
    
    // 广播在线人数
    this.broadcastOnlineCount(roomId);
  }

  // 座位选择事件
  @SubscribeMessage('select_seat')
  async handleSelectSeat(
    @MessageBody() data: SeatUpdateData,
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = `${data.classroomId}-${data.sessionDate}-${data.timeSlot || 'default'}`;
    
    this.logger.log(
      `Seat ${data.seatId} selected by ${data.studentId} in ${roomId}`,
      'ClassroomsGateway',
    );

    // 广播座位更新给房间内所有用户
    this.server.to(roomId).emit('seat_map_update', {
      ...data,
      timestamp: new Date(),
    });

    // 如果是签到确认，发送确认通知
    if (data.attendanceConfirmed) {
      this.server.to(roomId).emit('attendance_confirmed', {
        studentId: data.studentId,
        seatId: data.seatId,
        timestamp: new Date(),
      });
    }
  }

  // 批量座位更新
  @SubscribeMessage('update_seats_batch')
  async handleUpdateSeatsBatch(
    @MessageBody() data: { 
      classroomId: string; 
      sessionDate: string; 
      timeSlot?: string;
      updates: SeatUpdateData[] 
    },
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = `${data.classroomId}-${data.sessionDate}-${data.timeSlot || 'default'}`;
    
    this.logger.log(
      `Batch updating ${data.updates.length} seats in ${roomId}`,
      'ClassroomsGateway',
    );

    // 广播批量更新
    this.server.to(roomId).emit('seat_map_batch_update', {
      updates: data.updates,
      timestamp: new Date(),
    });
  }

  // 教室状态更新
  @SubscribeMessage('update_classroom_status')
  async handleUpdateClassroomStatus(
    @MessageBody() data: ClassroomStatusData,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Classroom ${data.classroomId} status updated to ${data.status}`,
      'ClassroomsGateway',
    );

    // 广播给所有相关用户
    this.server.emit('classroom_status_update', data);
  }

  // 开始上课事件
  @SubscribeMessage('start_class')
  async handleStartClass(
    @MessageBody() data: { 
      classroomId: string; 
      courseId: string;
      sessionDate: string; 
      timeSlot?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = `${data.classroomId}-${data.sessionDate}-${data.timeSlot || 'default'}`;
    
    this.logger.log(
      `Class started in classroom ${data.classroomId}`,
      'ClassroomsGateway',
    );

    // 广播上课开始事件
    this.server.to(roomId).emit('class_started', {
      ...data,
      timestamp: new Date(),
    });

    // 发送推送通知给相关学生
    this.notifyStudents(data.courseId, 'class_started', {
      message: '课程已开始，请尽快签到',
      classroomId: data.classroomId,
    });
  }

  // 结束上课事件
  @SubscribeMessage('end_class')
  async handleEndClass(
    @MessageBody() data: { 
      classroomId: string; 
      courseId: string;
      sessionDate: string; 
      timeSlot?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = `${data.classroomId}-${data.sessionDate}-${data.timeSlot || 'default'}`;
    
    this.logger.log(
      `Class ended in classroom ${data.classroomId}`,
      'ClassroomsGateway',
    );

    // 广播上课结束事件
    this.server.to(roomId).emit('class_ended', {
      ...data,
      timestamp: new Date(),
    });
  }

  // 实时签到统计
  @SubscribeMessage('get_attendance_stats')
  async handleGetAttendanceStats(
    @MessageBody() data: { 
      classroomId: string; 
      sessionDate: string; 
      timeSlot?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = `${data.classroomId}-${data.sessionDate}-${data.timeSlot || 'default'}`;
    
    try {
      const seatMap = await this.classroomsService.getSeatMap(
        data.classroomId,
        data.sessionDate,
        data.timeSlot,
      );

      const stats = {
        total: seatMap.seats.length,
        occupied: seatMap.seats.filter((s: any) => s.status === 'occupied').length,
        available: seatMap.seats.filter((s: any) => s.status === 'available').length,
        confirmed: seatMap.seats.filter((s: any) => s.attendanceConfirmed).length,
        onlineCount: this.classroomSessions.get(roomId)?.size || 0,
      };

      client.emit('attendance_stats', stats);
    } catch (error) {
      this.logger.error('Failed to get attendance stats', error.message, 'ClassroomsGateway');
    }
  }

  // 辅助方法：广播在线人数
  private broadcastOnlineCount(roomId: string) {
    const onlineCount = this.classroomSessions.get(roomId)?.size || 0;
    this.server.to(roomId).emit('online_count_update', {
      roomId,
      count: onlineCount,
      timestamp: new Date(),
    });
  }

  // 辅助方法：通知学生
  private async notifyStudents(courseId: string, event: string, data: any) {
    // 这里可以集成推送通知服务
    // 暂时只通过WebSocket发送
    this.server.emit(`course_${courseId}_${event}`, data);
  }

  // 公共方法：供其他服务调用的座位更新广播
  public broadcastSeatUpdate(data: SeatUpdateData) {
    const roomId = `${data.classroomId}-${data.sessionDate}-${data.timeSlot || 'default'}`;
    this.server.to(roomId).emit('seat_map_update', {
      ...data,
      timestamp: new Date(),
    });
  }

  // 公共方法：广播教室状态
  public broadcastClassroomStatus(data: ClassroomStatusData) {
    this.server.emit('classroom_status_update', data);
  }
}