import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum ClassroomType {
  LECTURE_HALL = 'lecture_hall',
  REGULAR = 'regular',
  LAB = 'lab',
  SEMINAR = 'seminar',
  COMPUTER = 'computer',
  CONFERENCE = 'conference',
  AUDITORIUM = 'auditorium',
}

export enum SeatType {
  REGULAR = 'regular',
  WHEELCHAIR = 'wheelchair',
  FRONT_PRIORITY = 'front_priority',
  TEACHER_DESK = 'teacher_desk',
  VIP = 'vip',
  OBSERVER = 'observer',
}

export enum SeatStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  UNAVAILABLE = 'unavailable',
  MAINTENANCE = 'maintenance',
}

export class LayoutConfigDto {
  @ApiProperty({ description: '过道位置（列号数组）', required: false })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  aisles?: number[];

  @ApiProperty({ description: '不可用座位编号数组', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  unavailableSeats?: string[];

  @ApiProperty({ description: '特殊座位配置', required: false })
  @IsOptional()
  specialSeats?: {
    wheelchair?: string[];
    reserved?: string[];
    vip?: string[];
    observer?: string[];
    frontPriority?: string[];
  };

  @ApiProperty({ description: '座位间距配置', required: false })
  @IsOptional()
  spacing?: {
    horizontal?: number;
    vertical?: number;
  };
}

export class CreateClassroomDto {
  @ApiProperty({ description: '教室名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '教室位置', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ description: '建筑物', required: false })
  @IsOptional()
  @IsString()
  building?: string;

  @ApiProperty({ description: '楼层', required: false })
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiProperty({ description: '房间号', required: false })
  @IsOptional()
  @IsString()
  room?: string;

  @ApiProperty({ description: '教室类型', enum: ClassroomType })
  @IsEnum(ClassroomType)
  type: ClassroomType;

  @ApiProperty({ description: '教室容量' })
  @IsNumber()
  capacity: number;

  @ApiProperty({ description: '排数' })
  @IsNumber()
  rows: number;

  @ApiProperty({ description: '每排座位数' })
  @IsNumber()
  seatsPerRow: number;

  @ApiProperty({ description: '座位布局配置', type: LayoutConfigDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LayoutConfigDto)
  layoutConfig?: LayoutConfigDto;

  @ApiProperty({ description: '设备清单', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipment?: string[];

  @ApiProperty({ description: '设施清单', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];

  @ApiProperty({ description: '无障碍座位数', required: false })
  @IsOptional()
  @IsNumber()
  accessibleSeats?: number;

  @ApiProperty({ description: '背景图片URL', required: false })
  @IsOptional()
  @IsString()
  backgroundImage?: string;

  @ApiProperty({ description: '是否启用座位图' })
  @IsBoolean()
  seatMapEnabled: boolean;

  @ApiProperty({ description: '是否允许自由选座' })
  @IsBoolean()
  freeSeatingEnabled: boolean;

  @ApiProperty({ description: '模板ID', required: false })
  @IsOptional()
  @IsString()
  templateId?: string;
}

export class UpdateClassroomDto {
  @ApiProperty({ description: '教室名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '教室位置', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ description: '教室类型', enum: ClassroomType, required: false })
  @IsOptional()
  @IsEnum(ClassroomType)
  type?: ClassroomType;

  @ApiProperty({ description: '教室容量', required: false })
  @IsOptional()
  @IsNumber()
  capacity?: number;

  @ApiProperty({ description: '排数', required: false })
  @IsOptional()
  @IsNumber()
  rows?: number;

  @ApiProperty({ description: '每排座位数', required: false })
  @IsOptional()
  @IsNumber()
  seatsPerRow?: number;

  @ApiProperty({ description: '座位布局配置', type: LayoutConfigDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LayoutConfigDto)
  layoutConfig?: LayoutConfigDto;

  @ApiProperty({ description: '背景图片URL', required: false })
  @IsOptional()
  @IsString()
  backgroundImage?: string;

  @ApiProperty({ description: '是否启用座位图', required: false })
  @IsOptional()
  @IsBoolean()
  seatMapEnabled?: boolean;

  @ApiProperty({ description: '是否允许自由选座', required: false })
  @IsOptional()
  @IsBoolean()
  freeSeatingEnabled?: boolean;

  @ApiProperty({ description: '教室描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class BindCourseDto {
  @ApiProperty({ description: '课程ID' })
  @IsString()
  courseId: string;
}

export class StartClassDto {
  @ApiProperty({ description: '课程ID' })
  @IsString()
  courseId: string;

  @ApiProperty({ description: '上课日期', required: false })
  @IsOptional()
  @IsString()
  sessionDate?: string;

  @ApiProperty({ description: '课节编号', required: false })
  @IsOptional()
  @IsString()
  sessionNumber?: string;
}

export class SeatSelectionDto {
  @ApiProperty({ description: '座位编号' })
  @IsString()
  seatNumber: string;

  @ApiProperty({ description: '学号' })
  @IsString()
  studentId: string;

  @ApiProperty({ description: '姓名' })
  @IsString()
  name: string;

  @ApiProperty({ description: '验证照片URL', required: false })
  @IsOptional()
  @IsString()
  verificationPhoto?: string;
}

export class CreateClassroomTemplateDto {
  @ApiProperty({ description: '模板名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '教室类型', enum: ClassroomType })
  @IsEnum(ClassroomType)
  type: ClassroomType;

  @ApiProperty({ description: '模板描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '容量' })
  @IsNumber()
  capacity: number;

  @ApiProperty({ description: '排数' })
  @IsNumber()
  rows: number;

  @ApiProperty({ description: '每排座位数' })
  @IsNumber()
  seatsPerRow: number;

  @ApiProperty({ description: '布局配置', type: LayoutConfigDto })
  @ValidateNested()
  @Type(() => LayoutConfigDto)
  layoutConfig: LayoutConfigDto;

  @ApiProperty({ description: '设备清单', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipment?: string[];

  @ApiProperty({ description: '设施清单', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];

  @ApiProperty({ description: '预览图片URL', required: false })
  @IsOptional()
  @IsString()
  previewImage?: string;
}

export class CreateClassroomBookingDto {
  @ApiProperty({ description: '教室ID' })
  @IsString()
  classroomId: string;

  @ApiProperty({ description: '课程ID' })
  @IsString()
  courseId: string;

  @ApiProperty({ description: '教师ID' })
  @IsString()
  teacherId: string;

  @ApiProperty({ description: '开始时间' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: '结束时间' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ description: '星期几 (1-7)', required: false })
  @IsOptional()
  @IsNumber()
  dayOfWeek?: number;

  @ApiProperty({ description: '是否循环预订' })
  @IsBoolean()
  recurring: boolean;

  @ApiProperty({ description: '预订目的', required: false })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CheckTimeAvailabilityDto {
  @ApiProperty({ description: '开始时间' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: '结束时间' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ description: '排除的预订ID', required: false })
  @IsOptional()
  @IsString()
  excludeBookingId?: string;
}