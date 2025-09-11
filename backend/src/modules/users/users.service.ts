import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto, UpdateSettingsDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getUserSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        studentId: true,
        phone: true,
        department: true,
        major: true,
        grade: true,
        avatar: true,
        role: true,
        settings: true
      }
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        studentId: true,
        phone: true,
        department: true,
        major: true,
        grade: true,
        avatar: true,
        role: true
      }
    });

    return user;
  }

  async updateSettings(userId: string, updateSettingsDto: UpdateSettingsDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        settings: updateSettingsDto as any
      }
    });

    return { message: '设置更新成功' };
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    // 这里应该实现文件上传逻辑，暂时返回示例
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true
      }
    });

    return user;
  }
}