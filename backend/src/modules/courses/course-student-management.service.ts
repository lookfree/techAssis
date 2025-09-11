import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationLogService } from '../../common/services/operation-log.service';
import { OperationType, UserRole, $Enums } from '@prisma/client';

export interface AddStudentsToCourseDto {
  courseId: string;
  studentIds: string[];
  operatorId: string;
  operatorRole: UserRole;
  notes?: string;
}

export interface AddClassToCourseDto {
  courseId: string;
  classId: string;
  operatorId: string;
  operatorRole: UserRole;
  notes?: string;
}

export interface RemoveStudentsFromCourseDto {
  courseId: string;
  studentIds: string[];
  operatorId: string;
  operatorRole: UserRole;
  notes?: string;
}

@Injectable()
export class CourseStudentManagementService {
  constructor(
    private prisma: PrismaService,
    private operationLogService: OperationLogService,
  ) {}

  // 教师向课程添加学生（创建enrollment记录）
  async addStudentsToCourse(dto: AddStudentsToCourseDto) {
    const { courseId, studentIds, operatorId, operatorRole, notes } = dto;

    // 验证课程存在
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        name: true,
        courseCode: true,
        teacherId: true,
        capacity: true,
        _count: {
          select: { enrollments: true }
        }
      }
    });

    if (!course) {
      throw new NotFoundException('课程不存在');
    }

    // 权限验证：只有课程教师或管理员可以添加学生
    if (operatorRole === 'teacher' && course.teacherId !== operatorId) {
      throw new ForbiddenException('无权管理此课程学生');
    }

    // 验证学生存在且为学生角色
    const students = await this.prisma.user.findMany({
      where: {
        id: { in: studentIds },
        role: 'student',
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        studentId: true,
        className: true,
        major: true,
      }
    });

    if (students.length !== studentIds.length) {
      throw new BadRequestException('部分学生ID不存在或不是活跃学生');
    }

    // 检查课程容量限制
    const totalStudentsAfterAdd = course._count.enrollments + studentIds.length;
    if (totalStudentsAfterAdd > course.capacity) {
      throw new BadRequestException(
        `超出课程容量限制。当前已有 ${course._count.enrollments} 人，容量为 ${course.capacity} 人`
      );
    }

    // 检查是否有学生已经选了此课程
    const existingEnrollments = await this.prisma.enrollment.findMany({
      where: {
        courseId,
        studentId: { in: studentIds }
      },
      select: {
        studentId: true,
        student: {
          select: { firstName: true, lastName: true, studentId: true }
        }
      }
    });

    if (existingEnrollments.length > 0) {
      const duplicateNames = existingEnrollments.map(e => 
        `${e.student.firstName}${e.student.lastName}(${e.student.studentId})`
      );
      throw new BadRequestException(`以下学生已在此课程中：${duplicateNames.join(', ')}`);
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 批量创建enrollment记录
        const enrollmentData = studentIds.map(studentId => ({
          studentId,
          courseId,
          status: 'active',
          enrolledAt: new Date(),
        }));

        const createdEnrollments = await tx.enrollment.createMany({
          data: enrollmentData,
          skipDuplicates: true,
        });

        return {
          enrollments: createdEnrollments,
          addedCount: studentIds.length,
        };
      });

      // 记录操作日志
      await this.operationLogService.log({
        operationType: OperationType.add_students_to_course,
        module: 'course',
        targetType: 'course',
        targetId: courseId,
        affectedIds: studentIds,
        operatorId,
        operatorRole,
        details: {
          courseName: course.name,
          courseCode: course.courseCode,
          addedStudentCount: studentIds.length,
          studentNames: students.map(s => `${s.firstName}${s.lastName}(${s.studentId})`),
          studentsByClass: this.groupStudentsByClass(students),
        },
        beforeData: {
          enrollmentCount: course._count.enrollments,
        },
        afterData: {
          enrollmentCount: course._count.enrollments + studentIds.length,
        },
        notes: notes || `向课程 ${course.name} 添加 ${studentIds.length} 名学生`,
      });

      return {
        success: true,
        addedCount: result.addedCount,
        message: `成功添加 ${result.addedCount} 名学生到课程`,
        studentsAdded: students,
      };
    } catch (error) {
      // 记录失败日志
      await this.operationLogService.log({
        operationType: OperationType.add_students_to_course,
        module: 'course',
        targetType: 'course',
        targetId: courseId,
        affectedIds: studentIds,
        operatorId,
        operatorRole,
        success: false,
        errorMessage: error.message,
        details: { courseName: course.name, studentCount: studentIds.length },
      });
      throw error;
    }
  }

  // 按班级批量添加学生到课程
  async addClassToCourse(dto: AddClassToCourseDto) {
    const { courseId, classId, operatorId, operatorRole, notes } = dto;

    // 获取班级信息和学生列表
    const studentClass = await this.prisma.studentClass.findUnique({
      where: { id: classId },
      include: {
        students: {
          where: {
            isActive: true,
            role: 'student',
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true,
            major: true,
          }
        }
      }
    });

    if (!studentClass) {
      throw new NotFoundException('班级不存在');
    }

    if (studentClass.students.length === 0) {
      throw new BadRequestException('该班级没有活跃学生');
    }

    const studentIds = studentClass.students.map(s => s.id);

    // 调用添加学生方法
    const result = await this.addStudentsToCourse({
      courseId,
      studentIds,
      operatorId,
      operatorRole,
      notes: notes || `批量添加班级 ${studentClass.className} 的学生`,
    });

    // 额外记录批量操作日志
    await this.operationLogService.log({
      operationType: OperationType.batch_add_class_to_course,
      module: 'course',
      targetType: 'class',
      targetId: classId,
      affectedIds: studentIds,
      operatorId,
      operatorRole,
      details: {
        className: studentClass.className,
        classCode: studentClass.classCode,
        courseId,
        totalStudents: studentClass.students.length,
      },
      notes: `批量添加班级 ${studentClass.className} 到课程`,
    });

    return {
      ...result,
      classInfo: {
        id: studentClass.id,
        name: studentClass.className,
        code: studentClass.classCode,
        totalStudents: studentClass.students.length,
      },
      message: `成功添加班级 ${studentClass.className} 的 ${result.addedCount} 名学生到课程`,
    };
  }

  // 从课程中移除学生（删除enrollment记录）
  async removeStudentsFromCourse(dto: RemoveStudentsFromCourseDto) {
    const { courseId, studentIds, operatorId, operatorRole, notes } = dto;

    // 验证课程存在
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        name: true,
        courseCode: true,
        teacherId: true,
      }
    });

    if (!course) {
      throw new NotFoundException('课程不存在');
    }

    // 权限验证
    if (operatorRole === 'teacher' && course.teacherId !== operatorId) {
      throw new ForbiddenException('无权管理此课程学生');
    }

    // 获取要移除的enrollment记录
    const enrollmentsToRemove = await this.prisma.enrollment.findMany({
      where: {
        courseId,
        studentId: { in: studentIds }
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true,
            className: true,
          }
        }
      }
    });

    if (enrollmentsToRemove.length === 0) {
      throw new BadRequestException('没有找到要移除的学生记录');
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 删除enrollment记录
        await tx.enrollment.deleteMany({
          where: {
            courseId,
            studentId: { in: studentIds }
          }
        });

        return { removedCount: enrollmentsToRemove.length };
      });

      // 记录操作日志
      await this.operationLogService.log({
        operationType: OperationType.remove_students_from_course,
        module: 'course',
        targetType: 'course',
        targetId: courseId,
        affectedIds: studentIds,
        operatorId,
        operatorRole,
        details: {
          courseName: course.name,
          courseCode: course.courseCode,
          removedStudentCount: result.removedCount,
          studentNames: enrollmentsToRemove.map(e => 
            `${e.student.firstName}${e.student.lastName}(${e.student.studentId})`
          ),
        },
        beforeData: {
          enrollmentIds: enrollmentsToRemove.map(e => e.id),
        },
        notes: notes || `从课程 ${course.name} 移除 ${result.removedCount} 名学生`,
      });

      return {
        success: true,
        removedCount: result.removedCount,
        message: `成功从课程移除 ${result.removedCount} 名学生`,
        studentsRemoved: enrollmentsToRemove.map(e => e.student),
      };
    } catch (error) {
      // 记录失败日志
      await this.operationLogService.log({
        operationType: OperationType.remove_students_from_course,
        module: 'course',
        targetType: 'course',
        targetId: courseId,
        affectedIds: studentIds,
        operatorId,
        operatorRole,
        success: false,
        errorMessage: error.message,
      });
      throw error;
    }
  }

  // 获取课程学生列表（基于enrollment表）
  async getCourseStudents(courseId: string, params?: {
    page?: number;
    limit?: number;
    search?: string;
    className?: string;
    major?: string;
  }) {
    const { page = 1, limit = 50, search, className, major } = params || {};

    const where: any = {
      courseId,
      status: 'active',
    };

    // 构建学生筛选条件
    if (search || className || major) {
      where.student = {};
      if (search) {
        where.student.OR = [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { studentId: { contains: search } },
          { email: { contains: search } },
        ];
      }
      if (className) {
        where.student.className = { contains: className };
      }
      if (major) {
        where.student.major = { contains: major };
      }
    }

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentId: true,
              email: true,
              className: true,
              major: true,
              grade: true,
              department: true,
              isActive: true,
            }
          }
        },
        orderBy: [
          { student: { className: 'asc' } },
          { student: { studentId: 'asc' } }
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.enrollment.count({ where })
    ]);

    // 计算班级分布统计
    const classDistribution = await this.prisma.enrollment.groupBy({
      by: ['studentId'],
      where: { courseId, status: 'active' },
      _count: true,
    });

    // 按班级分组统计
    const classStats = await this.prisma.enrollment.findMany({
      where: { courseId, status: 'active' },
      select: {
        student: {
          select: { className: true }
        }
      }
    });

    const classCounts = classStats.reduce((acc, item) => {
      const className = item.student.className || '未分班';
      acc[className] = (acc[className] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      data: enrollments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      classDistribution: Object.entries(classCounts).map(([className, count]) => ({
        className,
        count
      }))
    };
  }

  // 获取可添加到课程的学生（未选此课程的学生）
  async getAvailableStudents(courseId: string, params?: {
    search?: string;
    className?: string;
    major?: string;
    department?: string;
    grade?: string;
  }) {
    const { search, className, major, department, grade } = params || {};

    // 获取已选此课程的学生ID
    const enrolledStudentIds = await this.prisma.enrollment.findMany({
      where: { courseId, status: 'active' },
      select: { studentId: true }
    });

    const enrolledIds = enrolledStudentIds.map(e => e.studentId);

    const where: any = {
      role: 'student',
      isActive: true,
      id: { notIn: enrolledIds }, // 排除已选课的学生
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { studentId: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (className) where.className = { contains: className };
    if (major) where.major = { contains: major };
    if (department) where.department = { contains: department };
    if (grade) where.grade = grade;

    const students = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        studentId: true,
        email: true,
        className: true,
        major: true,
        grade: true,
        department: true,
      },
      orderBy: [
        { className: 'asc' },
        { studentId: 'asc' }
      ]
    });

    return students;
  }

  // 获取班级列表（用于批量添加）
  async getAvailableClasses(params?: {
    department?: string;
    major?: string;
    grade?: string;
  }) {
    const { department, major, grade } = params || {};

    const where: any = {
      isActive: true,
    };

    if (department) where.department = { contains: department };
    if (major) where.major = { contains: major };
    if (grade) where.grade = grade;

    const classes = await this.prisma.studentClass.findMany({
      where,
      select: {
        id: true,
        className: true,
        classCode: true,
        department: true,
        major: true,
        grade: true,
        totalStudents: true,
        _count: {
          select: { students: true }
        }
      },
      orderBy: [
        { grade: 'desc' },
        { major: 'asc' },
        { className: 'asc' }
      ]
    });

    return classes;
  }

  // 工具方法：按班级分组学生
  private groupStudentsByClass(students: { className?: string; firstName: string; lastName: string }[]) {
    return students.reduce((acc, student) => {
      const className = student.className || '未分班';
      if (!acc[className]) {
        acc[className] = [];
      }
      acc[className].push(`${student.firstName}${student.lastName}`);
      return acc;
    }, {} as Record<string, string[]>);
  }
}