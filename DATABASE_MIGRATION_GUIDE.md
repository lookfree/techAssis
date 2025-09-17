# SmartTeacher Pro 数据库迁移指南

## 概述

本项目使用 **Prisma ORM** 作为主要的数据库管理工具，同时提供了原生 SQL 迁移脚本作为备选方案。本指南将帮助您理解和执行数据库迁移。

## 目录结构

```
backend/
├── prisma/
│   ├── schema.prisma                 # Prisma 数据模型定义
│   ├── migrations/                   # Prisma 迁移文件目录
│   │   ├── 20250906143755_init/      # 初始迁移
│   │   ├── 20250909100000_add_teacher_managed_features/  # 新功能迁移
│   │   │   └── migration.sql
│   │   ├── 20250909093501_add_teacher_managed_enrollment/ # 原生SQL迁移（备选）
│   │   │   ├── 001_create_student_classes.sql
│   │   │   ├── 002_create_operation_logs.sql
│   │   │   ├── 003_create_course_materials.sql
│   │   │   ├── 004_create_presentation_sessions.sql
│   │   │   ├── 005_extend_users_table.sql
│   │   │   ├── 006_optimize_indexes.sql
│   │   │   ├── 007_migrate_historical_data.sql
│   │   │   ├── run_migration.sh
│   │   │   └── README.md
│   │   ├── run_prisma_migration.sh   # Prisma 迁移执行脚本
│   │   └── migration_lock.toml
│   └── seed.ts                       # 种子数据（可选）
```

## 新增功能

### 1. 学生班级统一管理
- **StudentClass 模型** - 全校班级信息统一管理
- **User 模型扩展** - 添加班级关联、学生状态、入学信息等字段
- 支持按班级批量管理学生

### 2. 系统操作审计
- **OperationLog 模型** - 全局操作日志记录
- 支持操作前后数据快照、执行时间监控
- 详细的操作分类和错误处理

### 3. 课件管理增强
- **CourseMaterial 模型增强** - 支持版本控制、分类管理
- 文件上传关联、访问统计、权限控制
- 支持多种文件类型和外部链接

### 4. PPT演示系统
- **PresentationSession 模型增强** - 实时演示状态管理
- 支持播放模式、标注、录制功能
- 演示统计和效果分析

## 推荐执行方式（Prisma）

### 前提条件

1. **环境配置**
   ```bash
   # 设置数据库连接字符串
   export DATABASE_URL="postgresql://username:password@host:port/database"
   ```

2. **依赖安装**
   ```bash
   pnpm install
   ```

### 执行步骤

#### 方式一：使用自动化脚本（推荐）

```bash
# 完整设置（推荐新项目）
./backend/prisma/migrations/run_prisma_migration.sh setup

# 仅执行开发环境迁移
./backend/prisma/migrations/run_prisma_migration.sh dev

# 启动数据库管理界面
./backend/prisma/migrations/run_prisma_migration.sh studio
```

#### 方式二：手动执行

```bash
# 1. 进入后端目录
cd backend

# 2. 生成 Prisma 客户端
pnpm prisma generate

# 3. 执行数据库迁移
pnpm prisma migrate dev --name add_teacher_managed_features

# 4. 初始化种子数据（可选）
pnpm prisma db seed

# 5. 启动数据库管理界面
pnpm prisma studio
```

### 生产环境部署

```bash
# 生产环境迁移
./backend/prisma/migrations/run_prisma_migration.sh deploy

# 或手动执行
cd backend
pnpm prisma migrate deploy
```

## 备选方式（原生 SQL）

如果 Prisma 迁移遇到问题，可以使用原生 SQL 脚本：

```bash
# 执行原生 SQL 迁移
cd backend/prisma/migrations/20250909093501_add_teacher_managed_enrollment/
./run_migration.sh
```

## 数据库架构变更

### 新增表

1. **student_classes** - 学生班级信息表
2. **operation_logs** - 系统操作日志表

### 扩展表

1. **users** - 添加学生管理相关字段
2. **course_materials** - 增强课件管理功能
3. **presentation_sessions** - 增强PPT演示功能

### 新增枚举

- `UserStatus` - 学生状态
- `StudentType` - 学生类型
- `ClassStatus` - 班级状态
- `OperatorRole` - 操作者角色
- `MaterialCategory` - 课件分类
- `PlayMode` - 播放模式

## 常用命令

```bash
# 检查数据库状态
pnpm prisma db pull

# 查看迁移状态
pnpm prisma migrate status

# 重置数据库（谨慎使用）
pnpm prisma migrate reset

# 生成数据库文档
pnpm prisma generate --docs

# 格式化 Schema
pnpm prisma format
```

## 故障排除

### 1. 连接失败
```bash
# 检查数据库连接
./backend/prisma/migrations/run_prisma_migration.sh check
```

### 2. 迁移冲突
```bash
# 查看迁移状态
pnpm prisma migrate status

# 手动解决冲突后重新应用
pnpm prisma migrate resolve --applied "迁移名称"
```

### 3. Schema 不同步
```bash
# 从数据库拉取最新结构
pnpm prisma db pull

# 重新生成客户端
pnpm prisma generate
```

### 4. 权限问题
确保数据库用户具有以下权限：
- CREATE
- ALTER
- DROP
- INDEX
- INSERT
- UPDATE
- DELETE
- SELECT

## 性能优化

### 1. 索引创建
迁移已自动创建必要的索引，包括：
- 复合索引（查询优化）
- 唯一索引（数据完整性）
- 外键索引（关联查询优化）

### 2. 查询优化
- 使用 Prisma 的 `include` 和 `select` 进行精确查询
- 利用数据库视图进行复杂统计
- 合理使用分页和过滤

### 3. 监控
- 使用 `operation_logs` 表监控数据库操作
- 通过 Prisma Studio 查看查询性能

## 安全考虑

### 1. 数据备份
```bash
# 备份数据库
pg_dump -h <host> -p <port> -U <username> <database> > backup.sql
```

### 2. 敏感数据
- 所有学生个人信息已加密存储
- 操作日志记录所有敏感操作
- 支持 GDPR 兼容的数据删除

### 3. 访问控制
- 基于角色的权限控制（RBAC）
- 数据行级安全（RLS）
- API 级别的权限验证

## 测试

### 1. 单元测试
```bash
# 运行 Prisma 相关测试
pnpm test:db
```

### 2. 集成测试
```bash
# 测试数据库迁移
pnpm test:migration
```

### 3. 性能测试
```bash
# 测试高并发场景
pnpm test:performance
```

## 监控和维护

### 1. 定期任务
- 数据库统计信息更新
- 历史日志清理
- 索引重建

### 2. 监控指标
- 查询响应时间
- 数据库连接数
- 存储空间使用

### 3. 报警设置
- 迁移失败告警
- 性能降级告警
- 数据完整性告警

---

**维护人员**: SmartTeacher Pro 开发团队  
**创建日期**: 2025-09-09  
**版本**: 1.0  
**最后更新**: 2025-09-09