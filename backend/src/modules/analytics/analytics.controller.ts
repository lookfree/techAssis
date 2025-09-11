import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '获取仪表板数据' })
  getDashboard(@Request() req) {
    return this.analyticsService.getDashboardStats(req.user.id, req.user.role);
  }

  @Get('overview-stats')
  @ApiOperation({ summary: '获取概览统计' })
  getOverviewStats(@Request() req) {
    return this.analyticsService.getDashboardStats(req.user.id, req.user.role);
  }
}