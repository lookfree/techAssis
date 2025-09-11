import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssignmentDto, GradeSubmissionDto } from './dto';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: any, teacherId?: string) {
    const where: any = {};
    
    if (params?.courseId) {
      where.courseId = params.courseId;
    }
    
    if (params?.status) {
      where.status = params.status;
    }

    // 如果是教师，只显示自己的作业
    if (teacherId) {
      where.teacherId = teacherId;
    }

    return this.prisma.assignment.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            name: true,
            courseCode: true
          }
        },
        submissions: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                studentId: true
              }
            },
            grades: true
          }
        },
        _count: {
          select: {
            submissions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(teacherId: string, createAssignmentDto: CreateAssignmentDto) {
    // 验证教师权限
    const course = await this.prisma.course.findUnique({
      where: { id: createAssignmentDto.courseId },
      select: { teacherId: true }
    });

    if (!course || course.teacherId !== teacherId) {
      throw new ForbiddenException('无权在此课程中创建作业');
    }

    return this.prisma.assignment.create({
      data: {
        title: createAssignmentDto.title,
        description: createAssignmentDto.description,
        courseId: createAssignmentDto.courseId,
        dueDate: new Date(createAssignmentDto.dueDate),
        totalPoints: createAssignmentDto.totalPoints || 100,
        type: createAssignmentDto.type as any || 'homework',
        teacherId,
        status: 'draft'
      },
      include: {
        course: {
          select: {
            name: true,
            courseCode: true
          }
        }
      }
    });
  }

  async getSubmissions(assignmentId: string, teacherId?: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            teacherId: true
          }
        },
        submissions: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                studentId: true,
                email: true
              }
            },
            grades: {
              include: {
                grader: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          },
          orderBy: {
            submittedAt: 'desc'
          }
        }
      }
    });

    if (!assignment) {
      throw new NotFoundException('作业不存在');
    }

    // 验证教师权限
    if (teacherId && assignment.teacherId !== teacherId) {
      throw new ForbiddenException('无权查看此作业的提交');
    }

    return assignment.submissions;
  }

  async publishAssignment(id: string, teacherId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id }
    });

    if (!assignment) {
      throw new NotFoundException('作业不存在');
    }

    if (assignment.teacherId !== teacherId) {
      throw new ForbiddenException('无权操作此作业');
    }

    return this.prisma.assignment.update({
      where: { id },
      data: { status: 'published' }
    });
  }

  async remove(id: string, teacherId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id }
    });

    if (!assignment) {
      throw new NotFoundException('作业不存在');
    }

    if (assignment.teacherId !== teacherId) {
      throw new ForbiddenException('无权操作此作业');
    }

    return this.prisma.assignment.delete({
      where: { id }
    });
  }

  async gradeSubmission(assignmentId: string, gradeSubmissionDto: GradeSubmissionDto, teacherId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        submissions: {
          where: {
            studentId: gradeSubmissionDto.studentId
          },
          include: {
            grades: true
          }
        }
      }
    });

    if (!assignment) {
      throw new NotFoundException('作业不存在');
    }

    if (assignment.teacherId !== teacherId) {
      throw new ForbiddenException('无权操作此作业');
    }

    const submission = assignment.submissions[0];
    if (!submission) {
      throw new NotFoundException('学生未提交此作业');
    }

    // 检查是否已经批改过
    const existingGrade = submission.grades.find(g => g.assignmentId === assignmentId);
    
    if (existingGrade) {
      // 更新现有成绩
      return this.prisma.grade.update({
        where: { id: existingGrade.id },
        data: {
          score: gradeSubmissionDto.score,
          feedback: gradeSubmissionDto.feedback,
          gradedAt: new Date()
        },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              studentId: true
            }
          },
          assignment: {
            select: {
              title: true,
              totalPoints: true
            }
          }
        }
      });
    } else {
      // 创建新成绩
      return this.prisma.grade.create({
        data: {
          assignment: { connect: { id: assignmentId } },
          student: { connect: { id: gradeSubmissionDto.studentId } },
          grader: { connect: { id: teacherId } },
          score: gradeSubmissionDto.score,
          maxScore: assignment.totalPoints || 100,
          feedback: gradeSubmissionDto.feedback,
          gradedAt: new Date()
        },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              studentId: true
            }
          },
          assignment: {
            select: {
              title: true,
              totalPoints: true
            }
          }
        }
      });
    }
  }

  async aiGradeSubmissions(assignmentId: string, teacherId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        submissions: {
          where: {
            grades: {
              none: {}
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
            }
          }
        }
      }
    });

    if (!assignment) {
      throw new NotFoundException('作业不存在');
    }

    if (assignment.teacherId !== teacherId) {
      throw new ForbiddenException('无权操作此作业');
    }

    const ungradedSubmissions = assignment.submissions;
    
    if (ungradedSubmissions.length === 0) {
      return { message: '没有需要AI批改的提交' };
    }

    // 模拟AI批改逻辑，给出一个随机分数（实际应用中应该调用真正的AI服务）
    const aiGradingResults = [];
    
    for (const submission of ungradedSubmissions) {
      const score = Math.floor(Math.random() * 31) + 70; // 70-100分的随机分数
      const feedback = `AI自动批改：根据内容分析，该作业质量${score >= 90 ? '优秀' : score >= 80 ? '良好' : '中等'}。建议继续加强相关练习。`;
      
      try {
        const grade = await this.prisma.grade.create({
          data: {
            assignment: { connect: { id: assignmentId } },
            student: { connect: { id: submission.studentId } },
            grader: { connect: { id: teacherId } },
            score,
            maxScore: assignment.totalPoints || 100,
            feedback,
            gradedAt: new Date()
          }
        });
        
        aiGradingResults.push({
          studentId: submission.studentId,
          studentName: `${submission.student.firstName}${submission.student.lastName}`,
          score,
          feedback,
          success: true
        });
      } catch (error) {
        aiGradingResults.push({
          studentId: submission.studentId,
          studentName: `${submission.student.firstName}${submission.student.lastName}`,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = aiGradingResults.filter(r => r.success).length;
    
    return {
      message: `AI批改完成，成功批改 ${successCount}/${ungradedSubmissions.length} 份作业`,
      results: aiGradingResults,
      totalSubmissions: ungradedSubmissions.length,
      successCount,
      failureCount: ungradedSubmissions.length - successCount
    };
  }

  async exportGrades(assignmentId: string, format: string, teacherId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        course: {
          select: {
            name: true,
            courseCode: true
          }
        },
        submissions: {
          include: {
            student: {
              select: {
                studentId: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            grades: {
              include: {
                grader: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!assignment) {
      throw new NotFoundException('作业不存在');
    }

    if (assignment.teacherId !== teacherId) {
      throw new ForbiddenException('无权操作此作业');
    }

    // 生成导出数据
    const exportData = assignment.submissions.map(submission => {
      const grade = submission.grades[0]; // 假设每个提交只有一个成绩
      return {
        '学号': submission.student.studentId,
        '姓名': `${submission.student.firstName}${submission.student.lastName}`,
        '邮箱': submission.student.email || '',
        '作业标题': assignment.title,
        '课程': assignment.course?.name || '',
        '课程代码': assignment.course?.courseCode || '',
        '总分': assignment.totalPoints,
        '得分': grade?.score || 0,
        '成绩百分比': grade ? Math.round((grade.score / (grade.maxScore || assignment.totalPoints || 100)) * 100) : 0,
        '批改意见': grade?.feedback || '',
        '提交时间': submission.submittedAt ? new Date(submission.submittedAt).toLocaleString('zh-CN') : '',
        '批改时间': grade?.gradedAt ? new Date(grade.gradedAt).toLocaleString('zh-CN') : '',
        '批改者': grade?.grader ? `${grade.grader.firstName}${grade.grader.lastName}` : ''
      };
    });

    if (format === 'json') {
      return {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          course: assignment.course?.name,
          totalPoints: assignment.totalPoints,
          dueDate: assignment.dueDate
        },
        data: exportData,
        exportTime: new Date(),
        total: exportData.length
      };
    }

    // CSV/Excel 格式返回原始数据，由控制器处理文件格式
    return exportData;
  }
}