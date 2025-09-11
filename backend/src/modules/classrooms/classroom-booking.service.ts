import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassroomBookingDto, CheckTimeAvailabilityDto } from './dto';
import { LoggerService } from '../../common/logger/logger.service';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class ClassroomBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async createBooking(createBookingDto: CreateClassroomBookingDto) {
    this.logger.log('Creating new classroom booking', 'ClassroomBookingService');
    
    try {
      // 检查时间冲突
      const hasConflict = await this.checkTimeConflict(
        createBookingDto.classroomId,
        new Date(createBookingDto.startTime),
        new Date(createBookingDto.endTime),
      );

      if (hasConflict.conflict) {
        throw new ConflictException(`教室在该时间段已被占用: ${hasConflict.conflictDetails?.purpose || '其他课程'}`);
      }

      // 验证教室存在
      const classroom = await this.prisma.classroom.findUnique({
        where: { id: createBookingDto.classroomId },
      });

      if (!classroom) {
        throw new NotFoundException(`教室不存在: ${createBookingDto.classroomId}`);
      }

      // 验证课程存在
      const course = await this.prisma.course.findUnique({
        where: { id: createBookingDto.courseId },
      });

      if (!course) {
        throw new NotFoundException(`课程不存在: ${createBookingDto.courseId}`);
      }

      // 创建预订
      const booking = await this.prisma.classroomBooking.create({
        data: {
          classroomId: createBookingDto.classroomId,
          courseId: createBookingDto.courseId,
          teacherId: createBookingDto.teacherId,
          startTime: new Date(createBookingDto.startTime),
          endTime: new Date(createBookingDto.endTime),
          dayOfWeek: createBookingDto.dayOfWeek,
          recurring: createBookingDto.recurring,
          purpose: createBookingDto.purpose,
          notes: createBookingDto.notes,
          status: BookingStatus.active,
        },
        include: {
          classroom: {
            select: {
              id: true,
              name: true,
              location: true,
              building: true,
              floor: true,
              room: true,
            },
          },
        },
      });

      this.logger.log(`Created classroom booking with ID: ${booking.id}`, 'ClassroomBookingService');
      return booking;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('Failed to create classroom booking', error.message, 'ClassroomBookingService');
      throw new BadRequestException('Failed to create classroom booking');
    }
  }

  async checkAvailability(classroomId: string, checkDto: CheckTimeAvailabilityDto) {
    this.logger.log(`Checking availability for classroom ${classroomId}`, 'ClassroomBookingService');
    
    try {
      const conflict = await this.checkTimeConflict(
        classroomId,
        new Date(checkDto.startTime),
        new Date(checkDto.endTime),
        checkDto.excludeBookingId,
      );

      return {
        available: !conflict.conflict,
        conflictDetails: conflict.conflictDetails,
      };
    } catch (error) {
      this.logger.error('Failed to check classroom availability', error.message, 'ClassroomBookingService');
      throw new BadRequestException('Failed to check classroom availability');
    }
  }

  async findBookings(classroomId?: string, courseId?: string, startDate?: string, endDate?: string) {
    this.logger.log('Fetching classroom bookings', 'ClassroomBookingService');
    
    try {
      const where: any = { status: BookingStatus.active };
      
      if (classroomId) where.classroomId = classroomId;
      if (courseId) where.courseId = courseId;
      
      if (startDate && endDate) {
        where.AND = [
          { startTime: { gte: new Date(startDate) } },
          { endTime: { lte: new Date(endDate) } },
        ];
      } else if (startDate) {
        where.startTime = { gte: new Date(startDate) };
      } else if (endDate) {
        where.endTime = { lte: new Date(endDate) };
      }

      const bookings = await this.prisma.classroomBooking.findMany({
        where,
        include: {
          classroom: {
            select: {
              id: true,
              name: true,
              location: true,
              building: true,
              floor: true,
              room: true,
              capacity: true,
            },
          },
        },
        orderBy: [
          { startTime: 'asc' },
        ],
      });

      return bookings;
    } catch (error) {
      this.logger.error('Failed to fetch classroom bookings', error.message, 'ClassroomBookingService');
      throw new BadRequestException('Failed to fetch classroom bookings');
    }
  }

  async findOne(id: string) {
    this.logger.log(`Fetching booking with ID: ${id}`, 'ClassroomBookingService');
    
    try {
      const booking = await this.prisma.classroomBooking.findUnique({
        where: { id },
        include: {
          classroom: true,
        },
      });

      if (!booking) {
        throw new NotFoundException(`Booking with ID ${id} not found`);
      }

      return booking;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch booking ${id}`, error.message, 'ClassroomBookingService');
      throw new BadRequestException('Failed to fetch booking');
    }
  }

  async updateBooking(id: string, updateDto: Partial<CreateClassroomBookingDto>) {
    this.logger.log(`Updating booking with ID: ${id}`, 'ClassroomBookingService');
    
    try {
      const existingBooking = await this.prisma.classroomBooking.findUnique({ where: { id } });
      if (!existingBooking) {
        throw new NotFoundException(`Booking with ID ${id} not found`);
      }

      // 如果更新了时间，需要检查冲突
      if (updateDto.startTime || updateDto.endTime) {
        const startTime = new Date(updateDto.startTime || existingBooking.startTime);
        const endTime = new Date(updateDto.endTime || existingBooking.endTime);
        const classroomId = updateDto.classroomId || existingBooking.classroomId;

        const hasConflict = await this.checkTimeConflict(
          classroomId,
          startTime,
          endTime,
          id, // 排除当前预订
        );

        if (hasConflict.conflict) {
          throw new ConflictException(`教室在该时间段已被占用: ${hasConflict.conflictDetails?.purpose || '其他课程'}`);
        }
      }

      const booking = await this.prisma.classroomBooking.update({
        where: { id },
        data: {
          ...updateDto,
          startTime: updateDto.startTime ? new Date(updateDto.startTime) : undefined,
          endTime: updateDto.endTime ? new Date(updateDto.endTime) : undefined,
        },
        include: {
          classroom: true,
        },
      });

      this.logger.log(`Updated booking with ID: ${id}`, 'ClassroomBookingService');
      return booking;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Failed to update booking ${id}`, error.message, 'ClassroomBookingService');
      throw new BadRequestException('Failed to update booking');
    }
  }

  async cancelBooking(id: string) {
    this.logger.log(`Cancelling booking with ID: ${id}`, 'ClassroomBookingService');
    
    try {
      const existingBooking = await this.prisma.classroomBooking.findUnique({ where: { id } });
      if (!existingBooking) {
        throw new NotFoundException(`Booking with ID ${id} not found`);
      }

      const booking = await this.prisma.classroomBooking.update({
        where: { id },
        data: { status: BookingStatus.cancelled },
      });

      this.logger.log(`Cancelled booking with ID: ${id}`, 'ClassroomBookingService');
      return booking;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to cancel booking ${id}`, error.message, 'ClassroomBookingService');
      throw new BadRequestException('Failed to cancel booking');
    }
  }

  async getClassroomSchedule(classroomId: string, date?: string) {
    this.logger.log(`Getting schedule for classroom ${classroomId}`, 'ClassroomBookingService');
    
    try {
      const targetDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const bookings = await this.prisma.classroomBooking.findMany({
        where: {
          classroomId,
          status: BookingStatus.active,
          OR: [
            {
              AND: [
                { startTime: { lte: endOfDay } },
                { endTime: { gte: startOfDay } },
              ],
            },
            {
              recurring: true,
              dayOfWeek: targetDate.getDay() || 7, // Sunday = 7
            },
          ],
        },
        orderBy: { startTime: 'asc' },
      });

      return {
        classroomId,
        date: targetDate.toISOString().split('T')[0],
        bookings,
        totalBookings: bookings.length,
        availableSlots: this.calculateAvailableSlots(bookings, startOfDay, endOfDay),
      };
    } catch (error) {
      this.logger.error('Failed to get classroom schedule', error.message, 'ClassroomBookingService');
      throw new BadRequestException('Failed to get classroom schedule');
    }
  }

  private async checkTimeConflict(
    classroomId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string,
  ) {
    const where: any = {
      classroomId,
      status: BookingStatus.active,
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    };

    if (excludeBookingId) {
      where.NOT = { id: excludeBookingId };
    }

    const conflictingBookings = await this.prisma.classroomBooking.findMany({
      where,
      take: 1,
    });

    return {
      conflict: conflictingBookings.length > 0,
      conflictDetails: conflictingBookings[0] || null,
    };
  }

  private calculateAvailableSlots(bookings: any[], startOfDay: Date, endOfDay: Date) {
    // 计算一天中的可用时间段
    const slots = [];
    const workingHours = { start: 8, end: 22 }; // 8:00 - 22:00
    
    let currentTime = new Date(startOfDay);
    currentTime.setHours(workingHours.start, 0, 0, 0);
    
    const endOfWorkingDay = new Date(endOfDay);
    endOfWorkingDay.setHours(workingHours.end, 0, 0, 0);

    const sortedBookings = bookings.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    for (const booking of sortedBookings) {
      if (currentTime < booking.startTime) {
        slots.push({
          startTime: new Date(currentTime),
          endTime: new Date(booking.startTime),
          duration: booking.startTime.getTime() - currentTime.getTime(),
        });
      }
      currentTime = new Date(Math.max(currentTime.getTime(), booking.endTime.getTime()));
    }

    // 添加最后一个时间段
    if (currentTime < endOfWorkingDay) {
      slots.push({
        startTime: new Date(currentTime),
        endTime: endOfWorkingDay,
        duration: endOfWorkingDay.getTime() - currentTime.getTime(),
      });
    }

    return slots;
  }
}