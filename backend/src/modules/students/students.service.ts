import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async getStudentStats(studentId: string) {
    // 获取学生统计数据
    const enrollmentCount = await this.prisma.enrollment.count({
      where: { studentId: studentId },
    });

    const attendanceCount = await this.prisma.attendance.count({
      where: { 
        studentId: studentId,
        status: { in: ['present', 'late'] }
      },
    });

    const totalSessions = await this.prisma.attendance.count({
      where: { studentId: studentId },
    });

    const attendanceRate = totalSessions > 0 ? (attendanceCount / totalSessions) * 100 : 0;

    return {
      enrolledCourses: enrollmentCount,
      attendanceRate: Math.round(attendanceRate),
      totalAttended: attendanceCount,
      totalSessions,
    };
  }

  async getTodaySchedule(studentId: string) {
    const today = new Date().toISOString().split('T')[0];

    // 获取今日课程安排
    const sessions = await this.prisma.attendanceSession.findMany({
      where: {
        sessionDate: today,
        course: {
          enrollments: {
            some: { studentId: studentId },
          },
        },
      },
      include: {
        course: {
          include: {
            teacher: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Get classroom info for sessions that have a classroomId
    const sessionsWithClassrooms = await Promise.all(
      sessions.map(async (session) => {
        let classroom = null;
        if (session.classroomId) {
          classroom = await this.prisma.classroom.findUnique({
            where: { id: session.classroomId },
            select: {
              name: true,
              location: true,
            },
          });
        }
        
        return {
          id: session.id,
          courseName: session.course.name,
          courseCode: session.course.courseCode,
          teacher: `${session.course.teacher.firstName} ${session.course.teacher.lastName}`,
          time: session.timeSlot,
          location: classroom?.name || '待定',
          status: session.status,
        };
      })
    );

    return sessionsWithClassrooms;
  }
}