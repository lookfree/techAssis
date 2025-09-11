import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards 
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClassroomsService } from './classrooms.service';
import { ClassroomTemplateService } from './classroom-template.service';
import { ClassroomBookingService } from './classroom-booking.service';
import { 
  CreateClassroomDto, 
  UpdateClassroomDto,
  StartClassDto, 
  SeatSelectionDto,
  CreateClassroomTemplateDto,
  CreateClassroomBookingDto,
  CheckTimeAvailabilityDto,
  ClassroomType,
  SeatStatus,
  SeatType,
} from './dto';

@ApiTags('classrooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('classrooms')
export class ClassroomsController {
  constructor(
    private readonly classroomsService: ClassroomsService,
    private readonly templateService: ClassroomTemplateService,
    private readonly bookingService: ClassroomBookingService,
  ) {}

  // =================== 教室模板管理 ===================
  
  @Get('templates')
  @ApiOperation({ summary: '获取教室模板列表' })
  @ApiResponse({ status: 200, description: '获取模板列表成功' })
  @ApiQuery({ name: 'type', enum: ClassroomType, required: false })
  getTemplates(@Query('type') type?: ClassroomType) {
    return this.templateService.findAll(type);
  }

  @Post('templates')
  @ApiOperation({ summary: '创建教室模板' })
  @ApiResponse({ status: 201, description: '模板创建成功' })
  createTemplate(@Body() createTemplateDto: CreateClassroomTemplateDto) {
    return this.templateService.create(createTemplateDto);
  }

  @Post('templates/create-defaults')
  @ApiOperation({ summary: '创建默认模板' })
  @ApiResponse({ status: 201, description: '默认模板创建成功' })
  createDefaultTemplates() {
    return this.templateService.createDefaultTemplates();
  }

  @Get('templates/:id')
  @ApiOperation({ summary: '获取教室模板详情' })
  @ApiResponse({ status: 200, description: '获取模板详情成功' })
  getTemplate(@Param('id') id: string) {
    return this.templateService.findOne(id);
  }

  @Put('templates/:id')
  @ApiOperation({ summary: '更新教室模板' })
  @ApiResponse({ status: 200, description: '模板更新成功' })
  updateTemplate(
    @Param('id') id: string, 
    @Body() updateTemplateDto: Partial<CreateClassroomTemplateDto>
  ) {
    return this.templateService.update(id, updateTemplateDto);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: '删除教室模板' })
  @ApiResponse({ status: 200, description: '模板删除成功' })
  deleteTemplate(@Param('id') id: string) {
    return this.templateService.remove(id);
  }

  @Post('templates/:id/set-default')
  @ApiOperation({ summary: '设置默认模板' })
  @ApiResponse({ status: 200, description: '设置默认模板成功' })
  setDefaultTemplate(@Param('id') id: string) {
    return this.templateService.setAsDefault(id);
  }

  // =================== 教室预订管理 ===================

  @Post('bookings')
  @ApiOperation({ summary: '创建教室预订' })
  @ApiResponse({ status: 201, description: '预订创建成功' })
  createBooking(@Body() createBookingDto: CreateClassroomBookingDto) {
    return this.bookingService.createBooking(createBookingDto);
  }

  @Get('bookings')
  @ApiOperation({ summary: '获取预订列表' })
  @ApiResponse({ status: 200, description: '获取预订列表成功' })
  @ApiQuery({ name: 'classroomId', required: false })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getBookings(
    @Query('classroomId') classroomId?: string,
    @Query('courseId') courseId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.bookingService.findBookings(classroomId, courseId, startDate, endDate);
  }

  @Get('bookings/:id')
  @ApiOperation({ summary: '获取预订详情' })
  @ApiResponse({ status: 200, description: '获取预订详情成功' })
  getBooking(@Param('id') id: string) {
    return this.bookingService.findOne(id);
  }

  @Put('bookings/:id')
  @ApiOperation({ summary: '更新预订' })
  @ApiResponse({ status: 200, description: '预订更新成功' })
  updateBooking(
    @Param('id') id: string, 
    @Body() updateBookingDto: Partial<CreateClassroomBookingDto>
  ) {
    return this.bookingService.updateBooking(id, updateBookingDto);
  }

  @Delete('bookings/:id')
  @ApiOperation({ summary: '取消预订' })
  @ApiResponse({ status: 200, description: '预订取消成功' })
  cancelBooking(@Param('id') id: string) {
    return this.bookingService.cancelBooking(id);
  }

  @Get('search/available')
  @ApiOperation({ summary: '搜索可用教室' })
  @ApiResponse({ status: 200, description: '搜索成功' })
  @ApiQuery({ name: 'startTime', required: true })
  @ApiQuery({ name: 'endTime', required: true })
  @ApiQuery({ name: 'type', enum: ClassroomType, required: false })
  @ApiQuery({ name: 'capacity', type: Number, required: false })
  findAvailableClassrooms(
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('type') type?: ClassroomType,
    @Query('capacity') capacity?: number,
  ) {
    return this.classroomsService.getAvailableClassrooms(startTime, endTime, type, capacity);
  }

  // =================== 教室基础管理 ===================

  @Post()
  @ApiOperation({ summary: '创建教室' })
  @ApiResponse({ status: 201, description: '教室创建成功' })
  create(@Body() createClassroomDto: CreateClassroomDto) {
    return this.classroomsService.create(createClassroomDto);
  }

  @Get()
  @ApiOperation({ summary: '获取教室列表' })
  @ApiResponse({ status: 200, description: '获取教室列表成功' })
  @ApiQuery({ name: 'type', enum: ClassroomType, required: false })
  @ApiQuery({ name: 'building', required: false })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  findAll(
    @Query('type') type?: ClassroomType,
    @Query('building') building?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.classroomsService.findAll(type, building, isActive);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取教室详情' })
  @ApiResponse({ status: 200, description: '获取教室详情成功' })
  findOne(@Param('id') id: string) {
    return this.classroomsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新教室信息' })
  @ApiResponse({ status: 200, description: '教室更新成功' })
  update(@Param('id') id: string, @Body() updateClassroomDto: UpdateClassroomDto) {
    return this.classroomsService.update(id, updateClassroomDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除教室' })
  @ApiResponse({ status: 200, description: '教室删除成功' })
  remove(@Param('id') id: string) {
    return this.classroomsService.remove(id);
  }

  @Post('start-class')
  @ApiOperation({ summary: '开始上课' })
  @ApiResponse({ status: 200, description: '上课开始成功' })
  startClass(@Body() startClassDto: StartClassDto) {
    return this.classroomsService.startClass(startClassDto);
  }

  @Post('sessions/:sessionId/select-seat')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '学生选择座位签到' })
  @ApiResponse({ status: 200, description: '座位选择成功' })
  selectSeat(@Param('sessionId') sessionId: string, @Body() seatSelectionDto: SeatSelectionDto) {
    return this.classroomsService.selectSeat(sessionId, seatSelectionDto);
  }

  @Get('session/:sessionId/seat-map')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取签到会话的座位图' })
  @ApiResponse({ status: 200, description: '获取座位图成功' })
  async getSessionSeatMap(
    @Param('sessionId') sessionId: string,
    @Query('courseId') courseId: string,
    @Query('sessionDate') sessionDate?: string,
    @Query('timeSlot') timeSlot?: string
  ) {
    const defaultDate = sessionDate || new Date().toISOString().split('T')[0];
    const defaultTimeSlot = timeSlot || 'default';
    return this.classroomsService.getSessionSeatMapBySessionId(sessionId, courseId, defaultDate, defaultTimeSlot);
  }

  @Post('session/:sessionId/cancel-seat')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '取消座位选择' })
  @ApiResponse({ status: 200, description: '取消座位成功' })
  cancelSeat(
    @Param('sessionId') sessionId: string, 
    @Body() cancelSeatDto: { seatNumber: string; studentId: string; sessionDate?: string }
  ) {
    return this.classroomsService.cancelSeat(sessionId, cancelSeatDto.seatNumber, cancelSeatDto.studentId, cancelSeatDto.sessionDate);
  }

  @Get(':id/seat-map')
  @ApiOperation({ summary: '获取教室座位图' })
  @ApiResponse({ status: 200, description: '获取座位图成功' })
  getSeatMap(
    @Param('id') id: string,
    @Query('sessionDate') sessionDate?: string,
    @Query('timeSlot') timeSlot?: string
  ) {
    return this.classroomsService.getSeatMap(id, sessionDate, timeSlot);
  }

  @Post(':id/check-availability')
  @ApiOperation({ summary: '检查教室可用性' })
  @ApiResponse({ status: 200, description: '可用性检查成功' })
  checkAvailability(
    @Param('id') id: string,
    @Body() checkDto: CheckTimeAvailabilityDto
  ) {
    return this.classroomsService.checkAvailability(id, checkDto.startTime, checkDto.endTime);
  }

  @Get(':id/schedule')
  @ApiOperation({ summary: '获取教室日程安排' })
  @ApiResponse({ status: 200, description: '获取日程安排成功' })
  @ApiQuery({ name: 'date', required: false })
  getSchedule(
    @Param('id') id: string,
    @Query('date') date?: string
  ) {
    return this.classroomsService.getClassroomSchedule(id, date);
  }

  @Put(':id/seat-layout')
  @ApiOperation({ summary: '更新座位布局' })
  @ApiResponse({ status: 200, description: '座位布局更新成功' })
  updateSeatLayout(
    @Param('id') id: string,
    @Body() seatUpdates: Array<{
      seatNumber: string;
      status?: SeatStatus;
      seatType?: SeatType;
    }>
  ) {
    return this.classroomsService.updateSeatLayout(id, seatUpdates);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: '获取教室使用统计' })
  @ApiResponse({ status: 200, description: '获取统计成功' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getStatistics(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.classroomsService.getClassroomUsageStatistics(id, startDate, endDate);
  }

  @Post(':id/bind-course')
  @ApiOperation({ summary: '绑定课程到教室' })
  @ApiResponse({ status: 200, description: '课程绑定成功' })
  bindCourse(
    @Param('id') id: string,
    @Body() bindData: {
      courseId: string;
      startTime: string;
      endTime: string;
      recurring?: boolean;
      dayOfWeek?: number;
    }
  ) {
    return this.classroomsService.bindCourseToClassroom(id, bindData);
  }

  @Delete(':id/unbind-course/:courseId')
  @ApiOperation({ summary: '解绑课程与教室' })
  @ApiResponse({ status: 200, description: '课程解绑成功' })
  unbindCourse(
    @Param('id') id: string,
    @Param('courseId') courseId: string,
  ) {
    return this.classroomsService.unbindCourseFromClassroom(id, courseId);
  }
}