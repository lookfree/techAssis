import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StudentsService } from './students.service';

@ApiTags('students')
@Controller('student')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('stats')
  @ApiOperation({ summary: '获取学生统计数据' })
  @ApiResponse({ status: 200, description: '获取统计数据成功' })
  getStudentStats(@Request() req) {
    return this.studentsService.getStudentStats(req.user.id);
  }

  @Get('today-schedule')
  @ApiOperation({ summary: '获取今日课程安排' })
  @ApiResponse({ status: 200, description: '获取课程安排成功' })
  getTodaySchedule(@Request() req) {
    return this.studentsService.getTodaySchedule(req.user.id);
  }
}