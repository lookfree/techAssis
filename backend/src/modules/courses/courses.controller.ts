import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  NotFoundException,
  ForbiddenException,
  ParseIntPipe,
  DefaultValuePipe,
  UseInterceptors,
  UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto, BulkEnrollDto } from './dto';

@ApiTags('courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // PPT文件上传配置
  private readonly pptStorage = diskStorage({
    destination: './uploads/ppt',
    filename: (req, file, cb) => {
      const uniqueSuffix = uuidv4();
      cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
    },
  });

  @Post()
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '创建课程' })
  @ApiResponse({ status: 201, description: '课程创建成功' })
  create(@Body() createCourseDto: CreateCourseDto, @Request() req) {
    const courseData = {
      name: createCourseDto.name,
      courseCode: createCourseDto.courseCode,
      description: createCourseDto.description,
      credits: createCourseDto.credits || 3,
      semester: createCourseDto.semester,
      schedule: createCourseDto.schedule,
      capacity: createCourseDto.capacity || 50,
      teacher: { connect: { id: req.user.id } }
    };
    return this.coursesService.create(req.user.id, courseData as any);
  }

  @Get()
  @ApiOperation({ summary: '获取课程列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  @ApiQuery({ name: 'semester', required: false, description: '学期' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('semester') semester?: string,
    @Request() req?
  ) {
    const skip = (page - 1) * limit;
    
    let where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { courseCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (semester) {
      where.semester = semester;
    }

    // 如果是学生，只显示已选课程
    if (req?.user?.role === 'student') {
      where.enrollments = {
        some: {
          studentId: req.user.id,
          status: 'active'
        }
      };
    }

    return this.coursesService.findAll({
      skip,
      take: limit,
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  @Get('teacher')
  @UseGuards(RolesGuard)
  @Roles('teacher')
  @ApiOperation({ summary: '获取教师课程列表' })
  getTeacherCourses(@Request() req) {
    return this.coursesService.findByTeacher(req.user.id);
  }

  @Get('my-courses')
  @ApiOperation({ summary: '获取我的课程' })
  async getMyCourses(@Request() req) {
    const { user } = req;
    
    if (user.role === 'teacher') {
      return this.coursesService.findByTeacher(user.id);
    } else if (user.role === 'student') {
      const courses = await this.coursesService.findByStudent(user.id);
      return { courses, total: courses.length };
    } else {
      return this.coursesService.findAll();
    }
  }

  @Get('student')
  @UseGuards(RolesGuard)
  @Roles('student')
  @ApiOperation({ summary: '学生获取选课列表' })
  async getStudentCourses(@Request() req) {
    const courses = await this.coursesService.findByStudent(req.user.id);
    return courses.map(course => ({
      ...course,
      attendanceEnabled: true, // 启用签到
      status: 'active' // 课程状态
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: '获取课程详情' })
  async findOne(@Param('id') id: string, @Request() req) {
    const course = await this.coursesService.findOne(id);
    
    if (!course) {
      throw new NotFoundException('课程不存在');
    }

    // 检查访问权限
    const { user } = req;
    if (user.role === 'student') {
      // 检查学生是否选了此课
      const isEnrolled = (course as any).enrollments && (course as any).enrollments.some(
        (enrollment: any) => enrollment.studentId === user.id && enrollment.status === 'active'
      );
      
      if (!isEnrolled) {
        throw new ForbiddenException('无权访问此课程');
      }
    } else if (user.role === 'teacher' && course.teacherId !== user.id) {
      // 教师只能查看自己的课程
      throw new ForbiddenException('无权访问此课程');
    }

    return course;
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '更新课程' })
  update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @Request() req
  ) {
    const teacherId = req.user.role === 'teacher' ? req.user.id : undefined;
    return this.coursesService.update(id, updateCourseDto as any, teacherId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '删除课程' })
  remove(@Param('id') id: string, @Request() req) {
    const teacherId = req.user.role === 'teacher' ? req.user.id : undefined;
    return this.coursesService.remove(id, teacherId);
  }

  @Post(':id/enroll')
  @UseGuards(RolesGuard)
  @Roles('student')
  @ApiOperation({ summary: '选课' })
  enrollCourse(@Param('id') courseId: string, @Request() req) {
    return this.coursesService.enrollStudent(courseId, req.user.id);
  }

  @Delete(':id/enroll')
  @UseGuards(RolesGuard)
  @Roles('student')
  @ApiOperation({ summary: '退课' })
  unenrollCourse(@Param('id') courseId: string, @Request() req) {
    return this.coursesService.unenrollStudent(courseId, req.user.id);
  }

  @Post(':id/bulk-enroll')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '批量添加学生' })
  bulkEnrollStudents(
    @Param('id') courseId: string,
    @Body() bulkEnrollDto: BulkEnrollDto,
    @Request() req
  ) {
    // 如果是教师，需要验证课程所有权
    const teacherId = req.user.role === 'teacher' ? req.user.id : undefined;
    
    return this.coursesService.bulkEnrollStudents(courseId, bulkEnrollDto.studentEmails);
  }

  @Post(':id/import-students')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '批量导入学生（Excel/CSV）' })
  async importStudents(
    @Param('id') courseId: string,
    @Body() importData: { students: Array<{ studentId: string; firstName: string; lastName: string; email: string; phone?: string; major?: string; grade?: string }> },
    @Request() req
  ) {
    const teacherId = req.user.role === 'teacher' ? req.user.id : undefined;
    return this.coursesService.importStudentsToCourse(courseId, importData.students, teacherId);
  }

  @Get(':id/stats')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '获取课程统计' })
  getCourseStats(@Param('id') courseId: string, @Request() req) {
    const teacherId = req.user.role === 'teacher' ? req.user.id : undefined;
    return this.coursesService.getCourseStats(courseId, teacherId);
  }

  @Get(':id/students')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '获取课程学生列表' })
  async getCourseStudents(@Param('id') courseId: string, @Request() req) {
    const teacherId = req.user.role === 'teacher' ? req.user.id : undefined;
    return this.coursesService.getCourseStudents(courseId, teacherId);
  }

  @Post(':id/students')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '添加学生到课程' })
  async addStudentToCourse(
    @Param('id') courseId: string,
    @Body() addStudentDto: { studentId: string; firstName: string; lastName: string; email: string; phone?: string; major?: string; grade?: string },
    @Request() req
  ) {
    const teacherId = req.user.role === 'teacher' ? req.user.id : undefined;
    return this.coursesService.addStudentToCourse(courseId, addStudentDto, teacherId);
  }

  @Delete(':id/students/:studentId')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '从课程移除学生' })
  async removeStudentFromCourse(
    @Param('id') courseId: string,
    @Param('studentId') studentId: string,
    @Request() req
  ) {
    const teacherId = req.user.role === 'teacher' ? req.user.id : undefined;
    return this.coursesService.removeStudentFromCourse(courseId, studentId, teacherId);
  }

  // PPT管理接口
  @Post(':id/ppt/upload')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @UseInterceptors(FileInterceptor('ppt', {
    storage: diskStorage({
      destination: './uploads/ppt',
      filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4();
        // Fix encoding for originalname
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, `${uniqueSuffix}${extname(originalName)}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('只支持 PPT 和 PPTX 文件格式'), false);
      }
    },
  }))
  @ApiOperation({ summary: '上传PPT文件' })
  async uploadPPT(
    @Param('id') courseId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    try {
      if (!file) {
        throw new Error('请选择要上传的PPT文件');
      }

      const fileUrl = `/uploads/ppt/${file.filename}`;
      const teacherId = req.user.role === 'teacher' ? req.user.id : undefined;

      // Fix filename encoding issue - ensure proper UTF-8 handling
      const originalFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      console.log('[PPT Upload] Original filename (raw):', file.originalname);
      console.log('[PPT Upload] Original filename (UTF-8 fixed):', originalFileName);

      const result = await this.coursesService.uploadPPT(courseId, originalFileName, fileUrl, teacherId);
      
      return {
        success: true,
        message: 'PPT上传成功',
        data: result
      };
    } catch (error) {
      throw new Error(`PPT上传失败: ${error.message}`);
    }
  }

  @Get(':id/ppt')
  @ApiOperation({ summary: '获取课程PPT列表' })
  async getPPTFiles(@Param('id') courseId: string) {
    try {
      console.log(`[PPT API] Getting PPT files for course: ${courseId}`);
      const files = await this.coursesService.getPPTFiles(courseId);
      console.log(`[PPT API] Found ${files ? files.length : 0} PPT files:`, files);
      return files;
    } catch (error) {
      console.error(`[PPT API] Error getting PPT files for course ${courseId}:`, error);
      throw error;
    }
  }

  @Delete(':id/ppt/:filename')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '删除PPT文件' })
  async deletePPT(
    @Param('id') courseId: string,
    @Param('filename') fileName: string,
    @Request() req
  ) {
    const teacherId = req.user.role === 'teacher' ? req.user.id : undefined;
    return this.coursesService.deletePPT(courseId, fileName, teacherId);
  }

  @Patch(':id/ppt/:filename/activate')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '设置活动PPT' })
  async setActivePPT(
    @Param('id') courseId: string,
    @Param('filename') fileName: string,
    @Request() req
  ) {
    const teacherId = req.user.role === 'teacher' ? req.user.id : undefined;
    return this.coursesService.setActivePPT(courseId, fileName, teacherId);
  }
}