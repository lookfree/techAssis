import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AttendanceService } from './attendance.service';
import { 
  StartSessionDto, 
  CheckInDto, 
  UpdateAttendanceDto 
} from './dto';
import { AttendanceStatus } from '@prisma/client';

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('sessions/:courseId/start')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '发起签到' })
  startSession(
    @Param('courseId') courseId: string,
    @Body() startSessionDto: StartSessionDto,
    @Request() req
  ) {
    const sessionData = {
      sessionNumber: parseInt(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }).replace(':', '')),
      checkInMethod: startSessionDto.checkInMethod,
      duration: startSessionDto.duration,
      verificationCode: startSessionDto.verificationCode,
      qrCode: startSessionDto.qrCode
    };
    return this.attendanceService.startSession(courseId, req.user.id, sessionData);
  }

  @Post('check-in/:courseId')
  @UseGuards(RolesGuard)
  @Roles('student')
  @ApiOperation({ summary: '学生签到' })
  checkIn(
    @Param('courseId') courseId: string,
    @Body() checkInDto: CheckInDto,
    @Request() req
  ) {
    const checkInData = {
      sessionNumber: parseInt(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }).replace(':', '')),
      checkInMethod: checkInDto.checkInMethod || 'verification_code' as any,
      verificationCode: checkInDto.verificationCode,
      seatNumber: checkInDto.seatNumber ? parseInt(checkInDto.seatNumber) : undefined,
      location: checkInDto.location,
      deviceInfo: req.headers['user-agent'],
      ipAddress: req.ip
    };
    return this.attendanceService.checkIn(courseId, req.user.id, checkInData);
  }

  @Post('code')
  @UseGuards(RolesGuard)
  @Roles('student')
  @ApiOperation({ summary: '验证码签到' })
  checkInWithCode(
    @Body() codeCheckInDto: { code: string; courseId: string },
    @Request() req
  ) {
    const checkInData = {
      sessionNumber: parseInt(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }).replace(':', '')),
      checkInMethod: 'verification_code' as any,
      verificationCode: codeCheckInDto.code,
      deviceInfo: req.headers['user-agent'],
      ipAddress: req.ip
    };
    return this.attendanceService.checkIn(codeCheckInDto.courseId, req.user.id, checkInData);
  }

  @Get('courses/:courseId')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '获取课程考勤记录' })
  @ApiQuery({ name: 'sessionNumber', required: false })
  @ApiQuery({ name: 'status', required: false, enum: AttendanceStatus })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  findByCourse(
    @Param('courseId') courseId: string,
    @Query('sessionNumber') sessionNumber?: string,
    @Query('status') status?: AttendanceStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const params: any = {};
    
    if (sessionNumber) {
      params.sessionNumber = parseInt(sessionNumber);
    }
    
    if (status) {
      params.status = status;
    }
    
    if (startDate) {
      params.startDate = new Date(startDate);
    }
    
    if (endDate) {
      params.endDate = new Date(endDate);
    }

    return this.attendanceService.findByCourse(courseId, params);
  }

  // 获取考勤会话列表
  @Get('sessions/:courseId')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '获取课程考勤会话列表' })
  async getSessions(
    @Param('courseId') courseId: string,
    @Request() req
  ) {
    const teacherId = req.user.role === 'teacher' ? req.user.id : undefined;
    
    // 根据考勤记录聚合生成会话数据
    const attendances = await this.attendanceService.findByCourse(courseId);
    
    // 按日期和节次分组
    const sessionsMap = new Map();
    attendances.forEach(attendance => {
      const key = `${attendance.sessionDate.toISOString().split('T')[0]}-${attendance.sessionNumber}`;
      if (!sessionsMap.has(key)) {
        sessionsMap.set(key, {
          id: `session-${key}`,
          courseId: attendance.courseId,
          sessionNumber: attendance.sessionNumber,
          sessionDate: attendance.sessionDate,
          status: 'closed', // 简化状态管理，已过期的都标记为closed
          checkInMethod: attendance.checkInMethod || 'manual',
          attendanceRecords: []
        });
      }
      sessionsMap.get(key).attendanceRecords.push(attendance);
    });
    
    return Array.from(sessionsMap.values()).sort((a, b) => 
      new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
    );
  }

  // 更新考勤记录状态（通过路径参数）
  @Patch('records/:sessionId/:studentId')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '更新考勤记录状态' })
  async updateAttendanceRecord(
    @Param('sessionId') sessionId: string,
    @Param('studentId') studentId: string,
    @Body() updateData: { status: string },
    @Request() req
  ) {
    // 从sessionId解析出课程ID和节次
    // sessionId格式: session-YYYY-MM-DD-sessionNumber
    const sessionParts = sessionId.replace('session-', '').split('-');
    if (sessionParts.length < 4) {
      throw new BadRequestException('Invalid session ID format');
    }
    
    const date = `${sessionParts[0]}-${sessionParts[1]}-${sessionParts[2]}`;
    const sessionNumber = parseInt(sessionParts[3]);
    
    // 通过学生ID、日期和节次查找考勤记录
    const attendances = await this.attendanceService.findByStudent(studentId);
    const attendance = attendances.find(a => 
      a.sessionNumber === sessionNumber &&
      a.sessionDate.toISOString().split('T')[0] === date
    );
    
    if (!attendance) {
      throw new BadRequestException('Attendance record not found');
    }
    
    return this.attendanceService.updateAttendance(
      attendance.id,
      req.user.id,
      { status: updateData.status as any }
    );
  }

  // 开始考勤会话
  @Patch('sessions/:sessionId/start')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '开始考勤会话' })
  startAttendanceSession(
    @Param('sessionId') sessionId: string,
    @Request() req
  ) {
    // 简化实现，返回成功状态
    return {
      success: true,
      message: '考勤已开始',
      sessionId
    };
  }

  // 结束考勤会话
  @Patch('sessions/:sessionId/end')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '结束考勤会话' })
  endAttendanceSession(
    @Param('sessionId') sessionId: string,
    @Request() req
  ) {
    // 简化实现，返回成功状态
    return {
      success: true,
      message: '考勤已结束',
      sessionId
    };
  }

  @Get('students/:studentId')
  @ApiOperation({ summary: '获取学生考勤记录' })
  findByStudent(
    @Param('studentId') studentId: string,
    @Query('courseId') courseId?: string,
    @Request() req?
  ) {
    // 学生只能查看自己的记录
    if (req?.user?.role === 'student' && req.user.id !== studentId) {
      throw new BadRequestException('无权查看他人考勤记录');
    }

    return this.attendanceService.findByStudent(studentId, courseId);
  }

  @Get('my-attendance')
  @UseGuards(RolesGuard)
  @Roles('student')
  @ApiOperation({ summary: '获取我的考勤记录' })
  getMyAttendance(@Request() req, @Query('courseId') courseId?: string) {
    return this.attendanceService.findByStudent(req.user.id, courseId);
  }

  @Patch(':attendanceId')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '教师修改考勤状态' })
  updateAttendance(
    @Param('attendanceId') attendanceId: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
    @Request() req
  ) {
    const teacherId = req.user.role === 'teacher' ? req.user.id : undefined;
    return this.attendanceService.updateAttendance(
      attendanceId,
      teacherId,
      updateAttendanceDto
    );
  }

  @Get('stats/:courseId')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '获取课程考勤统计' })
  getAttendanceStats(@Param('courseId') courseId: string, @Request() req) {
    const teacherId = req.user.role === 'teacher' ? req.user.id : undefined;
    return this.attendanceService.getAttendanceStats(courseId, teacherId);
  }

  @Get('export/:courseId')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '导出考勤数据' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv', 'excel'] })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'includeStats', required: false })
  exportAttendance(
    @Param('courseId') courseId: string,
    @Request() req: any,
    @Query('format') format: 'json' | 'csv' | 'excel' = 'json',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('includeStats') includeStats?: string
  ) {
    const teacherId = req.user.role === 'teacher' ? req.user.id : undefined;
    const exportOptions = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      includeStats: includeStats === 'true'
    };
    return this.attendanceService.exportAttendance(courseId, teacherId, format, exportOptions);
  }

  @Get('student')
  @UseGuards(RolesGuard)
  @Roles('student')
  @ApiOperation({ summary: '学生获取自己的签到记录' })
  getStudentAttendance(@Request() req, @Query('courseId') courseId?: string) {
    return this.attendanceService.findByStudent(req.user.id, courseId);
  }

  @Get('sessions/today/:courseId')
  @UseGuards(RolesGuard)
  @Roles('student', 'teacher')
  @ApiOperation({ summary: '获取今日签到会话' })
  getTodaySession(@Param('courseId') courseId: string) {
    return this.attendanceService.getTodaySession(courseId);
  }

  @Get('sessions/:sessionId')
  @UseGuards(RolesGuard)
  @Roles('student', 'teacher')
  @ApiOperation({ summary: '获取签到会话信息' })
  getSession(@Param('sessionId') sessionId: string) {
    return this.attendanceService.getSession(sessionId);
  }

  @Post('batch-update')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '批量修改考勤状态' })
  batchUpdateAttendance(
    @Body() batchUpdateDto: {
      attendanceIds: string[];
      status: AttendanceStatus;
      notes?: string;
    },
    @Request() req
  ) {
    const teacherId = req.user.role === 'teacher' ? req.user.id : undefined;
    return this.attendanceService.batchUpdateAttendance(
      batchUpdateDto.attendanceIds,
      teacherId,
      { status: batchUpdateDto.status, notes: batchUpdateDto.notes }
    );
  }

  @Post('manual-checkin')
  @UseGuards(RolesGuard) 
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '教师手动签到学生' })
  manualCheckIn(
    @Body() manualCheckInDto: {
      courseId: string;
      studentId: string;
      sessionNumber: number;
      status: AttendanceStatus;
      notes?: string;
    },
    @Request() req
  ) {
    const teacherId = req.user.role === 'teacher' ? req.user.id : undefined;
    return this.attendanceService.manualCheckIn(
      manualCheckInDto.courseId,
      manualCheckInDto.studentId,
      manualCheckInDto.sessionNumber,
      teacherId,
      { 
        status: manualCheckInDto.status, 
        notes: manualCheckInDto.notes 
      }
    );
  }

  @Get('session-summary/:courseId/:sessionNumber')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin') 
  @ApiOperation({ summary: '获取单次课堂考勤摘要' })
  getSessionSummary(
    @Param('courseId') courseId: string,
    @Param('sessionNumber') sessionNumber: string,
    @Request() req
  ) {
    const teacherId = req.user.role === 'teacher' ? req.user.id : undefined;
    return this.attendanceService.getSessionSummary(
      courseId, 
      parseInt(sessionNumber), 
      teacherId
    );
  }
}