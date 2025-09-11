import { Controller, Post, Body, UseGuards, Request, Get, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { UserRole } from '@prisma/client';
import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class LoginDto {
  @ApiProperty({ description: '邮箱地址' })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @MinLength(6, { message: '密码至少6位' })
  password: string;
}

class RegisterDto {
  @ApiProperty({ description: '邮箱地址' })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @MinLength(6, { message: '密码至少6位' })
  password: string;

  @ApiProperty({ description: '名' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: '姓' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: '用户角色', enum: UserRole })
  @IsEnum(UserRole, { message: '请选择有效的用户角色' })
  role: UserRole;

  @ApiProperty({ description: '学号（学生必填）', required: false })
  @IsOptional()
  @IsString()
  studentId?: string;

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

class RefreshTokenDto {
  @ApiProperty({ description: '刷新令牌' })
  @IsString()
  refresh_token: string;
}

class ChangePasswordDto {
  @ApiProperty({ description: '当前密码' })
  @IsString()
  oldPassword: string;

  @ApiProperty({ description: '新密码' })
  @IsString()
  @MinLength(6, { message: '密码至少6位' })
  newPassword: string;
}

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '认证失败' })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Request() req): Promise<any> {
    return this.authService.login(loginDto);
  }

  @ApiOperation({ summary: '用户注册' })
  @ApiResponse({ status: 201, description: '注册成功' })
  @ApiResponse({ status: 400, description: '注册失败' })
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<any> {
    return this.authService.register(registerDto);
  }

  @ApiOperation({ summary: '刷新访问令牌' })
  @ApiResponse({ status: 200, description: '刷新成功' })
  @ApiResponse({ status: 401, description: '刷新令牌无效' })
  @Post('refresh')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<any> {
    return this.authService.refreshToken(refreshTokenDto.refresh_token);
  }

  @ApiOperation({ summary: '用户登出' })
  @ApiResponse({ status: 200, description: '登出成功' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req) {
    await this.authService.logout(req.user.id);
    return { message: '登出成功' };
  }

  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@Request() req) {
    return this.authService.findUserById(req.user.id);
  }

  @ApiOperation({ summary: '修改密码' })
  @ApiResponse({ status: 200, description: '密码修改成功' })
  @ApiResponse({ status: 400, description: '当前密码错误' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put('password')
  async changePassword(@Body() changePasswordDto: ChangePasswordDto, @Request() req) {
    await this.authService.changePassword(
      req.user.id,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
    return { message: '密码修改成功' };
  }

  @Put('change-password')
  async changePasswordAlt(@Body() changePasswordDto: ChangePasswordDto, @Request() req) {
    await this.authService.changePassword(
      req.user.id,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
    return { message: '密码修改成功' };
  }
}