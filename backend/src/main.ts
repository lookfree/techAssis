import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const clientUrls = configService.get<string>('CLIENT_URL', 'http://localhost:3001,http://localhost:3002')
    .split(',')
    .map(url => url.trim());

  // 启用CORS
  app.enableCors({
    origin: (origin, callback) => {
      // 允许没有origin的请求（比如Postman）
      if (!origin) return callback(null, true);

      // 允许配置的客户端URL
      if (clientUrls.includes(origin)) {
        return callback(null, true);
      }

      // 在生产环境中，允许服务器IP的请求
      const allowedPatterns = [
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/,
        /^http:\/\/60\.205\.160\.74:\d+$/,
      ];

      if (allowedPatterns.some(pattern => pattern.test(origin))) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 静态文件服务
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/public/',
  });
  
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // API路径前缀
  app.setGlobalPrefix('api');

  // Swagger API文档
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SmartTeacher Pro API')
      .setDescription('智慧教师专业版 - 智能教学助手系统API文档')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('认证', 'Authentication')
      .addTag('用户管理', 'User Management')
      .addTag('课程管理', 'Course Management')
      .addTag('签到管理', 'Attendance Management')
      .addTag('作业管理', 'Assignment Management')
      .addTag('分析报告', 'Analytics')
      .addTag('文件管理', 'File Management')
      .addTag('通知消息', 'Notifications')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);
  
  console.log(`🚀 SmartTeacher Pro 后端API服务已启动`);
  console.log(`📍 服务地址: http://localhost:${port}`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📖 API文档: http://localhost:${port}/api/docs`);
  }
}

bootstrap();