import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ description: '名', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ description: '姓', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ description: '手机号', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: '院系', required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ description: '专业', required: false })
  @IsOptional()
  @IsString()
  major?: string;

  @ApiProperty({ description: '年级', required: false })
  @IsOptional()
  @IsString()
  grade?: string;
}

export class UpdateSettingsDto {
  @ApiProperty({ description: '语言设置', required: false })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ description: '主题设置', required: false })
  @IsOptional()
  @IsString()
  theme?: string;

  @ApiProperty({ description: '通知设置', required: false })
  @IsOptional()
  notifications?: any;

  @ApiProperty({ description: '隐私设置', required: false })
  @IsOptional()
  privacy?: any;
}