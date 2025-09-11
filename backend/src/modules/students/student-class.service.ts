import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationLogService } from '../../common/services/operation-log.service';
import { OperationType, UserRole } from '@prisma/client';

export interface CreateStudentClassDto {
  className: string;
  classCode: string;
  major: string;
  department: string;
  grade: string;
  enrollmentYear: string;
  advisor?: string;
  description?: string;
  studentIds?: string[]; // 初始学生列表
}

export interface UpdateStudentClassDto {
  className?: string;
  classCode?: string;
  major?: string;
  department?: string;
  grade?: string;
  enrollmentYear?: string;
  advisor?: string;
  description?: string;
  isActive?: boolean;
}

@Injectable()
export class StudentClassService {
  constructor(
    private prisma: PrismaService,
    private operationLogService: OperationLogService,
  ) {}

  // 创建班级
  async create(createDto: CreateStudentClassDto, operatorId: string, operatorRole: UserRole) {
    // 检查班级代码是否已存在
    const existingClass = await this.prisma.studentClass.findUnique({
      where: { classCode: createDto.classCode }
    });

    if (existingClass) {
      throw new BadRequestException(`班级代码 ${createDto.classCode} 已存在`);
    }

    // 验证学生ID是否存在
    if (createDto.studentIds && createDto.studentIds.length > 0) {
      const existingStudents = await this.prisma.user.findMany({
        where: {
          id: { in: createDto.studentIds },
          role: 'student'
        },
        select: { id: true }
      });

      if (existingStudents.length !== createDto.studentIds.length) {
        throw new BadRequestException('部分学生ID不存在或不是学生角色');
      }
    }

    try {
      const newClass = await this.prisma.$transaction(async (tx) => {
        // 创建班级
        const createdClass = await tx.studentClass.create({
          data: {
            className: createDto.className,
            classCode: createDto.classCode,
            major: createDto.major,
            department: createDto.department,
            grade: createDto.grade,
            enrollmentYear: createDto.enrollmentYear,
            advisor: createDto.advisor,
            description: createDto.description,
            totalStudents: createDto.studentIds?.length || 0,
          }
        });

        // 如果提供了学生ID，更新学生的班级信息
        if (createDto.studentIds && createDto.studentIds.length > 0) {
          await tx.user.updateMany({
            where: { id: { in: createDto.studentIds } },
            data: {
              className: createDto.className,
              classId: createDto.classCode,
            }
          });
        }

        return createdClass;
      });

      // 记录操作日志
      await this.operationLogService.log({
        operationType: OperationType.create_class,
        module: 'student_class',
        targetType: 'class',
        targetId: newClass.id,
        affectedIds: createDto.studentIds || [],
        operatorId,
        operatorRole,
        details: {
          className: createDto.className,
          classCode: createDto.classCode,
          studentCount: createDto.studentIds?.length || 0
        },
        afterData: newClass,
        notes: `创建班级: ${createDto.className}`,
      });

      return newClass;
    } catch (error) {
      // 记录失败日志
      await this.operationLogService.log({
        operationType: OperationType.create_class,
        module: 'student_class',
        targetType: 'class',
        targetId: 'failed',
        operatorId,
        operatorRole,
        success: false,
        errorMessage: error.message,
        details: createDto,
      });
      throw error;
    }
  }

