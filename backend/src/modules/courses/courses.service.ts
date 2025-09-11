import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Course, User, Prisma } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async create(teacherId: string, createCourseDto: Prisma.CourseCreateInput): Promise<Course> {
    return this.prisma.course.create({
      data: createCourseDto,
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            enrollments: true,
            assignments: true,
            attendances: true
          }
        }
      }
    });
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.CourseWhereInput;
    orderBy?: Prisma.CourseOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params || {};
    
    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        skip,
        take,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profile: true
            }
          },
          _count: {
            select: {
              enrollments: true,
              assignments: true,
              attendances: true
            }
          },
          classroomBookings: {
            include: {
              classroom: true
            }
          }
        }
      }),
      this.prisma.course.count({ where })
    ]);

    return { courses, total };
  }

  async findOne(id: string) {
    return this.prisma.course.findUnique({
      where: { id },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profile: true
          }
        },
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                studentId: true,
                profile: true
              }
            }
          }
        },
        assignments: {
          select: {
            id: true,
            title: true,
            type: true,
            dueDate: true,
            status: true,
            totalPoints: true,
            _count: {
              select: {
                submissions: true
              }
            }
          },
          orderBy: { dueDate: 'desc' }
        },
        classroomBookings: {
          include: {
            classroom: true
          }
        },
        _count: {
          select: {
            enrollments: true,
            assignments: true,
            attendances: true
          }
        }
      }
    });
  }

  async findByTeacher(teacherId: string, params?: {
    skip?: number;
    take?: number;
    semester?: string;
  }) {
    const { skip, take, semester } = params || {};
    
    const where: Prisma.CourseWhereInput = {
      teacherId,
      ...(semester && { semester })
    };

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        skip,
        take,
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              enrollments: true,
              assignments: true,
              attendances: true
            }
          },
          classroomBookings: {
            include: {
              classroom: true
            }
          }
        }
      }),
      this.prisma.course.count({ where })
    ]);

    return { courses, total };
  }

  async findByStudent(studentId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { 
        studentId,
        status: 'active'
      },
      include: {
        course: {
          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profile: true
              }
            },
            _count: {
              select: {
                enrollments: true,
                assignments: true
              }
            }
          }
        }
      }
    });

    return enrollments.map(enrollment => enrollment.course);
  }

  async update(
    id: string, 
    updateCourseDto: Prisma.CourseUpdateInput,
    teacherId?: string
  ): Promise<Course> {
    // 如果提供了teacherId，验证权限
    if (teacherId) {
      const course = await this.prisma.course.findUnique({
        where: { id },
        select: { teacherId: true }
      });

      if (!course) {
        throw new NotFoundException('课程不存在');
      }

      if (course.teacherId !== teacherId) {
        throw new ForbiddenException('无权修改此课程');
      }
    }

    return this.prisma.course.update({
      where: { id },
      data: updateCourseDto,
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            enrollments: true,
            assignments: true,
            attendances: true
          }
        }
      }
    });
  }

  async remove(id: string, teacherId?: string): Promise<Course> {
    // 如果提供了teacherId，验证权限
    if (teacherId) {
      const course = await this.prisma.course.findUnique({
        where: { id },
        select: { teacherId: true }
      });

      if (!course) {
        throw new NotFoundException('课程不存在');
      }

      if (course.teacherId !== teacherId) {
        throw new ForbiddenException('无权删除此课程');
      }
    }

    return this.prisma.course.delete({
      where: { id }
    });
  }

  // 学生选课
  async enrollStudent(courseId: string, studentId: string) {
    // 检查课程是否存在且开放选课
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { capacity: true, _count: { select: { enrollments: true } } }
    });

    if (!course) {
      throw new NotFoundException('课程不存在');
    }

    if (course._count.enrollments >= course.capacity) {
      throw new ForbiddenException('课程已满员');
    }

    // 检查是否已选课
    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId
        }
      }
    });

    if (existingEnrollment) {
      throw new ForbiddenException('已选择此课程');
    }

    return this.prisma.enrollment.create({
      data: {
        studentId,
        courseId,
        status: 'active'
      },
      include: {
        course: {
          select: {
            id: true,
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
  }

  // 退课
  async unenrollStudent(courseId: string, studentId: string) {
    return this.prisma.enrollment.delete({
      where: {
        studentId_courseId: {
          studentId,
          courseId
        }
      }
    });
  }

  // 获取课程统计
  async getCourseStats(courseId: string, teacherId?: string) {
    // 如果提供了teacherId，验证权限
    if (teacherId) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true }
      });

      if (!course) {
        throw new NotFoundException('课程不存在');
      }

      if (course.teacherId !== teacherId) {
        throw new ForbiddenException('无权查看此课程统计');
      }
    }

    const [
      enrollmentCount,
      assignmentCount,
      avgAttendanceRate,
      recentAttendance
    ] = await Promise.all([
      // 选课人数
      this.prisma.enrollment.count({
        where: { courseId, status: 'active' }
      }),

      // 作业数量
      this.prisma.assignment.count({
        where: { courseId }
      }),

      // 平均出勤率
      this.prisma.attendance.aggregate({
        where: { 
          courseId,
          status: 'present'
        },
        _count: true
      }).then(async (presentCount) => {
        const totalSessions = await this.prisma.attendance.count({
          where: { courseId }
        });
        return totalSessions > 0 ? (presentCount._count / totalSessions) * 100 : 0;
      }),

      // 最近考勤情况
      this.prisma.attendance.findMany({
        where: { courseId },
        orderBy: { sessionDate: 'desc' },
        take: 10,
        select: {
          sessionDate: true,
          sessionNumber: true,
          status: true
        }
      })
    ]);

    return {
      enrollmentCount,
      assignmentCount,
      avgAttendanceRate: Math.round(avgAttendanceRate * 100) / 100,
      recentAttendance
    };
  }

  // 批量导入学生
  async bulkEnrollStudents(courseId: string, studentEmails: string[]) {
    // 查找学生ID
    const students = await this.prisma.user.findMany({
      where: {
        email: { in: studentEmails },
        role: 'student'
      },
      select: { id: true, email: true }
    });

    if (students.length !== studentEmails.length) {
      const foundEmails = students.map(s => s.email);
      const notFound = studentEmails.filter(email => !foundEmails.includes(email));
      throw new NotFoundException(`以下学生未找到: ${notFound.join(', ')}`);
    }

    // 批量创建选课记录
    const enrollments = await Promise.all(
      students.map(student =>
        this.prisma.enrollment.upsert({
          where: {
            studentId_courseId: {
              studentId: student.id,
              courseId
            }
          },
          update: { status: 'active' },
          create: {
            studentId: student.id,
            courseId,
            status: 'active'
          }
        })
      )
    );

    return {
      enrolled: enrollments.length,
      students: students.map(s => s.email)
    };
  }

  // PPT管理方法
  async uploadPPT(courseId: string, fileName: string, fileUrl: string, teacherId?: string) {
    // 如果提供了teacherId，验证权限
    if (teacherId) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true }
      });

      if (!course) {
        throw new NotFoundException('课程不存在');
      }

      if (course.teacherId !== teacherId) {
        throw new ForbiddenException('无权上传PPT到此课程');
      }
    }

    // 首先获取现有的PPT文件列表
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { pptFiles: true }
    });

    if (!course) {
      throw new NotFoundException('课程不存在');
    }

    // 获取现有的PPT文件列表，如果为空则创建新数组
    const existingFiles = Array.isArray(course.pptFiles) ? course.pptFiles as any[] : [];
    
    // 设置所有现有文件为非活动状态
    const updatedFiles = existingFiles.map(file => ({
      ...file,
      isActive: false
    }));
    
    // 添加新上传的文件，设置为活动状态
    const newFile = {
      fileName,
      fileUrl,
      uploadedAt: new Date().toISOString(),
      isActive: true
    };
    
    updatedFiles.push(newFile);

    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        pptFiles: updatedFiles
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
  }

  async getPPTFiles(courseId: string) {
    console.log(`[PPT Service] === SERVICE METHOD CALLED ===`);
    console.log(`[PPT Service] Getting PPT files for courseId: ${courseId}`);
    
    try {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { pptFiles: true }
      });

      console.log(`[PPT Service] Course found:`, course);

      if (!course) {
        console.log(`[PPT Service] Course not found with id: ${courseId}`);
        throw new NotFoundException('课程不存在');
      }

      // 确保返回的是数组格式
      const files = course.pptFiles;
      console.log(`[PPT Service] Raw pptFiles from database:`, files);
      console.log(`[PPT Service] Files type:`, typeof files);
      console.log(`[PPT Service] Files is array:`, Array.isArray(files));
      
      if (!files) {
        console.log(`[PPT Service] No files found, returning empty array`);
        return [];
      }

      // 如果是对象而不是数组，尝试转换
      if (typeof files === 'object' && !Array.isArray(files)) {
        console.log(`[PPT Service] Converting object to array`);
        console.log(`[PPT Service] Object keys:`, Object.keys(files));
        console.log(`[PPT Service] Object values:`, Object.values(files));
        console.log(`[PPT Service] Full object:`, JSON.stringify(files, null, 2));
        
        // 如果是单个PPT对象，转换为数组
        if (files.fileName && files.fileUrl) {
          const result = [files];
          console.log(`[PPT Service] Converted single object to array:`, result);
          return result;
        }
        
        // 检查是否有嵌套的PPT数据
        const objectKeys = Object.keys(files);
        if (objectKeys.length > 0) {
          console.log(`[PPT Service] Checking for nested PPT data in keys:`, objectKeys);
          
          // 特别处理 "push" 键结构
          if ((files as any).push) {
            const pushValue = (files as any).push;
            console.log(`[PPT Service] Found push key with value:`, pushValue);
            if (pushValue && typeof pushValue === 'object' && pushValue.fileName && pushValue.fileUrl) {
              console.log(`[PPT Service] Found PPT data in "push" key:`, pushValue);
              
              // Fix encoding for Chinese filename
              const fixedFileName = Buffer.from(pushValue.fileName, 'latin1').toString('utf8');
              console.log(`[PPT Service] Fixed encoding from "${pushValue.fileName}" to "${fixedFileName}"`);
              
              const result = [{
                ...pushValue,
                fileName: fixedFileName
              }];
              console.log(`[PPT Service] Converted push object to array with fixed encoding:`, result);
              return result;
            }
          }
          
          // 尝试从对象的值中提取PPT数据
          for (const key of objectKeys) {
            const value = (files as any)[key];
            if (value && typeof value === 'object') {
              // 检查是否是PPT对象 (需要类型断言)
              const pptValue = value as any;
              if (pptValue.fileName && pptValue.fileUrl) {
                console.log(`[PPT Service] Found PPT data in key "${key}":`, value);
                
                // Fix encoding for Chinese filename
                const fixedFileName = Buffer.from(pptValue.fileName, 'latin1').toString('utf8');
                console.log(`[PPT Service] Fixed encoding from "${pptValue.fileName}" to "${fixedFileName}"`);
                
                const result = [{
                  ...pptValue,
                  fileName: fixedFileName
                }];
                console.log(`[PPT Service] Converted nested object to array with fixed encoding:`, result);
                return result;
              }
            }
          }
        }
        
        // 如果是其他格式，返回空数组
        console.log(`[PPT Service] Unknown object format, returning empty array`);
        return [];
      }

      if (Array.isArray(files)) {
        console.log(`[PPT Service] Returning ${files.length} files:`, files);
        return files;
      }

      console.log(`[PPT Service] Unexpected data type, returning empty array`);
      return [];
    } catch (error) {
      console.error(`[PPT Service] Error in getPPTFiles:`, error);
      throw error;
    }
  }

  async deletePPT(courseId: string, fileName: string, teacherId?: string) {
    // 如果提供了teacherId，验证权限
    if (teacherId) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true, pptFiles: true }
      });

      if (!course) {
        throw new NotFoundException('课程不存在');
      }

      if (course.teacherId !== teacherId) {
        throw new ForbiddenException('无权删除此课程的PPT');
      }

      // 过滤掉要删除的文件
      const pptFilesArray = Array.isArray(course.pptFiles) ? course.pptFiles : [];
      const updatedPptFiles = pptFilesArray.filter(
        (file: any) => file.fileName !== fileName
      );

      return this.prisma.course.update({
        where: { id: courseId },
        data: {
          pptFiles: updatedPptFiles
        }
      });
    }
  }

  async setActivePPT(courseId: string, fileName: string, teacherId?: string) {
    if (teacherId) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true, pptFiles: true }
      });

      if (!course) {
        throw new NotFoundException('课程不存在');
      }

      if (course.teacherId !== teacherId) {
        throw new ForbiddenException('无权设置此课程的活动PPT');
      }

      // 将所有PPT设置为非活动状态，然后设置指定的为活动状态
      const pptFilesArray = Array.isArray(course.pptFiles) ? course.pptFiles : [];
      const updatedPptFiles = pptFilesArray.map((file: any) => ({
        ...file,
        isActive: file.fileName === fileName
      }));

      return this.prisma.course.update({
        where: { id: courseId },
        data: {
          pptFiles: updatedPptFiles
        }
      });
    }
  }

  // 添加学生到课程
  async addStudentToCourse(
    courseId: string, 
    studentData: { 
      studentId: string; 
      firstName: string; 
      lastName: string; 
      email: string; 
      phone?: string; 
      major?: string; 
      grade?: string;
    },
    teacherId?: string
  ) {
    // 验证课程权限
    if (teacherId) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true }
      });

      if (!course) {
        throw new NotFoundException('课程不存在');
      }

      if (course.teacherId !== teacherId) {
        throw new ForbiddenException('无权操作此课程');
      }
    }

    // 检查学生是否存在，如果不存在则创建
    let student = await this.prisma.user.findUnique({
      where: { email: studentData.email }
    });

    if (!student) {
      // 创建新学生
      student = await this.prisma.user.create({
        data: {
          ...studentData,
          role: 'student',
          password: '$2b$10$defaultpassword' // 默认密码，实际应该生成随机密码
        }
      });
    }

    // 检查是否已经选课
    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: student.id,
          courseId
        }
      }
    });

    if (existingEnrollment) {
      throw new Error('学生已经选择了此课程');
    }

    // 创建选课记录
    return this.prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseId,
        status: 'active'
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            major: true,
            grade: true
          }
        }
      }
    });
  }

  // 从课程移除学生
  async removeStudentFromCourse(courseId: string, studentId: string, teacherId?: string) {
    // 验证课程权限
    if (teacherId) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true }
      });

      if (!course) {
        throw new NotFoundException('课程不存在');
      }

      if (course.teacherId !== teacherId) {
        throw new ForbiddenException('无权操作此课程');
      }
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId
        }
      }
    });

    if (!enrollment) {
      throw new NotFoundException('选课记录不存在');
    }

    return this.prisma.enrollment.delete({
      where: {
        studentId_courseId: {
          studentId,
          courseId
        }
      }
    });
  }

  // 批量导入学生
  async importStudentsToCourse(
    courseId: string,
    studentsData: Array<{
      studentId: string;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      major?: string;
      grade?: string;
    }>,
    teacherId?: string
  ) {
    // 验证课程权限
    if (teacherId) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true }
      });

      if (!course) {
        throw new NotFoundException('课程不存在');
      }

      if (course.teacherId !== teacherId) {
        throw new ForbiddenException('无权操作此课程');
      }
    }

    const results = {
      success: [],
      failed: [],
      total: studentsData.length
    };

    for (const studentData of studentsData) {
      try {
        // 检查学生是否存在
        let student = await this.prisma.user.findUnique({
          where: { email: studentData.email }
        });

        if (!student) {
          // 创建新学生
          student = await this.prisma.user.create({
            data: {
              ...studentData,
              role: 'student',
              password: '$2b$10$defaultpassword' // 默认密码
            }
          });
        }

        // 检查是否已经选课
        const existingEnrollment = await this.prisma.enrollment.findUnique({
          where: {
            studentId_courseId: {
              studentId: student.id,
              courseId
            }
          }
        });

        if (!existingEnrollment) {
          // 创建选课记录
          await this.prisma.enrollment.create({
            data: {
              studentId: student.id,
              courseId,
              status: 'active'
            }
          });
        }

        results.success.push({
          email: studentData.email,
          name: `${studentData.firstName}${studentData.lastName}`
        });
      } catch (error) {
        results.failed.push({
          email: studentData.email,
          error: error.message
        });
      }
    }

    return results;
  }

  // 获取课程学生列表
  async getCourseStudents(courseId: string, teacherId?: string) {
    // 验证课程权限
    if (teacherId) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true }
      });

      if (!course) {
        throw new NotFoundException('课程不存在');
      }

      if (course.teacherId !== teacherId) {
        throw new ForbiddenException('无权查看此课程学生');
      }
    }

    return this.prisma.enrollment.findMany({
      where: {
        courseId,
        status: 'active'
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            major: true,
            grade: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
}// trigger recompilation
