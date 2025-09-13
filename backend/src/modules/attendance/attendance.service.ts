import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Attendance, AttendanceStatus, Prisma } from '@prisma/client';

// CheckInMethod 枚举已移除，使用字符串
export type CheckInMethod = 'qr_code' | 'verification_code' | 'seat_selection' | 'manual' | 'face_recognition';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  // 教师发起签到
  async startSession(courseId: string, teacherId: string, sessionData: {
    sessionNumber: number;
    checkInMethod: CheckInMethod;
    duration?: number; // 签到时长（分钟）
    location?: any;
    verificationCode?: string;
    qrCode?: string;
  }) {
    // 验证教师权限
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true, name: true }
    });

    if (!course) {
      throw new NotFoundException('课程不存在');
    }

    if (course.teacherId !== teacherId) {
      throw new ForbiddenException('无权管理此课程考勤');
    }

    // 检查是否已有同节次的AttendanceSession
    const today = new Date();
    const sessionDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const timeSlot = `${sessionData.sessionNumber || 1}`; // 将sessionNumber转换为timeSlot字符串
    
    const existingAttendanceSession = await this.prisma.attendanceSession.findFirst({
      where: {
        courseId,
        sessionDate,
        timeSlot
      }
    });

    if (existingAttendanceSession) {
      throw new BadRequestException('该节次签到会话已存在');
    }

    // 获取选课学生列表
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        courseId,
        status: 'active'
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true
          }
        }
      }
    });

    // 🔧 关键修复：先创建AttendanceSession记录，需要设置默认教室ID
    // 为了座位签到，需要有一个默认的教室ID，这里先用一个固定的教室
    const defaultClassroomId = 'classroom-default-001';
    
    // 尝试查找现有教室或创建一个默认教室
    let classroom = await this.prisma.classroom.findFirst({
      where: { name: 'A101 - 阶梯教室' }
    });
    
    if (!classroom) {
      // 创建默认教室
      classroom = await this.prisma.classroom.create({
        data: {
          name: 'A101 - 阶梯教室',
          capacity: 100,
          rows: 10,
          seatsPerRow: 10,
          type: 'lecture_hall',
          layout: 'standard',
          seatMapEnabled: true,
          freeSeatingEnabled: true,
          location: '教学楼A栋',
          building: 'A',
          room: '101'
        }
      });
      
      // 初始化座位图
      await this.initializeSeatMapForClassroom(classroom.id, classroom.rows, classroom.seatsPerRow);
    }

    const attendanceSession = await this.prisma.attendanceSession.create({
      data: {
        courseId,
        classroomId: classroom.id, // 🔧 关键修复：设置教室ID
        sessionDate,
        timeSlot,
        sessionNumber: timeSlot,
        status: 'active',
        method: sessionData.checkInMethod as any, // 映射到CheckInMethod枚举
        totalStudents: enrollments.length,
        checkedInStudents: 0,
        startTime: new Date(),
        autoCloseMinutes: sessionData.duration || 30,
        verificationCode: sessionData.verificationCode,
        qrCode: sessionData.qrCode,
      }
    });

    // 为所有学生创建考勤记录（默认缺勤）
    const attendanceRecords = await Promise.all(
      enrollments.map(enrollment =>
        this.prisma.attendance.create({
          data: {
            studentId: enrollment.studentId,
            courseId,
            sessionDate: new Date(),
            sessionNumber: sessionData.sessionNumber,
            status: AttendanceStatus.absent,
            checkInMethod: sessionData.checkInMethod,
            location: sessionData.location,
          }
        })
      )
    );

    return {
      session: {
        id: attendanceSession.id, // 返回AttendanceSession的ID
        courseId: attendanceSession.courseId,
        sessionNumber: sessionData.sessionNumber,
        sessionDate: attendanceSession.sessionDate,
        timeSlot: attendanceSession.timeSlot,
        checkInMethod: sessionData.checkInMethod,
        startTime: attendanceSession.startTime,
        duration: sessionData.duration || 30,
        verificationCode: sessionData.verificationCode,
        qrCode: sessionData.qrCode,
        status: 'active',
        studentsCount: enrollments.length,
        checkedInCount: 0
      },
      studentsCount: enrollments.length,
      message: '签到已启动'
    };
  }

  // 学生签到
  async checkIn(courseId: string, studentId: string, checkInData: {
    sessionNumber: number;
    checkInMethod: CheckInMethod;
    verificationCode?: string;
    location?: any;
    seatNumber?: number;
    deviceInfo?: string;
    ipAddress?: string;
  }) {
    // 验证学生是否选了此课
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId
        }
      },
      include: {
        course: {
          select: {
            name: true,
            teacher: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!enrollment) {
      throw new ForbiddenException('您未选择此课程');
    }

    // 查找考勤记录
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const attendance = await this.prisma.attendance.findFirst({
      where: {
        studentId,
        courseId,
        sessionNumber: checkInData.sessionNumber,
        sessionDate: {
          gte: todayDate,
          lt: new Date(todayDate.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    if (!attendance) {
      throw new NotFoundException('签到记录不存在');
    }

    if (attendance.status === AttendanceStatus.present) {
      throw new BadRequestException('您已完成签到');
    }

    // 检查签到时间（是否在允许时间内）
    const now = new Date();
    const sessionStart = attendance.sessionDate;
    const timeDiff = (now.getTime() - sessionStart.getTime()) / (1000 * 60); // 分钟

    let status: AttendanceStatus = AttendanceStatus.present;
    if (timeDiff > 15) { // 超过15分钟算迟到
      status = AttendanceStatus.late;
    }
    if (timeDiff > 60) { // 超过60分钟不允许签到
      throw new BadRequestException('签到时间已过');
    }

    // 更新考勤记录
    const updatedAttendance = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        status,
        checkInTime: now,
        checkInMethod: checkInData.checkInMethod,
        location: checkInData.location,
        seatNumber: checkInData.seatNumber,
        deviceInfo: checkInData.deviceInfo,
        ipAddress: checkInData.ipAddress,
        notes: status === AttendanceStatus.late ? '迟到' : null
      }
    });

    return {
      success: true,
      status,
      message: status === AttendanceStatus.late ? '签到成功（迟到）' : '签到成功',
      attendance: updatedAttendance
    };
  }

  // 获取课程考勤列表
  async findByCourse(courseId: string, params?: {
    sessionNumber?: number;
    startDate?: Date;
    endDate?: Date;
    status?: AttendanceStatus;
  }) {
    const { sessionNumber, startDate, endDate, status } = params || {};
    
    let where: Prisma.AttendanceWhereInput = { courseId };
    
    if (sessionNumber) {
      where.sessionNumber = sessionNumber;
    }
    
    if (startDate && endDate) {
      where.sessionDate = {
        gte: startDate,
        lte: endDate
      };
    }
    
    if (status) {
      where.status = status;
    }

    const attendances = await this.prisma.attendance.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true,
            avatar: true
          }
        }
      },
      orderBy: [
        { sessionNumber: 'desc' },
        { student: { studentId: 'asc' } }
      ]
    });

    return attendances;
  }

  // 获取学生考勤记录
  async findByStudent(studentId: string, courseId?: string) {
    let where: Prisma.AttendanceWhereInput = { studentId };
    
    if (courseId) {
      where.courseId = courseId;
    }

    const attendances = await this.prisma.attendance.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            name: true,
            courseCode: true,
            teacher: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: [
        { sessionDate: 'desc' }
      ]
    });

    return attendances;
  }

  // 教师手动考勤（修改学生状态）
  async updateAttendance(
    attendanceId: string, 
    teacherId: string, 
    updateData: {
      status: AttendanceStatus;
      notes?: string;
    }
  ) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        course: {
          select: {
            teacherId: true
          }
        }
      }
    });

    if (!attendance) {
      throw new NotFoundException('考勤记录不存在');
    }

    if (attendance.course.teacherId !== teacherId) {
      throw new ForbiddenException('无权修改此考勤记录');
    }

    return this.prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        status: updateData.status,
        notes: updateData.notes
      }
    });
  }

  // 获取考勤统计
  async getAttendanceStats(courseId: string, teacherId?: string) {
    // 权限检查
    if (teacherId) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true }
      });

      if (!course || course.teacherId !== teacherId) {
        throw new ForbiddenException('无权查看此课程考勤统计');
      }
    }

    const [
      totalSessions,
      totalStudents,
      statusStats,
      recentSessions,
      studentAttendanceRates
    ] = await Promise.all([
      // 总课次
      this.prisma.attendance.groupBy({
        by: ['sessionNumber'],
        where: { courseId }
      }).then(result => result.length),

      // 选课学生数
      this.prisma.enrollment.count({
        where: { courseId, status: 'active' }
      }),

      // 各状态统计
      this.prisma.attendance.groupBy({
        by: ['status'],
        where: { courseId },
        _count: { status: true }
      }),

      // 最近几次考勤详情
      this.prisma.attendance.findMany({
        where: { courseId },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentId: true
            }
          }
        },
        orderBy: [
          { sessionDate: 'desc' },
          { sessionNumber: 'desc' }
        ],
        take: 50
      }),

      // 学生出勤率统计
      this.prisma.attendance.groupBy({
        by: ['studentId'],
        where: { courseId },
        _count: { status: true }
      }).then(async (results) => {
        const studentStats = await Promise.all(
          results.map(async (result) => {
            const presentCount = await this.prisma.attendance.count({
              where: {
                courseId,
                studentId: result.studentId,
                status: { in: ['present', 'late'] }
              }
            });
            
            const student = await this.prisma.user.findUnique({
              where: { id: result.studentId },
              select: { id: true, firstName: true, lastName: true, studentId: true }
            });

            return {
              student,
              totalSessions: result._count.status,
              presentCount,
              attendanceRate: result._count.status > 0 ? 
                Math.round((presentCount / result._count.status) * 10000) / 100 : 0
            };
          })
        );
        return studentStats.sort((a, b) => b.attendanceRate - a.attendanceRate);
      })
    ]);

    // 计算整体出勤率
    const presentCount = statusStats.find(s => s.status === 'present')?._count.status || 0;
    const lateCount = statusStats.find(s => s.status === 'late')?._count.status || 0;
    const totalRecords = statusStats.reduce((sum, s) => sum + s._count.status, 0);
    
    const attendanceRate = totalRecords > 0 ? 
      ((presentCount + lateCount) / totalRecords) * 100 : 0;

    // 按会话分组统计
    const sessionStats = this.groupAttendanceBySession(recentSessions);

    return {
      totalSessions,
      totalStudents,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      statusStats: statusStats.map(s => ({
        status: s.status,
        count: s._count.status,
        percentage: Math.round((s._count.status / totalRecords) * 10000) / 100
      })),
      sessionStats,
      studentAttendanceRates,
      trends: await this.getAttendanceTrends(courseId)
    };
  }

  // 按会话分组统计
  private groupAttendanceBySession(attendances: any[]) {
    const grouped = attendances.reduce((acc, attendance) => {
      const key = `${attendance.sessionDate.toISOString().split('T')[0]}-${attendance.sessionNumber}`;
      if (!acc[key]) {
        acc[key] = {
          sessionDate: attendance.sessionDate,
          sessionNumber: attendance.sessionNumber,
          present: 0,
          late: 0,
          absent: 0,
          excused: 0,
          total: 0
        };
      }
      acc[key][attendance.status]++;
      acc[key].total++;
      return acc;
    }, {});

    return Object.values(grouped).sort((a: any, b: any) => 
      new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
    );
  }

  // 获取考勤趋势
  private async getAttendanceTrends(courseId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trends = await this.prisma.attendance.groupBy({
      by: ['sessionDate', 'status'],
      where: {
        courseId,
        sessionDate: {
          gte: thirtyDaysAgo
        }
      },
      _count: { status: true },
      orderBy: { sessionDate: 'asc' }
    });

    return trends.map(trend => ({
      date: trend.sessionDate.toISOString().split('T')[0],
      status: trend.status,
      count: trend._count.status
    }));
  }

  // 导出考勤数据
  async exportAttendance(
    courseId: string, 
    teacherId?: string, 
    format: 'json' | 'csv' | 'excel' = 'json',
    options?: {
      startDate?: Date;
      endDate?: Date;
      includeStats?: boolean;
    }
  ) {
    // 权限检查
    if (teacherId) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true, name: true, courseCode: true }
      });

      if (!course || course.teacherId !== teacherId) {
        throw new ForbiddenException('无权导出此课程考勤数据');
      }
    }

    // 构建查询条件
    let whereCondition: any = { courseId };
    if (options?.startDate && options?.endDate) {
      whereCondition.sessionDate = {
        gte: options.startDate,
        lte: options.endDate
      };
    }

    const attendances = await this.prisma.attendance.findMany({
      where: whereCondition,
      include: {
        student: {
          select: {
            studentId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        course: {
          select: {
            name: true,
            courseCode: true,
            credits: true,
            teacher: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: [
        { sessionDate: 'asc' },
        { sessionNumber: 'asc' },
        { student: { studentId: 'asc' } }
      ]
    });

    const courseInfo = attendances[0]?.course;

    // 如果包含统计信息
    let stats = null;
    if (options?.includeStats) {
      stats = await this.getAttendanceStats(courseId, teacherId);
    }

    if (format === 'json') {
      return {
        exportTime: new Date(),
        course: courseInfo,
        stats,
        totalRecords: attendances.length,
        data: attendances
      };
    }

    // CSV/Excel 通用数据格式
    const exportData = attendances.map(a => ({
      学号: a.student.studentId,
      姓名: `${a.student.firstName}${a.student.lastName}`,
      邮箱: a.student.email || '',
      手机: a.student.phone || '',
      课程: courseInfo?.name || '',
      课程代码: courseInfo?.courseCode || '',
      学分: courseInfo?.credits || '',
      教师: courseInfo?.teacher ? `${courseInfo.teacher.firstName}${courseInfo.teacher.lastName}` : '',
      节次: a.sessionNumber,
      日期: a.sessionDate.toLocaleDateString('zh-CN'),
      星期: this.getWeekDay(a.sessionDate),
      状态: this.getStatusText(a.status),
      签到时间: a.checkInTime?.toLocaleString('zh-CN') || '',
      签到方式: this.getCheckInMethodText(a.checkInMethod),
      座位号: a.seatNumber || '',
      IP地址: a.ipAddress || '',
      设备信息: a.deviceInfo || '',
      备注: a.notes || ''
    }));

    if (format === 'csv') {
      return exportData;
    }

    // Excel 格式（包含多个工作表）
    if (format === 'excel') {
      const workbook = {
        考勤明细: exportData,
        ...(stats && {
          统计汇总: [
            { 项目: '课程名称', 数值: courseInfo?.name || '' },
            { 项目: '课程代码', 数值: courseInfo?.courseCode || '' },
            { 项目: '总课次', 数值: stats.totalSessions },
            { 项目: '选课学生数', 数值: stats.totalStudents },
            { 项目: '整体出勤率(%)', 数值: stats.attendanceRate },
            ...stats.statusStats.map(s => ({
              项目: this.getStatusText(s.status as AttendanceStatus),
              数值: `${s.count} (${s.percentage}%)`
            }))
          ],
          学生出勤率: stats.studentAttendanceRates?.map(s => ({
            学号: s.student?.studentId || '',
            姓名: s.student ? `${s.student.firstName}${s.student.lastName}` : '',
            总课次: s.totalSessions,
            出勤次数: s.presentCount,
            出勤率: `${s.attendanceRate}%`
          })) || []
        })
      };

      return workbook;
    }

    return exportData;
  }

  private getWeekDay(date: Date): string {
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    return `星期${weekDays[date.getDay()]}`;
  }

  private getStatusText(status: AttendanceStatus): string {
    const statusMap = {
      present: '出勤',
      late: '迟到',
      absent: '缺勤',
      excused: '请假'
    };
    return statusMap[status] || status;
  }

  private getCheckInMethodText(checkInMethod: string | null): string {
    if (!checkInMethod) return '';
    
    const methodMap = {
      qr_code: '二维码',
      verification_code: '验证码',
      seat_selection: '选座',
      manual: '手动',
      face_recognition: '人脸识别'
    };
    return methodMap[checkInMethod] || checkInMethod;
  }

  // 获取今日签到会话
  async getTodaySession(courseId: string) {
    const today = new Date();
    const sessionDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    // 🔧 修复：查找AttendanceSession表而不是Attendance表
    const attendanceSession = await this.prisma.attendanceSession.findFirst({
      where: {
        courseId,
        sessionDate,
        status: 'active' // 只返回活跃的会话
      },
      include: {
        course: {
          select: {
            name: true,
            teacher: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!attendanceSession) {
      return null;
    }

    return {
      id: attendanceSession.id, // AttendanceSession的ID
      courseId: attendanceSession.courseId,
      sessionNumber: parseInt(attendanceSession.sessionNumber || '1'),
      sessionDate: attendanceSession.sessionDate,
      timeSlot: attendanceSession.timeSlot,
      checkInMethod: attendanceSession.method,
      status: attendanceSession.status,
      course: attendanceSession.course,
      totalStudents: attendanceSession.totalStudents,
      checkedInStudents: attendanceSession.checkedInStudents,
      startTime: attendanceSession.startTime
    };
  }

  // 获取签到会话信息
  async getSession(sessionId: string) {
    // 🔧 修复：查找AttendanceSession表而不是Attendance表
    const attendanceSession = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        course: {
          select: {
            name: true,
            teacher: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!attendanceSession) {
      throw new NotFoundException(`签到会话不存在。查找的SessionID: ${sessionId}。请检查该签到会话是否存在于 AttendanceSession 表中。`);
    }

    return {
      id: attendanceSession.id,
      courseId: attendanceSession.courseId,
      sessionNumber: parseInt(attendanceSession.sessionNumber || '1'),
      sessionDate: attendanceSession.sessionDate,
      timeSlot: attendanceSession.timeSlot,
      checkInMethod: attendanceSession.method,
      status: attendanceSession.status,
      course: attendanceSession.course,
      totalStudents: attendanceSession.totalStudents,
      checkedInStudents: attendanceSession.checkedInStudents,
      startTime: attendanceSession.startTime
    };
  }

  // 批量修改考勤状态
  async batchUpdateAttendance(
    attendanceIds: string[],
    teacherId: string,
    updateData: {
      status: AttendanceStatus;
      notes?: string;
    }
  ) {
    // 验证权限
    const attendances = await this.prisma.attendance.findMany({
      where: { 
        id: { in: attendanceIds },
      },
      include: {
        course: {
          select: { teacherId: true }
        }
      }
    });

    // 检查权限
    for (const attendance of attendances) {
      if (attendance.course.teacherId !== teacherId) {
        throw new ForbiddenException('无权修改此考勤记录');
      }
    }

    // 批量更新
    const result = await this.prisma.attendance.updateMany({
      where: { id: { in: attendanceIds } },
      data: {
        status: updateData.status,
        notes: updateData.notes,
        updatedAt: new Date()
      }
    });

    return {
      success: true,
      updatedCount: result.count,
      message: `成功更新 ${result.count} 条考勤记录`
    };
  }

  // 教师手动签到学生
  async manualCheckIn(
    courseId: string,
    studentId: string,
    sessionNumber: number,
    teacherId: string,
    checkInData: {
      status: AttendanceStatus;
      notes?: string;
    }
  ) {
    // 验证权限
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true }
    });

    if (!course || course.teacherId !== teacherId) {
      throw new ForbiddenException('无权为此课程手动签到');
    }

    // 查找考勤记录
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await this.prisma.attendance.findFirst({
      where: {
        courseId,
        studentId,
        sessionNumber,
        sessionDate: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    if (!attendance) {
      throw new NotFoundException('考勤记录不存在');
    }

    const updatedAttendance = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        status: checkInData.status,
        checkInTime: new Date(),
        checkInMethod: 'manual',
        notes: checkInData.notes || '教师手动签到',
        updatedAt: new Date()
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            studentId: true
          }
        }
      }
    });

    return {
      success: true,
      message: `已为学生 ${updatedAttendance.student.firstName}${updatedAttendance.student.lastName} 手动签到`,
      attendance: updatedAttendance
    };
  }

  // 获取单次课堂考勤摘要
  async getSessionSummary(courseId: string, sessionNumber: number, teacherId?: string) {
    // 权限检查
    if (teacherId) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true }
      });

      if (!course || course.teacherId !== teacherId) {
        throw new ForbiddenException('无权查看此课程考勤');
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        courseId,
        sessionNumber,
        sessionDate: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true,
            avatar: true
          }
        }
      },
      orderBy: {
        student: { studentId: 'asc' }
      }
    });

    if (attendances.length === 0) {
      throw new NotFoundException('该节次考勤记录不存在');
    }

    // 统计
    const stats = {
      present: attendances.filter(a => a.status === 'present').length,
      late: attendances.filter(a => a.status === 'late').length,
      absent: attendances.filter(a => a.status === 'absent').length,
      excused: attendances.filter(a => a.status === 'excused').length,
      total: attendances.length
    };

    const attendanceRate = stats.total > 0 ? 
      ((stats.present + stats.late) / stats.total) * 100 : 0;

    return {
      courseId,
      sessionNumber,
      sessionDate: attendances[0].sessionDate,
      stats,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      attendances,
      summary: {
        totalStudents: stats.total,
        checkedInStudents: stats.present + stats.late,
        notCheckedIn: stats.absent,
        excusedStudents: stats.excused
      }
    };
  }

  // 查找或创建学生当前课程考勤记录
  async findOrCreateCurrentAttendanceRecord(studentId: string, courseId: string) {
    // 验证学生和课程的存在以及学生是否已注册该课程
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId
        }
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true
          }
        },
        course: {
          select: {
            id: true,
            name: true,
            courseCode: true,
            teacher: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!enrollment) {
      throw new NotFoundException('学生未注册此课程或课程不存在');
    }

    // 查找当前活跃的考勤会话 (今天的最新会话)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // 首先尝试查找现有的考勤记录
    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        studentId,
        courseId,
        sessionDate: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            courseCode: true,
            teacher: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true
          }
        }
      },
      orderBy: {
        sessionNumber: 'desc'
      }
    });

    if (existingAttendance) {
      return existingAttendance;
    }

    // 如果没有找到现有记录，查找今天是否有任何考勤会话
    const anyTodayAttendance = await this.prisma.attendance.findFirst({
      where: {
        courseId,
        sessionDate: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: {
        sessionNumber: 'desc'
      }
    });

    // 确定会话号码
    let sessionNumber = 1; // 默认会话号
    if (anyTodayAttendance) {
      sessionNumber = anyTodayAttendance.sessionNumber;
    } else {
      // 如果今天没有任何考勤会话，生成一个基于时间的会话号
      const now = new Date();
      sessionNumber = parseInt(now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      }).replace(':', ''));
    }

    // 如果没有找到现有记录且没有活跃会话，抛出异常
    if (!anyTodayAttendance) {
      throw new NotFoundException('未找到当前课程的活跃考勤会话');
    }

    // 创建新的考勤记录
    const newAttendance = await this.prisma.attendance.create({
      data: {
        studentId,
        courseId,
        sessionDate: today,
        sessionNumber,
        status: 'absent', // 默认状态为缺席
        checkInMethod: 'manual'
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            courseCode: true,
            teacher: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true
          }
        }
      }
    });

    return newAttendance;
  }

  // 辅助方法：初始化教室座位图
  private async initializeSeatMapForClassroom(classroomId: string, rows: number, seatsPerRow: number) {
    const seats: any[] = [];
    
    for (let row = 1; row <= rows; row++) {
      for (let col = 1; col <= seatsPerRow; col++) {
        const seatNumber = `${String.fromCharCode(64 + row)}${col.toString().padStart(2, '0')}`;
        seats.push({
          classroomId,
          seatNumber,
          row,
          column: col,
          status: 'available',
          seatType: 'regular',
        });
      }
    }
    
    // 批量创建座位
    await this.prisma.seatMap.createMany({
      data: seats,
      skipDuplicates: true
    });
  }
}