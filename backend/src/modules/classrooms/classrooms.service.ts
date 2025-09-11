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
      const seatMap = await this.generateSeatMap(classroom.id, sessionDate, timeSlot);

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
    this.logger.log(`Student selecting seat ${seatSelectionDto.seatNumber}`, 'ClassroomsService');
    
    try {
      // 检查签到会话是否存在且处于活跃状态
      const session = await this.prisma.attendanceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        throw new NotFoundException('Attendance session not found');
      }
      
      // 获取课程信息
      if (!session.classroomId) {
        throw new BadRequestException('Session classroom not found');
      }
      
      const classroom = await this.prisma.classroom.findUnique({
        where: { id: session.classroomId },
      });

      if (!classroom) {
        throw new BadRequestException('Classroom not found');
      }

      if (session.status !== 'active') {
        throw new BadRequestException('Attendance session is not active');
      }

      // 检查座位是否已被占用
      const existingSeat = await this.prisma.seatMap.findFirst({
        where: {
          classroomId: classroom.id,
          seatNumber: seatSelectionDto.seatNumber,
          sessionDate: new Date(session.sessionDate),
          status: 'occupied',
        },
      });

      if (existingSeat) {
        throw new ConflictException('Seat is already occupied');
      }

      // 检查学生是否已经选择了座位
      const existingStudentSeat = await this.prisma.seatMap.findFirst({
        where: {
          classroomId: classroom.id,
          studentId: seatSelectionDto.studentId,
          sessionDate: new Date(session.sessionDate),
          status: 'occupied',
        },
      });

      if (existingStudentSeat) {
        throw new ConflictException('Student has already selected a seat');
      }

      // 解析seat Number获取row和column（假设seatNumber格式为 A1, B2 等）
      const seatRow = seatSelectionDto.seatNumber.charCodeAt(0) - 64; // A=1, B=2, etc.
      const seatCol = parseInt(seatSelectionDto.seatNumber.slice(1));

      // 创建座位选择记录
      const seatMap = await this.prisma.seatMap.create({
        data: {
          classroomId: classroom.id,
          seatNumber: seatSelectionDto.seatNumber,
          row: seatRow,
          column: seatCol,
          studentId: seatSelectionDto.studentId,
          sessionDate: new Date(session.sessionDate),
          sessionNumber: session.timeSlot,
          status: 'occupied',
          selectedAt: new Date(),
          attendanceConfirmed: true,
        },
      });

      // 创建签到记录
      await this.prisma.attendance.create({
        data: {
          studentId: seatSelectionDto.studentId,
          courseId: session.courseId,
          sessionDate: new Date(session.sessionDate),
          sessionNumber: parseInt(session.timeSlot) || 1,
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
        status: 'occupied',
        attendanceConfirmed: true,
      });

      this.logger.log(`Student successfully selected seat ${seatSelectionDto.seatNumber}`, 'ClassroomsService');
      return seatMap;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to select seat`, error.message, 'ClassroomsService');
      throw new BadRequestException('Failed to select seat');
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

      const seatMap = await this.generateSeatMap(classroomId, currentDate, currentSessionNumber);

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

  private async generateSeatMap(classroomId: string, sessionDate: string, sessionNumber: string) {
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

    // 获取已占用的座位
    const occupiedSeats = await this.prisma.seatMap.findMany({
      where: {
        classroomId,
        sessionDate: new Date(sessionDate),
        sessionNumber,
        status: 'occupied',
      },
      include: {
        student: true,
      },
    });

    const occupiedSeatNumbers = new Set(occupiedSeats.map(seat => seat.seatNumber));

    // 生成所有座位
    for (let row = 1; row <= classroom.rows; row++) {
      for (let seatNum = 1; seatNum <= classroom.seatsPerRow; seatNum++) {
        const seatNumber = `${String.fromCharCode(64 + row)}${seatNum}`; // A1, A2, B1, B2, etc.
        
        let status = 'available';
        let student = null;

        // 检查是否为不可用座位
        if (layoutConfig?.unavailableSeats?.includes(seatNumber)) {
          status = 'unavailable';
        } else if (occupiedSeatNumbers.has(seatNumber)) {
          status = 'occupied';
          const occupiedSeat = occupiedSeats.find(seat => seat.seatNumber === seatNumber);
          // 获取student信息需要单独查询
          if (occupiedSeat && occupiedSeat.studentId) {
            const studentInfo = await this.prisma.user.findUnique({
              where: { id: occupiedSeat.studentId },
              select: { id: true, firstName: true, lastName: true, studentId: true }
            });
            student = studentInfo;
          }
        }

        seatMap.push({
          id: `${classroomId}-${seatNumber}-${sessionDate}-${sessionNumber}`,
          classroomId,
          seatNumber,
          studentId: student?.id || null,
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

  // 根据会话ID获取座位图
  async getSessionSeatMapBySessionId(sessionId: string, courseId: string, sessionDate: string, timeSlot: string) {
    this.logger.log(`Getting session seat map by session ID ${sessionId}`, 'ClassroomsService');
    
    try {
      // 先查找签到会话获取教室ID
      const session = await this.prisma.attendanceSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new NotFoundException(`Attendance session with ID ${sessionId} not found`);
      }

      const classroomId = session.classroomId;
      if (!classroomId) {
        throw new BadRequestException('该签到会话没有关联的教室');
      }

      // 调用原有的方法
      return this.getSessionSeatMap(classroomId, courseId || session.courseId, sessionDate, timeSlot);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
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
      const classroom = await this.prisma.classroom.findUnique({
        where: { id: classroomId },
      });

      if (!classroom) {
        throw new NotFoundException(`Classroom with ID ${classroomId} not found`);
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
            classroomId,
            allowLateCheckin: true,
            lateThresholdMinutes: 15,
            autoCloseMinutes: 120,
            totalStudents: await this.getEnrolledStudentsCount(courseId),
            checkedInStudents: 0,
          },
        });
      }

      // 生成座位图数据
      const seatMap = await this.generateSeatMap(classroomId, sessionDate, timeSlot);

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