  // 获取所有班级
  async findAll(params?: {
    department?: string;
    major?: string;
    grade?: string;
    enrollmentYear?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const {
      department,
      major,
      grade,
      enrollmentYear,
      isActive,
      page = 1,
      limit = 20
    } = params || {};

    const where: any = {};

    if (department) where.department = { contains: department };
    if (major) where.major = { contains: major };
    if (grade) where.grade = grade;
    if (enrollmentYear) where.enrollmentYear = enrollmentYear;
    if (isActive !== undefined) where.isActive = isActive;

    const [classes, total] = await Promise.all([
      this.prisma.studentClass.findMany({
        where,
        include: {
          students: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentId: true,
              email: true,
            }
          }
        },
        orderBy: [
          { enrollmentYear: 'desc' },
          { grade: 'asc' },
          { className: 'asc' }
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.studentClass.count({ where })
    ]);

    return {
      data: classes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 获取单个班级详情
  async findOne(id: string) {
    const studentClass = await this.prisma.studentClass.findUnique({
      where: { id },
      include: {
        students: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true,
            email: true,
            phone: true,
            isActive: true,
          },
          orderBy: { studentId: 'asc' }
        }
      }
    });

    if (!studentClass) {
      throw new NotFoundException('班级不存在');
    }

    return studentClass;
  }

  // 更新班级信息
  async update(id: string, updateDto: UpdateStudentClassDto, operatorId: string, operatorRole: UserRole) {
    const existingClass = await this.findOne(id);

    // 如果更新班级代码，检查是否冲突
    if (updateDto.classCode && updateDto.classCode !== existingClass.classCode) {
      const conflictClass = await this.prisma.studentClass.findUnique({
        where: { classCode: updateDto.classCode }
      });

      if (conflictClass) {
        throw new BadRequestException(`班级代码 ${updateDto.classCode} 已存在`);
      }
    }

    try {
      const updatedClass = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.studentClass.update({
          where: { id },
          data: updateDto,
        });

        // 如果更新了班级名称或代码，同步更新学生表
        if (updateDto.className || updateDto.classCode) {
          await tx.user.updateMany({
            where: { classId: existingClass.classCode },
            data: {
              className: updateDto.className || existingClass.className,
              classId: updateDto.classCode || existingClass.classCode,
            }
          });
        }

        return updated;
      });

      // 记录操作日志
      await this.operationLogService.log({
        operationType: OperationType.update_class,
        module: 'student_class',
        targetType: 'class',
        targetId: id,
        operatorId,
        operatorRole,
        beforeData: existingClass,
        afterData: updatedClass,
        details: updateDto,
        notes: `更新班级信息: ${existingClass.className}`,
      });

      return updatedClass;
    } catch (error) {
      await this.operationLogService.log({
        operationType: OperationType.update_class,
        module: 'student_class',
        targetType: 'class',
        targetId: id,
        operatorId,
        operatorRole,
        success: false,
        errorMessage: error.message,
        details: updateDto,
      });
      throw error;
    }
  }

  // 向班级添加学生
  async addStudents(classId: string, studentIds: string[], operatorId: string, operatorRole: UserRole) {
    const studentClass = await this.findOne(classId);

    // 验证学生是否存在且为学生角色
    const students = await this.prisma.user.findMany({
      where: {
        id: { in: studentIds },
        role: 'student'
      }
    });

    if (students.length !== studentIds.length) {
      throw new BadRequestException('部分学生ID不存在或不是学生角色');
    }

    // 检查是否有学生已在其他班级
    const studentsInOtherClass = students.filter(s => s.classId && s.classId !== studentClass.classCode);
    if (studentsInOtherClass.length > 0) {
      const names = studentsInOtherClass.map(s => `${s.firstName}${s.lastName}(${s.studentId})`);
      throw new BadRequestException(`学生 ${names.join(', ')} 已在其他班级中`);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // 更新学生的班级信息
        await tx.user.updateMany({
          where: { id: { in: studentIds } },
          data: {
            className: studentClass.className,
            classId: studentClass.classCode,
          }
        });

        // 更新班级学生数量
        await tx.studentClass.update({
          where: { id: classId },
          data: {
            totalStudents: {
              increment: studentIds.length
            }
          }
        });
      });

      // 记录操作日志
      await this.operationLogService.log({
        operationType: OperationType.add_students_to_class,
        module: 'student_class',
        targetType: 'class',
        targetId: classId,
        affectedIds: studentIds,
        operatorId,
        operatorRole,
        details: {
          className: studentClass.className,
          addedCount: studentIds.length,
          studentNames: students.map(s => `${s.firstName}${s.lastName}(${s.studentId})`)
        },
        notes: `向班级 ${studentClass.className} 添加 ${studentIds.length} 名学生`,
      });

