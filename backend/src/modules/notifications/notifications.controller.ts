import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  ParseBoolPipe
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { NotificationType } from '@prisma/client';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: '获取通知列表' })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Request() req,
    @Query('isRead') isRead?: string,
    @Query('type') type?: NotificationType,
    @Query('limit') limit?: string
  ) {
    const params: any = {};
    
    if (isRead !== undefined) {
      params.isRead = isRead === 'true';
    }
    
    if (type) {
      params.type = type;
    }
    
    if (limit) {
      params.limit = parseInt(limit);
    }

    return this.notificationsService.findByUser(req.user.id, params);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '获取未读通知数量' })
  getUnreadCount(@Request() req) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: '标记通知为已读' })
  markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: '标记所有通知为已读' })
  markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除通知' })
  remove(@Param('id') id: string, @Request() req) {
    return this.notificationsService.remove(id, req.user.id);
  }
}