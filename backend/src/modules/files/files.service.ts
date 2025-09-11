import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}

  async uploadFile(fileData: {
    filename: string;
    originalName: string;
    path: string;
    size: number;
    mimeType: string;
    uploaderId: string;
  }) {
    try {
      return this.prisma.fileUpload.create({
        data: {
          ...fileData,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    } catch (error) {
      throw new Error(`文件上传失败: ${error.message}`);
    }
  }

  async findAll(uploaderId?: string) {
    return this.prisma.fileUpload.findMany({
      where: uploaderId ? { uploaderId } : {},
      orderBy: { createdAt: 'desc' }
    });
  }

  async remove(id: string, uploaderId?: string) {
    const where: any = { id };
    if (uploaderId) {
      where.uploaderId = uploaderId;
    }

    return this.prisma.fileUpload.delete({ where });
  }
}