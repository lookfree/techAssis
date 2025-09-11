import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(userId: string, userRole: string) {
    if (userRole === 'teacher') {
      return this.getTeacherDashboard(userId);
    } else if (userRole === 'student') {
      return this.getStudentDashboard(userId);
    } else {
      return this.getAdminDashboard();
    }
  }

  private async getTeacherDashboard(teacherId: string) {
    const [coursesCount, studentsCount, assignmentsCount, avgAttendanceRate] = await Promise.all([
      this.prisma.course.count({ where: { teacherId } }),
      this.prisma.enrollment.count({
        where: { course: { teacherId }, status: 'active' }
      }),
      this.prisma.assignment.count({ where: { teacherId } }),
      this.getAvgAttendanceRate(teacherId)
    ]);

    return {
      coursesCount,
      studentsCount,
      assignmentsCount,
      avgAttendanceRate
    };
  }

  private async getStudentDashboard(studentId: string) {
    const [coursesCount, assignmentsCount, submissionsCount, avgGrade] = await Promise.all([
      this.prisma.enrollment.count({
        where: { studentId, status: 'active' }
      }),
      this.prisma.assignment.count({
        where: { course: { enrollments: { some: { studentId } } } }
      }),
      this.prisma.submission.count({ where: { studentId } }),
      this.getAvgGrade(studentId)
    ]);

    return {
      coursesCount,
      assignmentsCount,
      submissionsCount,
      avgGrade
    };
  }

  private async getAdminDashboard() {
    const [usersCount, coursesCount, totalEnrollments, totalAttendance] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.course.count(),
      this.prisma.enrollment.count(),
      this.prisma.attendance.count()
    ]);

    return {
      usersCount,
      coursesCount,
      totalEnrollments,
      totalAttendance
    };
  }

  private async getAvgAttendanceRate(teacherId: string): Promise<number> {
    // 计算教师课程的平均出勤率
    const result = await this.prisma.attendance.groupBy({
      by: ['status'],
      where: { course: { teacherId } },
      _count: { status: true }
    });

    const total = result.reduce((sum, r) => sum + r._count.status, 0);
    const present = result.find(r => r.status === 'present')?._count.status || 0;
    const late = result.find(r => r.status === 'late')?._count.status || 0;
    
    return total > 0 ? Math.round(((present + late) / total) * 10000) / 100 : 0;
  }

  private async getAvgGrade(studentId: string): Promise<number> {
    const result = await this.prisma.grade.aggregate({
      where: { studentId },
      _avg: { percentage: true }
    });

    return Math.round((result._avg.percentage || 0) * 100) / 100;
  }
}