      return { success: true, addedCount: studentIds.length };
    } catch (error) {
      await this.operationLogService.log({
        operationType: OperationType.add_students_to_class,
        module: 'student_class',
        targetType: 'class',
        targetId: classId,
        affectedIds: studentIds,
        operatorId,
        operatorRole,
        success: false,
        errorMessage: error.message,
      });
      throw error;
    }
  }

  // 从班级移除学生
  async removeStudents(classId: string, studentIds: string[], operatorId: string, operatorRole: UserRole) {
    const studentClass = await this.findOne(classId);

    try {
      const studentsToRemove = await this.prisma.user.findMany({
        where: {
          id: { in: studentIds },
          classId: studentClass.classCode
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          studentId: true,
        }
      });

      await this.prisma.$transaction(async (tx) => {
        // 清除学生的班级信息
        await tx.user.updateMany({
          where: { id: { in: studentIds } },
          data: {
            className: null,
            classId: null,
          }
        });

        // 更新班级学生数量
        await tx.studentClass.update({
          where: { id: classId },
          data: {
            totalStudents: {
              decrement: studentsToRemove.length
            }
          }
        });
      });

      // 记录操作日志
      await this.operationLogService.log({
        operationType: OperationType.remove_students_from_class,
        module: 'student_class',
        targetType: 'class',
        targetId: classId,
        affectedIds: studentIds,
        operatorId,
        operatorRole,
        details: {
          className: studentClass.className,
          removedCount: studentsToRemove.length,
          studentNames: studentsToRemove.map(s => `${s.firstName}${s.lastName}(${s.studentId})`)
        },
        notes: `从班级 ${studentClass.className} 移除 ${studentsToRemove.length} 名学生`,
      });

      return { success: true, removedCount: studentsToRemove.length };
    } catch (error) {
      await this.operationLogService.log({
        operationType: OperationType.remove_students_from_class,
        module: 'student_class',
        targetType: 'class',
        targetId: classId,
        affectedIds: studentIds,
        operatorId,
        operatorRole,
        success: false,
        errorMessage: error.message,
      });
      throw error;
    }
  }

  // 获取可用学生列表（不在任何班级中的学生）
  async getAvailableStudents(params?: {
    department?: string;
    major?: string;
    grade?: string;
    search?: string; // 姓名或学号搜索
  }) {
    const { department, major, grade, search } = params || {};

    const where: any = {
      role: 'student',
      isActive: true,
      classId: null, // 不在任何班级中
    };

    if (department) where.department = { contains: department };
    if (major) where.major = { contains: major };
    if (grade) where.grade = grade;

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { studentId: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const students = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        studentId: true,
        email: true,
        department: true,
        major: true,
        grade: true,
      },
      orderBy: { studentId: 'asc' }
    });

    return students;
  }

  // 删除班级
  async remove(id: string, operatorId: string, operatorRole: UserRole) {
    const studentClass = await this.findOne(id);

    // 检查班级中是否还有学生
    if (studentClass.students.length > 0) {
      throw new BadRequestException('班级中还有学生，请先移除所有学生后再删除班级');
    }

    try {
      await this.prisma.studentClass.delete({
        where: { id }
      });

      // 记录操作日志
      await this.operationLogService.log({
        operationType: OperationType.delete_class,
        module: 'student_class',
        targetType: 'class',
        targetId: id,
        operatorId,
        operatorRole,
        beforeData: studentClass,
        details: {
          className: studentClass.className,
          classCode: studentClass.classCode
        },
        notes: `删除班级: ${studentClass.className}`,
      });

      return { success: true, message: '班级删除成功' };
    } catch (error) {
      await this.operationLogService.log({
        operationType: OperationType.delete_class,
        module: 'student_class',
        targetType: 'class',
        targetId: id,
        operatorId,
        operatorRole,
        success: false,
        errorMessage: error.message,
      });
      throw error;
    }
  }
}