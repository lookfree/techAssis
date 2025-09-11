import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // 优化连接池配置
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Prisma Client connected to database with optimized pool settings');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      // 不要抛出错误，让应用继续运行
      setTimeout(() => this.onModuleInit(), 5000); // 5秒后重试
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🔌 Prisma Client disconnected from database');
  }

  async enableShutdownHooks(app: any) {
    // Removed problematic event listener
    // this.$on('beforeExit', async () => {
    //   await app.close();
    // });
  }
}