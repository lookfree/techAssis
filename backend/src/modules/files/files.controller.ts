import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request
} from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilesService } from './files.service';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4();
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      // 支持常见文件类型
      const allowedMimes = [
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/gif',
        'text/plain',
        'application/zip',
        'application/x-rar-compressed'
      ];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('不支持的文件类型'), false);
      }
    },
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  }))
  @ApiOperation({ summary: '上传文件' })
  uploadFile(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      throw new Error('请选择要上传的文件');
    }
    
    return this.filesService.uploadFile({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      mimeType: file.mimetype,
      uploaderId: req.user.id
    });
  }

  @Get()
  @ApiOperation({ summary: '获取文件列表' })
  findAll(@Request() req) {
    return this.filesService.findAll(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除文件' })
  remove(@Param('id') id: string, @Request() req) {
    return this.filesService.remove(id, req.user.id);
  }
}