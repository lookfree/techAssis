import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

// 加载环境变量
config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  host: configService.get('DATABASE_HOST', 'localhost'),
  port: configService.get('DATABASE_PORT', 5432),
  username: configService.get('DATABASE_USERNAME', 'postgres'),
  password: configService.get('DATABASE_PASSWORD', 'postgres'),
  database: configService.get('DATABASE_NAME', 'smartteacher_db'),
  synchronize: false, // 生产环境不使用同步
  logging: configService.get('NODE_ENV') === 'development',
  entities: ['src/database/entities/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  subscribers: ['src/database/subscribers/*.ts'],
  migrationsTableName: 'migrations_history',
  cli: {
    entitiesDir: 'src/database/entities',
    migrationsDir: 'src/database/migrations',
    subscribersDir: 'src/database/subscribers',
  },
});