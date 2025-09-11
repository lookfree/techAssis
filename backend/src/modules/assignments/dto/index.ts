import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsNumber, Min, Max } from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty({ description: '作业标题' })
  @IsString()
  title: string;

  @ApiProperty({ description: '作业描述' })
  @IsString()
  description: string;

  @ApiProperty({ description: '课程ID' })
  @IsString()
  courseId: string;

  @ApiProperty({ description: '截止时间' })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ description: '总分', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  totalPoints?: number;

  @ApiProperty({ description: '作业类型', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: '作业内容', required: false })
  @IsOptional()
  content?: any;
}

export class GradeSubmissionDto {
  @ApiProperty({ description: '学生ID' })
  @IsString()
  studentId: string;

  @ApiProperty({ description: '分数' })
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @ApiProperty({ description: '反馈', required: false })
  @IsOptional()
  @IsString()
  feedback?: string;
}