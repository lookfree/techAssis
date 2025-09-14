import { Injectable, NotFoundException, ConflictException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassroomDto, UpdateClassroomDto, StartClassDto, SeatSelectionDto, CreateClassroomBookingDto } from './dto';
import { LoggerService } from '../../common/logger/logger.service';
import { ClassroomTemplateService } from './classroom-template.service';
import { ClassroomBookingService } from './classroom-booking.service';
import { ClassroomsGateway } from './classrooms.gateway';
import { ClassroomType, SeatStatus, SeatType } from '@prisma/client';

@Injectable()
export class ClassroomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly templateService: ClassroomTemplateService,
    private readonly bookingService: ClassroomBookingService,
    @Inject(forwardRef(() => ClassroomsGateway))
    private readonly classroomsGateway: ClassroomsGateway,
  ) {}

  async create(createClassroomDto: CreateClassroomDto) {
    this.logger.log('Creating new classroom', 'ClassroomsService');
    
    try {
      // 如果指定了模板，从模板获取默认配置
      let templateData: any = {};
      if (createClassroomDto.templateId) {
        const template = await this.templateService.findOne(createClassroomDto.templateId);
        templateData = {
          type: template.type,
          rows: template.rows,
          seatsPerRow: template.seatsPerRow,
          layoutConfig: template.layoutConfig,
          equipment: template.equipment,
          facilities: template.facilities,
        };
      }

      const classroom = await this.prisma.classroom.create({
        data: {
          ...templateData,
          ...createClassroomDto,
          layoutConfig: createClassroomDto.layoutConfig 
            ? JSON.stringify(createClassroomDto.layoutConfig) 
            : (templateData.layoutConfig ? JSON.stringify(templateData.layoutConfig) : null),
        },
        include: {
          template: true,
        },
      });

      // 创建初始座位映射
      await this.initializeSeatMap(classroom.id, classroom.rows, classroom.seatsPerRow);

      this.logger.log(`Created classroom with ID: ${classroom.id}`, 'ClassroomsService');
      return {
        ...classroom,
        layoutConfig: classroom.layoutConfig ? (
          typeof classroom.layoutConfig === 'string' 
            ? JSON.parse(classroom.layoutConfig) 
            : classroom.layoutConfig
        ) : null,
      };
    } catch (error) {
      this.logger.error('Failed to create classroom', error.message, 'ClassroomsService');
      throw new BadRequestException('Failed to create classroom');
    }
  }

  async findAll(type?: ClassroomType, building?: string, isActive?: boolean) {
    this.logger.log('Fetching all classrooms', 'ClassroomsService');
    
    try {
      const where: any = {};
      if (type) where.type = type;
      if (building) where.building = building;
      if (isActive !== undefined) where.isActive = isActive;

      const classrooms = await this.prisma.classroom.findMany({
        where,
        include: {
          template: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          bookings: {
            where: {
              status: 'active',
              startTime: { gte: new Date() },
            },
            take: 5,
            orderBy: { startTime: 'asc' },
            select: {
              id: true,
              startTime: true,
              endTime: true,
              purpose: true,
            },
          },
          _count: {
            select: {
              seatMaps: true,
              bookings: true,
            },
          },
        },
        orderBy: [
          { building: 'asc' },
          { floor: 'asc' },
          { name: 'asc' },
        ],
      });

      return classrooms.map(classroom => ({
        ...classroom,
        layoutConfig: classroom.layoutConfig ? (
          typeof classroom.layoutConfig === 'string' 
            ? JSON.parse(classroom.layoutConfig) 
            : classroom.layoutConfig
        ) : null,
        upcomingBookings: classroom.bookings,
        totalSeats: classroom._count.seatMaps,
        totalBookings: classroom._count.bookings,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch classrooms', `${error.message} - Stack: ${error.stack}`, 'ClassroomsService');
      throw new BadRequestException(`Failed to fetch classrooms: ${error.message}`);
    }
  }

  async findOne(id: string) {
    this.logger.log(`Fetching classroom with ID: ${id}`, 'ClassroomsService');
    
    try {
      const classroom = await this.prisma.classroom.findUnique({
        where: { id },
      });

      if (!classroom) {
        throw new NotFoundException(`Classroom with ID ${id} not found`);
      }

      return {
        ...classroom,
        layoutConfig: classroom.layoutConfig ? (
          typeof classroom.layoutConfig === 'string' 
            ? JSON.parse(classroom.layoutConfig) 
            : classroom.layoutConfig
        ) : null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch classroom ${id}`, error.message, 'ClassroomsService');
      throw new BadRequestException('Failed to fetch classroom');
    }
  }

  async update(id: string, updateClassroomDto: UpdateClassroomDto) {
    this.logger.log(`Updating classroom with ID: ${id}`, 'ClassroomsService');
    
    try {
      const existingClassroom = await this.prisma.classroom.findUnique({ where: { id } });
      if (!existingClassroom) {
        throw new NotFoundException(`Classroom with ID ${id} not found`);
      }

      const classroom = await this.prisma.classroom.update({
        where: { id },
        data: {
          ...updateClassroomDto,
          layoutConfig: updateClassroomDto.layoutConfig ? JSON.stringify(updateClassroomDto.layoutConfig) : undefined,
        },
      });

      this.logger.log(`Updated classroom with ID: ${id}`, 'ClassroomsService');
      return {
        ...classroom,
        layoutConfig: classroom.layoutConfig ? (
          typeof classroom.layoutConfig === 'string' 
            ? JSON.parse(classroom.layoutConfig) 
            : classroom.layoutConfig
        ) : null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update classroom ${id}`, error.message, 'ClassroomsService');
      throw new BadRequestException('Failed to update classroom');
    }
  }

  async remove(id: string) {
    this.logger.log(`Deleting classroom with ID: ${id}`, 'ClassroomsService');
    
    try {
      const existingClassroom = await this.prisma.classroom.findUnique({ where: { id } });
      if (!existingClassroom) {
        throw new NotFoundException(`Classroom with ID ${id} not found`);
      }

      await this.prisma.classroom.delete({ where: { id } });
      this.logger.log(`Deleted classroom with ID: ${id}`, 'ClassroomsService');
      
      return { message: 'Classroom deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete classroom ${id}`, error.message, 'ClassroomsService');
      throw new BadRequestException('Failed to delete classroom');
    }
  }


  async startClass(startClassDto: StartClassDto) {
    this.logger.log(`Starting class for course ${startClassDto.courseId}`, 'ClassroomsService');
    
    try {
      // 检查课程是否存在
      const course = await this.prisma.course.findUnique({ 
        where: { id: startClassDto.courseId },
      });

      if (!course) {
        throw new NotFoundException(`Course with ID ${startClassDto.courseId} not found`);
      }

      // 尝试根据预订找到教室，如果没有预订记录则使用默认教室
      const currentTime = new Date();
      const booking = await this.prisma.classroomBooking.findFirst({
        where: {
          courseId: startClassDto.courseId,
          status: 'active',
          startTime: { lte: currentTime },
          endTime: { gte: currentTime },
        },
        include: {
          classroom: true,
        },
      });

      let classroom;
      if (booking) {
        // 找到预订记录，使用预订的教室
        classroom = booking.classroom;
      } else {
        // 没有预订记录，尝试查找默认教室或创建一个默认教室
        const defaultClassrooms = await this.prisma.classroom.findMany({
          where: {
            isActive: true,
          },
          take: 1,
        });
        
        if (defaultClassrooms.length > 0) {
          classroom = defaultClassrooms[0];
        } else {
          // 创建一个默认教室用于演示
          classroom = await this.prisma.classroom.create({
            data: {
              name: `智慧教室-${course.courseCode}`,
              location: '教学楼A-101',
              capacity: 50,
              type: ClassroomType.regular,
              rows: 6,
              seatsPerRow: 8,
              isActive: true,
              equipment: [],
              facilities: [],
              layoutConfig: JSON.stringify({
                rows: 6,
                seatsPerRow: 8,
                seatSpacing: { horizontal: 80, vertical: 80 },
                startPosition: { x: 100, y: 100 }
              })
            },
          });
        }
      }

      // 创建或获取签到会话
      const sessionDate = startClassDto.sessionDate || new Date().toISOString().split('T')[0];
      const timeSlot = startClassDto.sessionNumber || 'default';

      let attendanceSession = await this.prisma.attendanceSession.findFirst({
        where: {
          courseId: startClassDto.courseId,
          sessionDate,
          timeSlot,
        },
      });

      if (!attendanceSession) {
        // 创建新的签到会话
        attendanceSession = await this.prisma.attendanceSession.create({
          data: {
            courseId: startClassDto.courseId,
            sessionDate,
            timeSlot,
            sessionNumber: timeSlot,
            status: 'active',
            method: 'seat_selection',
            classroomId: classroom.id,
            allowLateCheckin: true,
            lateThresholdMinutes: 15,
            autoCloseMinutes: 120,
            totalStudents: await this.getEnrolledStudentsCount(startClassDto.courseId),
            checkedInStudents: 0,
          },
        });
      } else {
        // 激活现有会话
        attendanceSession = await this.prisma.attendanceSession.update({
          where: { id: attendanceSession.id },
          data: { status: 'active' },
        });
      }

      // 生成座位图数据
      const seatMap = await this.generateSeatMap(classroom.id, sessionDate, timeSlot, startClassDto.courseId);

      this.logger.log(`Started class for course ${startClassDto.courseId}`, 'ClassroomsService');
      return {
        session: attendanceSession,
        classroom: {
          ...classroom,
          layoutConfig: classroom.layoutConfig ? (
          typeof classroom.layoutConfig === 'string' 
            ? JSON.parse(classroom.layoutConfig) 
            : classroom.layoutConfig
        ) : null,
        },
        seatMap,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to start class`, error.message, 'ClassroomsService');
      throw new BadRequestException('Failed to start class');
    }
  }

  async selectSeat(sessionId: string, seatSelectionDto: SeatSelectionDto) {
    this.logger.log(`Student ${seatSelectionDto.studentId} selecting seat ${seatSelectionDto.seatNumber} for session ${sessionId}, attendance ${seatSelectionDto.attendanceId || 'auto-create'}`, 'ClassroomsService');
    
    try {
      // 验证 AttendanceSession 存在
      const session = await this.prisma.attendanceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        this.logger.error(`AttendanceSession not found with ID: ${sessionId}`, 'ClassroomsService');
        throw new NotFoundException(`Attendance session not found. SessionId: ${sessionId}`);
      }

      let attendanceRecord;

      // 如果提供了 attendanceId，验证它
      if (seatSelectionDto.attendanceId) {
        attendanceRecord = await this.prisma.attendance.findUnique({
          where: { id: seatSelectionDto.attendanceId }
        });

        if (!attendanceRecord) {
          this.logger.error(`Attendance record not found with ID: ${seatSelectionDto.attendanceId}`, 'ClassroomsService');
          throw new NotFoundException(`Attendance record not found. AttendanceId: ${seatSelectionDto.attendanceId}`);
        }

        // 查找实际的User记录
        const student = await this.prisma.user.findFirst({
          where: { 
            OR: [
              { studentId: seatSelectionDto.studentId },
              { id: seatSelectionDto.studentId }
            ]
          }
        });

        if (!student || attendanceRecord.studentId !== student.id) {
          this.logger.error(`Attendance record ${seatSelectionDto.attendanceId} does not belong to student ${seatSelectionDto.studentId}`, 'ClassroomsService');
          throw new BadRequestException(`Attendance record does not belong to the specified student`);
        }

        // 验证课程一致性
        if (attendanceRecord.courseId !== session.courseId) {
          this.logger.error(`Attendance course ${attendanceRecord.courseId} does not match session course ${session.courseId}`, 'ClassroomsService');
          throw new BadRequestException(`Attendance record and session belong to different courses`);
        }
      } else {
        // 如果没有提供 attendanceId，尝试查找或创建
        this.logger.log(`No attendanceId provided, attempting to find or create attendance record`, 'ClassroomsService');
        
        // 查找学生的User记录
        const student = await this.prisma.user.findFirst({
          where: { 
            OR: [
              { studentId: seatSelectionDto.studentId },
              { id: seatSelectionDto.studentId }
            ]
          }
        });

        if (!student) {
          this.logger.error(`Student not found with ID: ${seatSelectionDto.studentId}`, 'ClassroomsService');
          throw new NotFoundException(`Student not found with ID: ${seatSelectionDto.studentId}`);
        }

        // 查找或创建 Attendance 记录
        attendanceRecord = await this.prisma.attendance.findFirst({
          where: {
            studentId: student.id,
            courseId: session.courseId,
            sessionDate: new Date(session.sessionDate),
            sessionNumber: parseInt(session.sessionNumber)
          }
        });

        if (!attendanceRecord) {
          // 创建新的 Attendance 记录
          attendanceRecord = await this.prisma.attendance.create({
            data: {
              studentId: student.id,
              courseId: session.courseId,
              sessionDate: new Date(session.sessionDate),
              sessionNumber: parseInt(session.sessionNumber),
              status: 'absent',
              checkInMethod: 'seat_selection'
            }
          });
          this.logger.log(`Created new attendance record ${attendanceRecord.id} for student ${student.id}`, 'ClassroomsService');
        }
      }
      
      this.logger.log(`Found session: ${session.id}, status: ${session.status}, courseId: ${session.courseId}, classroomId: ${session.classroomId}`, 'ClassroomsService');
      
      // 获取课程信息
      if (!session.classroomId) {
        this.logger.error(`Session ${sessionId} has no classroomId associated`, 'ClassroomsService');
        throw new BadRequestException(`Session classroom not found. SessionId: ${sessionId} has no classroomId. Please check session data.`);
      }
      
      const classroom = await this.prisma.classroom.findUnique({
        where: { id: session.classroomId },
      });

      if (!classroom) {
        this.logger.error(`Classroom ${session.classroomId} not found for session ${sessionId}`, 'ClassroomsService');
        throw new BadRequestException(`Classroom not found. ClassroomId: ${session.classroomId} from session ${sessionId} does not exist.`);
      }

      if (session.status !== 'active') {
        this.logger.error(`Session ${sessionId} status is ${session.status}, expected 'active'`, 'ClassroomsService');
        throw new BadRequestException(`Attendance session is not active. SessionId: ${sessionId}, current status: ${session.status}. Only active sessions allow seat selection.`);
      }
      
      this.logger.log(`Found classroom: ${classroom.id}, name: ${classroom.name}`, 'ClassroomsService');

      // 检查座位是否已被占用（同一课程、同一时间）
      const existingSeat = await this.prisma.seatMap.findFirst({
        where: {
          classroomId: classroom.id,
          courseId: session.courseId, // 按课程ID过滤
          seatNumber: seatSelectionDto.seatNumber,
          sessionDate: new Date(session.sessionDate),
          status: 'occupied',
        },
      });

      if (existingSeat) {
        this.logger.error(`Seat ${seatSelectionDto.seatNumber} already occupied in classroom ${classroom.id}`, 'ClassroomsService');
        throw new ConflictException(`Seat ${seatSelectionDto.seatNumber} is already occupied. Please select a different seat.`);
      }

      // 检查学生是否已经在同一课程中选择了座位
      // 使用 studentId 字段来匹配学生（存储学号）
      const existingStudentSeat = await this.prisma.seatMap.findFirst({
        where: {
          classroomId: classroom.id,
          courseId: session.courseId, // 按课程ID过滤
          studentId: seatSelectionDto.studentId,
          sessionDate: new Date(session.sessionDate),
          status: 'occupied',
        },
      });

      if (existingStudentSeat) {
        this.logger.error(`Student ${seatSelectionDto.name || seatSelectionDto.studentId} has already selected seat ${existingStudentSeat.seatNumber} in classroom ${classroom.id}`, 'ClassroomsService');
        throw new ConflictException(`You have already selected seat ${existingStudentSeat.seatNumber}. Cannot select multiple seats.`);
      }
      
      this.logger.log(`Seat ${seatSelectionDto.seatNumber} is available for student ${seatSelectionDto.studentId}`, 'ClassroomsService');

      // 解析seat Number获取row和column（假设seatNumber格式为 A1, B2 等）
      const seatRow = seatSelectionDto.seatNumber.charCodeAt(0) - 64; // A=1, B=2, etc.
      const seatCol = parseInt(seatSelectionDto.seatNumber.slice(1));

      // 创建座位选择记录
      // 注意：studentId 在这里存储学号，不使用外键约束
      const seatMap = await this.prisma.seatMap.create({
        data: {
          classroomId: classroom.id,
          courseId: session.courseId, // 添加课程ID以支持多课程教室使用
          seatNumber: seatSelectionDto.seatNumber,
          row: seatRow,
          column: seatCol,
          studentId: seatSelectionDto.studentId, // 存储学号（不使用外键约束）
          sessionDate: new Date(session.sessionDate),
          sessionNumber: session.timeSlot,
          status: 'occupied',
          selectedAt: new Date(),
          attendanceConfirmed: true,
        },
      });

      // 🔧 修复：更新现有的Attendance记录而不是创建新的
      await this.prisma.attendance.update({
        where: { id: attendanceRecord.id },
        data: {
          status: 'present',
          checkInMethod: 'seat_selection',
          checkInTime: new Date(),
          seatNumber: parseInt(seatSelectionDto.seatNumber.slice(1)) || null,
          notes: `Selected seat ${seatSelectionDto.seatNumber}`,
        },
      });

      // 更新签到会话的签到人数
      await this.prisma.attendanceSession.update({
        where: { id: sessionId },
        data: {
          checkedInStudents: {
            increment: 1,
          },
        },
      });

      // 广播座位更新事件
      this.classroomsGateway.broadcastSeatUpdate({
        classroomId: classroom.id,
        sessionDate: session.sessionDate,
        timeSlot: session.timeSlot,
        seatId: seatSelectionDto.seatNumber,
        studentId: seatSelectionDto.studentId,
        studentName: seatSelectionDto.name || seatSelectionDto.studentId,
        status: 'occupied',
        attendanceConfirmed: true,
      });

      this.logger.log(`Student successfully selected seat ${seatSelectionDto.seatNumber}`, 'ClassroomsService');
      return seatMap;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Unexpected error during seat selection for session ${sessionId}, student ${seatSelectionDto.studentId}, seat ${seatSelectionDto.seatNumber}: ${error.message}`, error.stack, 'ClassroomsService');
      throw new BadRequestException(`Failed to select seat: ${error.message}. SessionId: ${sessionId}, Student: ${seatSelectionDto.studentId}, Seat: ${seatSelectionDto.seatNumber}`);
    }
  }

  async getSeatMap(classroomId: string, sessionDate?: string, sessionNumber?: string) {
    this.logger.log(`Getting seat map for classroom ${classroomId}`, 'ClassroomsService');
    
    try {
      const classroom = await this.prisma.classroom.findUnique({
        where: { id: classroomId },
      });

      if (!classroom) {
        throw new NotFoundException(`Classroom with ID ${classroomId} not found`);
      }

      const currentDate = sessionDate || new Date().toISOString().split('T')[0];
      const currentSessionNumber = sessionNumber || 'default';
      
      // 获取课程ID（如果没有提供，需要从会话或他处获取）
      let courseId: string | undefined;
      const session = await this.prisma.attendanceSession.findFirst({
        where: {
          classroomId,
          sessionDate: currentDate,
        },
      });
      if (session) {
        courseId = session.courseId;
      }

      const seatMap = await this.generateSeatMap(classroomId, currentDate, currentSessionNumber, courseId);

      return {
        classroom: {
          ...classroom,
          layoutConfig: classroom.layoutConfig ? (
          typeof classroom.layoutConfig === 'string' 
            ? JSON.parse(classroom.layoutConfig) 
            : classroom.layoutConfig
        ) : null,
        },
        seats: seatMap,
        sessionDate: currentDate,
        sessionNumber: currentSessionNumber,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get seat map`, error.message, 'ClassroomsService');
      throw new BadRequestException('Failed to get seat map');
    }
  }

  private async generateSeatMap(classroomId: string, sessionDate: string, sessionNumber: string, courseId?: string) {
    const classroom = await this.prisma.classroom.findUnique({ where: { id: classroomId } });
    if (!classroom) {
      throw new NotFoundException('Classroom not found');
    }

    const layoutConfig = classroom.layoutConfig ? (
      typeof classroom.layoutConfig === 'string' 
        ? JSON.parse(classroom.layoutConfig) 
        : classroom.layoutConfig
    ) : null;
    const seatMap = [];

    // 添加调试日志
    this.logger.log(`Generating seat map for classroom ${classroomId}, sessionDate: ${sessionDate}, sessionNumber: ${sessionNumber}`, 'ClassroomsService');

    // 获取已占用的座位 - 支持按courseId过滤实现多课程教室管理
    const occupiedSeatsQuery: any = {
      classroomId,
      sessionDate: new Date(sessionDate),
      status: 'occupied',
    };
    
    // 如果提供了courseId，则按课程过滤
    if (courseId) {
      occupiedSeatsQuery.courseId = courseId;
    }
    
    const occupiedSeats = await this.prisma.seatMap.findMany({
      where: occupiedSeatsQuery,
      // Removed student include - no longer needed since we store studentId directly
    });

    this.logger.log(`Found ${occupiedSeats.length} occupied seats`, 'ClassroomsService');
    if (occupiedSeats.length > 0) {
      this.logger.log(`Occupied seats data: ${JSON.stringify(occupiedSeats.map(s => ({ 
        seatNumber: s.seatNumber, 
        studentId: s.studentId,
        sessionNumber: s.sessionNumber,
        sessionDate: s.sessionDate
      })))}`, 'ClassroomsService');
    }

    const occupiedSeatNumbers = new Set(occupiedSeats.map(seat => seat.seatNumber));

    // 生成所有座位
    for (let row = 1; row <= classroom.rows; row++) {
      for (let seatNum = 1; seatNum <= classroom.seatsPerRow; seatNum++) {
        const seatNumber = `${String.fromCharCode(64 + row)}${seatNum}`; // A1, A2, B1, B2, etc.
        
        let status = 'available';
        let student = null;
        let seatStudentId = null; // 存储座位的学号

        // 检查是否为不可用座位
        if (layoutConfig?.unavailableSeats?.includes(seatNumber)) {
          status = 'unavailable';
        } else if (occupiedSeatNumbers.has(seatNumber)) {
          status = 'occupied';
          const occupiedSeat = occupiedSeats.find(seat => seat.seatNumber === seatNumber);
          // 获取student信息需要单独查询
          if (occupiedSeat && occupiedSeat.studentId) {
            seatStudentId = occupiedSeat.studentId; // 保存学号
            // occupiedSeat.studentId 存储的是学号，不是数据库ID
            const studentInfo = await this.prisma.user.findFirst({
              where: { studentId: occupiedSeat.studentId },
              select: { id: true, firstName: true, lastName: true, studentId: true }
            });
            student = studentInfo;
          }
        }

        seatMap.push({
          id: `${classroomId}-${seatNumber}-${sessionDate}-${sessionNumber}`,
          classroomId,
          courseId: courseId, // 包含courseId
          seatId: seatNumber,  // Frontend expects seatId
          seatNumber,
          studentId: seatStudentId,  // 使用保存的学号
          sessionDate: new Date(sessionDate),
          sessionNumber,
          status,
          selectedAt: status === 'occupied' ? new Date() : null,
          attendanceConfirmed: status === 'occupied',
          student,
          row,
          column: seatNum,
        });
      }
    }

    return seatMap;
  }

  private async getEnrolledStudentsCount(courseId: string): Promise<number> {
    const enrollmentCount = await this.prisma.enrollment.count({
      where: { 
        courseId,
        status: 'active',
      },
    });
    return enrollmentCount;
  }

  private async initializeSeatMap(classroomId: string, rows: number, seatsPerRow: number) {
    this.logger.log(`Initializing seat map for classroom ${classroomId}`, 'ClassroomsService');
    
    const seats = [];
    for (let row = 1; row <= rows; row++) {
      for (let seatNum = 1; seatNum <= seatsPerRow; seatNum++) {
        const seatNumber = `${String.fromCharCode(64 + row)}${seatNum}`; // A1, A2, B1, B2, etc.
        seats.push({
          classroomId,
          seatNumber,
          row,
          column: seatNum,
          status: SeatStatus.available,
          seatType: SeatType.regular,
        });
      }
    }

    await this.prisma.seatMap.createMany({
      data: seats,
    });

    this.logger.log(`Created ${seats.length} seats for classroom ${classroomId}`, 'ClassroomsService');
  }

  async createBooking(createBookingDto: CreateClassroomBookingDto) {
    return this.bookingService.createBooking(createBookingDto);
  }

  async checkAvailability(classroomId: string, startTime: string, endTime: string) {
    return this.bookingService.checkAvailability(classroomId, { startTime, endTime });
  }

  async getClassroomSchedule(classroomId: string, date?: string) {
    return this.bookingService.getClassroomSchedule(classroomId, date);
  }

  async getAvailableClassrooms(startTime: string, endTime: string, type?: ClassroomType, capacity?: number) {
    this.logger.log('Finding available classrooms', 'ClassroomsService');
    
    try {
      // 获取所有符合条件的教室
      const where: any = { isActive: true };
      if (type) where.type = type;
      if (capacity) where.capacity = { gte: capacity };

      const classrooms = await this.prisma.classroom.findMany({
        where,
        include: {
          bookings: {
            where: {
              status: 'active',
              AND: [
                { startTime: { lt: new Date(endTime) } },
                { endTime: { gt: new Date(startTime) } },
              ],
            },
          },
        },
      });

      // 过滤出没有冲突的教室
      const availableClassrooms = classrooms.filter(classroom => classroom.bookings.length === 0);

      return availableClassrooms.map(classroom => ({
        ...classroom,
        layoutConfig: classroom.layoutConfig ? (
          typeof classroom.layoutConfig === 'string' 
            ? JSON.parse(classroom.layoutConfig) 
            : classroom.layoutConfig
        ) : null,
      }));
    } catch (error) {
      this.logger.error('Failed to find available classrooms', error.message, 'ClassroomsService');
      throw new BadRequestException('Failed to find available classrooms');
    }
  }

  async updateSeatLayout(classroomId: string, seatUpdates: Array<{
    seatNumber: string;
    status?: SeatStatus;
    seatType?: SeatType;
  }>) {
    this.logger.log(`Updating seat layout for classroom ${classroomId}`, 'ClassroomsService');
    
    try {
      for (const update of seatUpdates) {
        await this.prisma.seatMap.updateMany({
          where: {
            classroomId,
            seatNumber: update.seatNumber,
          },
          data: {
            status: update.status,
            seatType: update.seatType,
          },
        });
      }

      this.logger.log(`Updated ${seatUpdates.length} seats for classroom ${classroomId}`, 'ClassroomsService');
      return { message: 'Seat layout updated successfully' };
    } catch (error) {
      this.logger.error('Failed to update seat layout', error.message, 'ClassroomsService');
      throw new BadRequestException('Failed to update seat layout');
    }
  }

  async getClassroomUsageStatistics(classroomId: string, startDate?: string, endDate?: string) {
    this.logger.log(`Getting usage statistics for classroom ${classroomId}`, 'ClassroomsService');
    
    try {
      const where: any = { classroomId };
      if (startDate && endDate) {
        where.AND = [
          { startTime: { gte: new Date(startDate) } },
          { endTime: { lte: new Date(endDate) } },
        ];
      }

      const bookings = await this.prisma.classroomBooking.findMany({
        where,
        select: {
          startTime: true,
          endTime: true,
          purpose: true,
          status: true,
        },
      });

      const totalBookings = bookings.length;
      const totalHours = bookings.reduce((sum, booking) => {
        const duration = booking.endTime.getTime() - booking.startTime.getTime();
        return sum + (duration / (1000 * 60 * 60)); // Convert to hours
      }, 0);

      const averageBookingDuration = totalBookings > 0 ? totalHours / totalBookings : 0;

      return {
        classroomId,
        period: { startDate, endDate },
        totalBookings,
        totalHours: Math.round(totalHours * 100) / 100,
        averageBookingDuration: Math.round(averageBookingDuration * 100) / 100,
        utilizationRate: this.calculateUtilizationRate(totalHours, startDate, endDate),
      };
    } catch (error) {
      this.logger.error('Failed to get classroom usage statistics', error.message, 'ClassroomsService');
      throw new BadRequestException('Failed to get classroom usage statistics');
    }
  }

  private calculateUtilizationRate(usedHours: number, startDate?: string, endDate?: string): number {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const workingHoursPerDay = 14; // 8:00-22:00
    const totalAvailableHours = daysDiff * workingHoursPerDay;
    
    return totalAvailableHours > 0 ? Math.round((usedHours / totalAvailableHours) * 10000) / 100 : 0;
  }

  async bindCourseToClassroom(classroomId: string, bindData: {
    courseId: string;
    startTime: string;
    endTime: string;
    recurring?: boolean;
    dayOfWeek?: number;
  }) {
    this.logger.log(`Binding course to classroom - Data: ${JSON.stringify(bindData)}`, 'ClassroomsService');
    
    try {
      // Validate date strings first
      const startDate = new Date(bindData.startTime);
      const endDate = new Date(bindData.endTime);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        this.logger.error(`Invalid date format - startTime: ${bindData.startTime}, endTime: ${bindData.endTime}`, '', 'ClassroomsService');
        throw new BadRequestException('开始时间或结束时间格式无效，请使用ISO日期格式 (YYYY-MM-DDTHH:mm:ss)');
      }

      if (startDate >= endDate) {
        throw new BadRequestException('结束时间必须晚于开始时间');
      }

      // Check if classroom exists
      const classroom = await this.prisma.classroom.findUnique({
        where: { id: classroomId }
      });

      if (!classroom) {
        throw new NotFoundException('教室不存在');
      }

      // Check if course exists
      const course = await this.prisma.course.findUnique({
        where: { id: bindData.courseId },
        include: { teacher: true }
      });

      if (!course) {
        throw new NotFoundException('课程不存在');
      }

      // Check if course already has classroom bindings (could be multiple)
      const existingBookings = await this.prisma.classroomBooking.findMany({
        where: { courseId: bindData.courseId }
      });

      this.logger.log(`Existing booking check for course ${bindData.courseId}: ${existingBookings.length > 0 ? `FOUND ${existingBookings.length} records` : 'NOT FOUND'}`, 'ClassroomsService');
      
      let booking;
      if (existingBookings.length > 0) {
        // Delete all existing bookings and create a new one (to avoid duplicates)
        this.logger.log(`Cleaning up ${existingBookings.length} existing bookings and creating new one for course ${bindData.courseId}`, 'ClassroomsService');
        try {
          // Delete all existing bookings for this course
          await this.prisma.classroomBooking.deleteMany({
            where: { courseId: bindData.courseId }
          });
          this.logger.log(`Deleted ${existingBookings.length} existing bookings for course ${bindData.courseId}`, 'ClassroomsService');
          
          // Create new booking
          booking = await this.bookingService.createBooking({
            classroomId,
            courseId: bindData.courseId,
            teacherId: course.teacherId,
            startTime: bindData.startTime,
            endTime: bindData.endTime,
            recurring: bindData.recurring || false,
            dayOfWeek: bindData.dayOfWeek,
            purpose: '上课',
            notes: `${course.name} 课程教室绑定 (已更新)`
          });
          this.logger.log(`Successfully created new booking for course ${bindData.courseId} after cleanup`, 'ClassroomsService');
        } catch (cleanupError) {
          this.logger.error(`Failed to cleanup and recreate booking: ${cleanupError.message}`, cleanupError.stack, 'ClassroomsService');
          throw cleanupError;
        }
      } else {
        // Use the booking service to create the new binding (which handles time conflicts)
        booking = await this.bookingService.createBooking({
          classroomId,
          courseId: bindData.courseId,
          teacherId: course.teacherId,
          startTime: bindData.startTime,
          endTime: bindData.endTime,
          recurring: bindData.recurring || false,
          dayOfWeek: bindData.dayOfWeek,
          purpose: '上课',
          notes: `${course.name} 课程教室绑定`
        });
      }

      this.logger.log(`Course ${bindData.courseId} bound to classroom ${classroomId}`, 'ClassroomsService');

      return {
        success: true,
        message: '课程绑定成功',
        booking
      };
    } catch (error) {
      this.logger.error(`Failed to bind course to classroom: ${error.message}`, error.stack, 'ClassroomsService');
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('绑定课程失败');
    }
  }

  async unbindCourseFromClassroom(classroomId: string, courseId: string) {
    try {
      // Find and cancel the booking
      const bookings = await this.prisma.classroomBooking.findMany({
        where: {
          classroomId,
          courseId,
          status: 'active'
        }
      });

      if (!bookings.length) {
        throw new NotFoundException('未找到该课程的教室绑定');
      }

      // Cancel all active bookings for this course-classroom combination
      await this.prisma.classroomBooking.updateMany({
        where: {
          classroomId,
          courseId,
          status: 'active'
        },
        data: {
          status: 'cancelled'
        }
      });

      this.logger.log(`Course ${courseId} unbound from classroom ${classroomId}`, 'ClassroomsService');

      return {
        success: true,
        message: '课程解绑成功',
        cancelledBookings: bookings.length
      };
    } catch (error) {
      this.logger.error(`Failed to unbind course from classroom: ${error.message}`, error.stack, 'ClassroomsService');
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('解绑课程失败');
    }
  }

  // 根据会话ID获取座位图 - 已优化支持attendance和attendanceSession ID
  async getSessionSeatMapBySessionId(sessionId: string, courseId: string, sessionDate: string, timeSlot: string) {
    this.logger.log(`Getting session seat map by session ID ${sessionId}, courseId: ${courseId}, sessionDate: ${sessionDate}, timeSlot: ${timeSlot}`, 'ClassroomsService');
    
    try {
      // 首先尝试在attendanceSession表中查找
      this.logger.log(`Looking for attendanceSession with ID: ${sessionId}`, 'ClassroomsService');
      let session = await this.prisma.attendanceSession.findUnique({
        where: { id: sessionId },
      });

      let targetCourseId = courseId;
      let targetSessionDate = sessionDate;
      let targetTimeSlot = timeSlot;

      if (session) {
        this.logger.log(`Found attendanceSession with ID ${sessionId}, classroomId: ${session.classroomId}`, 'ClassroomsService');
        // 找到了attendanceSession，使用它的信息
        const classroomId = session.classroomId;
        if (!classroomId) {
          throw new BadRequestException('该签到会话没有关联的教室');
        }
        return this.getSessionSeatMap(classroomId, courseId || session.courseId, sessionDate, timeSlot);
      }

      // 如果不是attendanceSession的ID，尝试在attendance表中查找
      this.logger.log(`AttendanceSession not found, looking for attendance record with ID: ${sessionId}`, 'ClassroomsService');
      const attendance = await this.prisma.attendance.findUnique({
        where: { id: sessionId },
        include: {
          course: true,
        }
      });

      if (!attendance) {
        this.logger.log(`Neither attendance session nor attendance record found with ID: ${sessionId}`, 'ClassroomsService');
        throw new NotFoundException(`Neither attendance session nor attendance record with ID ${sessionId} found`);
      }

      this.logger.log(`Found attendance record: ${JSON.stringify({
        id: attendance.id,
        sessionNumber: attendance.sessionNumber,
        sessionDate: attendance.sessionDate,
        courseId: attendance.courseId,
        status: attendance.status
      })}`, 'ClassroomsService');

      // 使用attendance记录的信息来查找对应的attendanceSession
      targetCourseId = courseId || attendance.courseId;
      const attendanceDate = attendance.sessionDate;
      targetSessionDate = sessionDate || attendanceDate.toISOString().split('T')[0];
      
      this.logger.log(`Searching for attendanceSession with courseId: ${targetCourseId}, sessionDate: ${targetSessionDate}`, 'ClassroomsService');
      // 查找对应的attendanceSession - 使用课程ID和日期查找最新的活跃会话
      session = await this.prisma.attendanceSession.findFirst({
        where: {
          courseId: targetCourseId,
          status: 'active',
          sessionDate: {
            gte: new Date(targetSessionDate).toISOString(),
            lt: new Date(new Date(targetSessionDate).getTime() + 24 * 60 * 60 * 1000).toISOString() // 次日
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      let classroomId: string;

      if (session && session.classroomId) {
        // 如果找到了attendanceSession，使用其教室ID
        this.logger.log(`Found active attendanceSession: ${session.id}, classroomId: ${session.classroomId}`, 'ClassroomsService');
        classroomId = session.classroomId;
      } else {
        // 如果没有找到attendanceSession，尝试从课程中获取默认教室
        this.logger.log(`No active attendanceSession found, falling back to default classroom`, 'ClassroomsService');
        const course = attendance.course || await this.prisma.course.findUnique({
          where: { id: targetCourseId }
        });
        
        if (!course) {
          throw new NotFoundException(`Course with ID ${targetCourseId} not found`);
        }

        // 使用第一个可用的教室作为默认教室
        const defaultClassroom = await this.prisma.classroom.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'asc' }
        });

        if (!defaultClassroom) {
          throw new BadRequestException('没有可用的教室');
        }

        this.logger.log(`Using default classroom: ${defaultClassroom.id}`, 'ClassroomsService');
        classroomId = defaultClassroom.id;
      }

      // 调用原有的方法
      this.logger.log(`Calling getSessionSeatMap with classroomId: ${classroomId}, courseId: ${targetCourseId}, sessionDate: ${targetSessionDate}, timeSlot: ${targetTimeSlot}`, 'ClassroomsService');
      return this.getSessionSeatMap(classroomId, targetCourseId, targetSessionDate, targetTimeSlot);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        this.logger.error(`Business logic error in getSessionSeatMapBySessionId: ${error.message}`, 'ClassroomsService');
        throw error;
      }
      this.logger.error(`Failed to get session seat map by session ID`, error.message, 'ClassroomsService');
      throw new BadRequestException('Failed to get session seat map');
    }
  }

  // 获取指定会话的座位图
  async getSessionSeatMap(classroomId: string, courseId: string, sessionDate: string, timeSlot: string) {
    this.logger.log(`Getting session seat map for classroom ${classroomId}, course ${courseId}`, 'ClassroomsService');
    
    try {
      // First, find the correct classroom from ClassroomBooking based on courseId
      // For test environments, we'll be more flexible with date matching
      const sessionDateObj = new Date(sessionDate);
      let classroomBooking = await this.prisma.classroomBooking.findFirst({
        where: {
          courseId,
          startTime: {
            lte: sessionDateObj,
          },
          endTime: {
            gte: sessionDateObj,
          },
          status: 'active',
        },
        include: {
          classroom: true,
        },
      });

      // If no booking found with exact date matching, try to find any active booking for this course
      // This helps with test data where dates might not match exactly
      if (!classroomBooking) {
        this.logger.log(`No exact date match found, trying to find any active booking for course ${courseId}`, 'ClassroomsService');
        classroomBooking = await this.prisma.classroomBooking.findFirst({
          where: {
            courseId,
            status: 'active',
          },
          include: {
            classroom: true,
          },
          orderBy: {
            createdAt: 'desc', // Get the most recent booking
          },
        });
      }

      let actualClassroomId = classroomId;
      let classroom;

      if (classroomBooking) {
        // Use the classroom from the booking
        actualClassroomId = classroomBooking.classroomId;
        classroom = classroomBooking.classroom;
        this.logger.log(`Found classroom booking: using classroom ${actualClassroomId} from booking`, 'ClassroomsService');
      } else {
        // Fallback to the passed classroomId (for backward compatibility)
        classroom = await this.prisma.classroom.findUnique({
          where: { id: classroomId },
        });
        this.logger.log(`No classroom booking found, using fallback classroom ${classroomId}`, 'ClassroomsService');
      }

      if (!classroom) {
        throw new NotFoundException(`Classroom with ID ${actualClassroomId} not found`);
      }

      // 查找或创建签到会话
      let attendanceSession = await this.prisma.attendanceSession.findFirst({
        where: {
          courseId,
          sessionDate,
          timeSlot,
        },
      });

      if (!attendanceSession) {
        // 创建新的签到会话
        attendanceSession = await this.prisma.attendanceSession.create({
          data: {
            courseId,
            sessionDate,
            timeSlot,
            sessionNumber: timeSlot,
            status: 'active',
            method: 'seat_selection',
            classroomId: actualClassroomId,
            allowLateCheckin: true,
            lateThresholdMinutes: 15,
            autoCloseMinutes: 120,
            totalStudents: await this.getEnrolledStudentsCount(courseId),
            checkedInStudents: 0,
          },
        });
      }

      // 生成座位图数据
      const seatMap = await this.generateSeatMap(actualClassroomId, sessionDate, timeSlot, courseId);

      return {
        classroom: {
          ...classroom,
          layoutConfig: classroom.layoutConfig ? (
            typeof classroom.layoutConfig === 'string' 
              ? JSON.parse(classroom.layoutConfig) 
              : classroom.layoutConfig
          ) : null,
        },
        seats: seatMap,
        session: attendanceSession,
        sessionDate,
        timeSlot,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get session seat map`, error.message, 'ClassroomsService');
      throw new BadRequestException('Failed to get session seat map');
    }
  }

  // 取消座位选择
  async cancelSeat(classroomId: string, seatNumber: string, studentId: string, sessionDate?: string) {
    this.logger.log(`Cancelling seat ${seatNumber} for student ${studentId}`, 'ClassroomsService');
    
    try {
      const currentDate = sessionDate || new Date().toISOString().split('T')[0];

      // 查找要取消的座位
      const seatMap = await this.prisma.seatMap.findFirst({
        where: {
          classroomId,
          seatNumber,
          studentId,
          sessionDate: new Date(currentDate),
          status: 'occupied',
        },
      });

      if (!seatMap) {
        throw new NotFoundException('座位选择记录不存在或已取消');
      }

      // 更新座位状态为可用
      const updatedSeat = await this.prisma.seatMap.update({
        where: { id: seatMap.id },
        data: {
          studentId: null,
          status: 'available',
          selectedAt: null,
          attendanceConfirmed: false,
        },
      });

      // 删除相关的签到记录
      await this.prisma.attendance.deleteMany({
        where: {
          studentId,
          sessionDate: new Date(currentDate),
          checkInMethod: 'seat_selection',
          seatNumber: parseInt(seatNumber.slice(1)) || null,
        },
      });

      // 更新签到会话的签到人数（如果存在）
      const session = await this.prisma.attendanceSession.findFirst({
        where: {
          classroomId,
          sessionDate: currentDate,
        },
      });

      if (session) {
        await this.prisma.attendanceSession.update({
          where: { id: session.id },
          data: {
            checkedInStudents: {
              decrement: 1,
            },
          },
        });
      }

      // 广播座位更新事件
      this.classroomsGateway.broadcastSeatUpdate({
        classroomId,
        sessionDate: currentDate,
        timeSlot: session?.timeSlot || 'default',
        seatId: seatNumber,
        studentId: null,
        status: 'available',
        attendanceConfirmed: false,
      });

      this.logger.log(`Successfully cancelled seat ${seatNumber}`, 'ClassroomsService');
      return {
        success: true,
        message: '座位取消成功',
        seat: updatedSeat,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to cancel seat`, error.message, 'ClassroomsService');
      throw new BadRequestException('Failed to cancel seat');
    }
  }
}