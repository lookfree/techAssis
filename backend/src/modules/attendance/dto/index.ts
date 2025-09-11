import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsEnum, IsDateString } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

// CheckInMethod 枚举已移除，使用字符串
export type CheckInMethod = 'qr_code' | 'verification_code' | 'seat_selection' | 'manual' | 'face_recognition';

export class StartSessionDto {
  @ApiProperty({ description: '签到方式' })
  @IsString()
  checkInMethod: CheckInMethod;

  @ApiProperty({ description: '验证码', required: false })
  @IsOptional()
  @IsString()
  verificationCode?: string;

  @ApiProperty({ description: '二维码内容', required: false })
  @IsOptional()
  @IsString()
  qrCode?: string;

  @ApiProperty({ description: '签到持续时间（分钟）', required: false })
  @IsOptional()
  @IsInt()
  duration?: number;
}

export class CheckInDto {
  @ApiProperty({ description: '签到方式', required: false })
  @IsOptional()
  @IsString()
  checkInMethod?: CheckInMethod;

  @ApiProperty({ description: '验证码', required: false })
  @IsOptional()
  @IsString()
  verificationCode?: string;

  @ApiProperty({ description: '座位号', required: false })
  @IsOptional()
  @IsString()
  seatNumber?: string;

  @ApiProperty({ description: '地理位置', required: false })
  @IsOptional()
  location?: any;
}

export class UpdateAttendanceDto {
  @ApiProperty({ description: '考勤状态' })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}