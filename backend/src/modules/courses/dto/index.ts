import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { CourseStatus } from '@prisma/client';

export class CreateCourseDto {
  @ApiProperty({ description: '课程名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '课程代码' })
  @IsString()
  courseCode: string;

  @ApiProperty({ description: '课程描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '学分', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  credits?: number;

  @ApiProperty({ description: '学期' })
  @IsString()
  semester: string;

  @ApiProperty({ description: '上课时间', required: false })
  @IsOptional()
  @IsString()
  schedule?: string;

  @ApiProperty({ description: '教室', required: false })
  @IsOptional()
  @IsString()
  classroom?: string;

  @ApiProperty({ description: '容量', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  capacity?: number;
}

export class UpdateCourseDto {
  @ApiProperty({ description: '课程名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '课程描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '学分', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  credits?: number;

  @ApiProperty({ description: '上课时间', required: false })
  @IsOptional()
  @IsString()
  schedule?: string;

  @ApiProperty({ description: '教室', required: false })
  @IsOptional()
  @IsString()
  classroom?: string;

  @ApiProperty({ description: '容量', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  capacity?: number;

  @ApiProperty({ description: '状态', required: false })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;
}

export class BulkEnrollDto {
  @ApiProperty({ description: '学生邮箱列表' })
  studentEmails: string[];
}