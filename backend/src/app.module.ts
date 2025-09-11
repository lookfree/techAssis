import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// 数据库模块
import { PrismaModule } from './prisma/prisma.module';

// 公共模块
import { CacheModule } from './common/cache/cache.module';
import { LoggerModule } from './common/logger/logger.module';

// 功能模块
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CoursesModule } from './modules/courses/courses.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { FilesModule } from './modules/files/files.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ClassroomsModule } from './modules/classrooms/classrooms.module';

@Module({
  imports: [
    // 全局配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // 静态文件服务
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/public',
      serveStaticOptions: {
        index: false,
      },
    }),

    // 数据库
    PrismaModule,

    // 公共模块
    CacheModule,
    LoggerModule,

    // 功能模块
    AuthModule,
    UsersModule,
    CoursesModule,
    AttendanceModule,
    AssignmentsModule,
    AnalyticsModule,
    FilesModule,
    NotificationsModule,
    ClassroomsModule,
  ],
})
export class AppModule {}