import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdateSettingsDto } from './dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('settings')
  @ApiOperation({ summary: '获取用户设置' })
  getUserSettings(@Request() req) {
    return this.usersService.getUserSettings(req.user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: '更新用户资料' })
  updateProfile(@Body() updateProfileDto: UpdateProfileDto, @Request() req) {
    return this.usersService.updateProfile(req.user.id, updateProfileDto);
  }

  @Put('settings')
  @ApiOperation({ summary: '更新用户设置' })
  updateSettings(@Body() updateSettingsDto: UpdateSettingsDto, @Request() req) {
    return this.usersService.updateSettings(req.user.id, updateSettingsDto);
  }

  @Put('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ summary: '更新用户头像' })
  updateAvatar(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.usersService.updateAvatar(req.user.id, file);
  }
}