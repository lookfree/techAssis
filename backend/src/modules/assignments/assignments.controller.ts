import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto, GradeSubmissionDto } from './dto';

@ApiTags('assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  @ApiOperation({ summary: '获取作业列表' })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Query('courseId') courseId?: string,
    @Query('status') status?: string,
    @Request() req?
  ) {
    const params: any = {};
    
    if (courseId) {
      params.courseId = courseId;
    }
    
    if (status) {
      params.status = status;
    }

    const teacherId = req?.user?.role === 'teacher' ? req.user.id : undefined;
    return this.assignmentsService.findAll(params, teacherId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '创建作业' })
  create(@Body() createAssignmentDto: CreateAssignmentDto, @Request() req) {
    return this.assignmentsService.create(req.user.id, createAssignmentDto);
  }

  @Get(':id/submissions')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '获取作业提交列表' })
  getSubmissions(@Param('id') assignmentId: string, @Request() req) {
    const teacherId = req.user.role === 'teacher' ? req.user.id : undefined;
    return this.assignmentsService.getSubmissions(assignmentId, teacherId);
  }

  @Put(':id/publish')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '发布作业' })
  publishAssignment(@Param('id') id: string, @Request() req) {
    return this.assignmentsService.publishAssignment(id, req.user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '删除作业' })
  remove(@Param('id') id: string, @Request() req) {
    return this.assignmentsService.remove(id, req.user.id);
  }

  @Post(':id/grade')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '批改作业' })
  gradeSubmission(
    @Param('id') assignmentId: string,
    @Body() gradeSubmissionDto: GradeSubmissionDto,
    @Request() req
  ) {
    return this.assignmentsService.gradeSubmission(assignmentId, gradeSubmissionDto, req.user.id);
  }

  @Post(':id/ai-grade')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: 'AI智能批改' })
  aiGradeSubmissions(@Param('id') assignmentId: string, @Request() req) {
    return this.assignmentsService.aiGradeSubmissions(assignmentId, req.user.id);
  }

  @Get(':id/export-grades')
  @UseGuards(RolesGuard)
  @Roles('teacher', 'super_admin', 'department_admin')
  @ApiOperation({ summary: '导出成绩' })
  @ApiQuery({ name: 'format', required: false })
  exportGrades(
    @Param('id') assignmentId: string,
    @Query('format') format?: string,
    @Request() req?
  ) {
    return this.assignmentsService.exportGrades(assignmentId, format || 'excel', req.user.id);
  }
}