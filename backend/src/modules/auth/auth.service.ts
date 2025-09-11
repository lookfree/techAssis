import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

import { User, UserRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LoggerService } from '../../common/logger/logger.service';
import { CacheService } from '../../common/cache/cache.service';

interface LoginDto {
  email: string;
  password: string;
}

interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  studentId?: string;
  phone?: string;
  department?: string;
  major?: string;
  grade?: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

interface AuthResponse {
  user: Partial<User>;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private logger: LoggerService,
    private cacheService: CacheService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        this.logger.security('Login attempt with invalid email', { email });
        return null;
      }

      if (!user.isActive) {
        this.logger.security('Login attempt with inactive account', { email, userId: user.id });
        throw new UnauthorizedException('Account is deactivated');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        this.logger.security('Login attempt with invalid password', { email, userId: user.id });
        return null;
      }

      this.logger.log(`Successful authentication for ${email}`);
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } catch (error) {
      this.logger.error('Error during user validation', error);
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;
    const user = await this.validateUser(email, password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d'),
    });

    // Cache user session
    await this.cacheService.setUserCache(user.id, 'session', {
      accessToken,
      refreshToken,
      loginAt: new Date(),
    }, 1800); // 30分钟

    this.logger.log(`User logged in successfully: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        studentId: user.studentId,
        avatar: user.avatar,
        profile: user.profile,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, firstName, lastName, role, ...profile } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role,
          isActive: true,
          studentId: profile.studentId,
          phone: profile.phone,
          profile: profile.department || profile.major || profile.grade ? {
            department: profile.department,
            major: profile.major,
            grade: profile.grade,
          } : undefined,
        },
      });

      this.logger.log(`New user registered: ${email}`);

      // Auto-login after registration
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(payload);
      const refreshToken = this.jwtService.sign(payload, {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d'),
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          studentId: user.studentId,
          avatar: user.avatar,
          profile: user.profile,
        },
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 7 * 24 * 60 * 60,
      };
    } catch (error) {
      this.logger.error('Error during user registration', error);
      throw new BadRequestException('Failed to create user account');
    }
  }

  async refreshToken(refreshToken: string): Promise<Partial<AuthResponse>> {
    try {
      const payload = this.jwtService.verify(refreshToken) as JwtPayload;
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const newAccessToken = this.jwtService.sign(newPayload);

      return {
        access_token: newAccessToken,
        expires_in: 7 * 24 * 60 * 60,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.cacheService.delUserCache(userId, 'session');
    this.logger.log(`User logged out: ${userId}`);
  }

  async validateJwtPayload(payload: JwtPayload): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          studentId: true,
          password: true,
          role: true,
          isActive: true,
          avatar: true,
          phone: true,
          department: true,
          major: true,
          grade: true,
          className: true,
          classId: true,
          studentClassId: true,
          profile: true,
          settings: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user || !user.isActive) {
        return null;
      }

      return user;
    } catch (error) {
      this.logger.error('Error validating JWT payload', error);
      return null;
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    this.logger.log(`Password changed successfully for user: ${userId}`);
  }

  async resetPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists or not for security
      this.logger.security('Password reset attempt for non-existent email', { email });
      return;
    }

    // Generate temporary password or reset token
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedTempPassword = await bcrypt.hash(tempPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedTempPassword },
    });

    // In a real application, you would send this via email
    this.logger.log(`Password reset completed for user: ${user.id}`);
  }

  async findUserById(userId: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        studentId: true,
        role: true,
        isActive: true,
        avatar: true,
        phone: true,
        department: true,
        major: true,
        grade: true,
        className: true,
        classId: true,
        studentClassId: true,
        profile: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }
}