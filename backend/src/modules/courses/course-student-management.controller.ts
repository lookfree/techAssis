import { 
  Controller, 
  Get, 
  Post, 
  Delete,
  Body, 
  Param, 
  Query, 
  UseGuards,
  Request
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CourseStudentManagementService } from './course-student-management.service';

@ApiTags('course-student-management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('courses')
export class CourseStudentManagementController {
  constructor(
    private readonly courseStudentService: CourseStudentManagementService,
  ) {}

  @Post(':id/students')
  @ApiOperation({ summary: '向课程添加学生' })
  @ApiResponse({ status: 201, description: '学生添加成功' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        studentIds: {
          type: 'array',
          items: { type: 'string' },
          description: '要添加的学生ID列表'
        },
        notes: {
          type: 'string',
          description: '操作备注'
        }
      },
      required: ['studentIds']
    }
  })
  addStudentsToCourse(
    @Param('id') courseId: string,
    @Body() body: { studentIds: string[]; notes?: string },
    @Request() req: any
  ) {
    return this.courseStudentService.addStudentsToCourse({
      courseId,
      studentIds: body.studentIds,
      operatorId: req.user.sub,
      operatorRole: req.user.role,
      notes: body.notes,
    });
  }

  @Post(':id/students/by-class')
  @ApiOperation({ summary: '按班级批量添加学生到课程' })
  @ApiResponse({ status: 201, description: '班级学生添加成功' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        classId: {
          type: 'string',
          description: '班级ID'
        },
        notes: {
          type: 'string',
          description: '操作备注'
        }
      },
      required: ['classId']
    }
  })
  addClassToCourse(
    @Param('id') courseId: string,
    @Body() body: { classId: string; notes?: string },
    @Request() req: any
  ) {
    return this.courseStudentService.addClassToCourse({
      courseId,
      classId: body.classId,
      operatorId: req.user.sub,
      operatorRole: req.user.role,
      notes: body.notes,
    });
  }

  @Delete(':id/students')
  @ApiOperation({ summary: '从课程移除学生' })
  @ApiResponse({ status: 200, description: '学生移除成功' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        studentIds: {
          type: 'array',
          items: { type: 'string' },
          description: '要移除的学生ID列表'
        },
        notes: {
          type: 'string',
          description: '操作备注'
        }
      },
      required: ['studentIds']
    }
  })
  removeStudentsFromCourse(
    @Param('id') courseId: string,
    @Body() body: { studentIds: string[]; notes?: string },
    @Request() req: any
  ) {
    return this.courseStudentService.removeStudentsFromCourse({
      courseId,
      studentIds: body.studentIds,
      operatorId: req.user.sub,
      operatorRole: req.user.role,
      notes: body.notes,
    });
  }

  @Get(':id/students')
  @ApiOperation({ summary: '获取课程学生列表' })
  @ApiResponse({ status: 200, description: '获取学生列表成功' })
  @ApiQuery({ name: 'page', type: Number, required: false, description: '页码' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: '每页数量' })
  @ApiQuery({ name: 'search', type: String, required: false, description: '搜索关键词' })
  @ApiQuery({ name: 'className', type: String, required: false, description: '班级名称筛选' })
  @ApiQuery({ name: 'major', type: String, required: false, description: '专业筛选' })
  getCourseStudents(
    @Param('id') courseId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('className') className?: string,
    @Query('major') major?: string,
  ) {
    return this.courseStudentService.getCourseStudents(courseId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      className,
      major,
    });
  }

  @Get(':id/available-students')
  @ApiOperation({ summary: '获取可添加到课程的学生列表' })
  @ApiResponse({ status: 200, description: '获取可用学生列表成功' })
  @ApiQuery({ name: 'search', type: String, required: false, description: '搜索关键词' })
  @ApiQuery({ name: 'className', type: String, required: false, description: '班级名称筛选' })
  @ApiQuery({ name: 'major', type: String, required: false, description: '专业筛选' })
  @ApiQuery({ name: 'department', type: String, required: false, description: '院系筛选' })
  @ApiQuery({ name: 'grade', type: String, required: false, description: '年级筛选' })
  getAvailableStudents(
    @Param('id') courseId: string,
    @Query('search') search?: string,
    @Query('className') className?: string,
    @Query('major') major?: string,
    @Query('department') department?: string,
    @Query('grade') grade?: string,
  ) {
    return this.courseStudentService.getAvailableStudents(courseId, {
      search,
      className,
      major,
      department,
      grade,
    });
  }

  @Get(':id/available-classes')
  @ApiOperation({ summary: '获取可批量添加的班级列表' })
  @ApiResponse({ status: 200, description: '获取可用班级列表成功' })
  @ApiQuery({ name: 'department', type: String, required: false, description: '院系筛选' })
  @ApiQuery({ name: 'major', type: String, required: false, description: '专业筛选' })
  @ApiQuery({ name: 'grade', type: String, required: false, description: '年级筛选' })
  getAvailableClasses(
    @Param('id') courseId: string,
    @Query('department') department?: string,
    @Query('major') major?: string,
    @Query('grade') grade?: string,
  ) {
    return this.courseStudentService.getAvailableClasses({
      department,
      major,
      grade,
    });
  }
}

@ApiTags('student-classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('student-classes')
export class StudentClassController {
  constructor(
    private readonly courseStudentService: CourseStudentManagementService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取班级列表' })
  @ApiResponse({ status: 200, description: '获取班级列表成功' })
  @ApiQuery({ name: 'department', type: String, required: false })
  @ApiQuery({ name: 'major', type: String, required: false })
  @ApiQuery({ name: 'grade', type: String, required: false })
  getClasses(
    @Query('department') department?: string,
    @Query('major') major?: string,
    @Query('grade') grade?: string,
  ) {
    return this.courseStudentService.getAvailableClasses({
      department,
      major,
      grade,
    });
  }
}