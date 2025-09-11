# SmartTeacher Pro - Prisma 数据库配置指南

## 🔄 从 TypeORM 迁移到 Prisma

SmartTeacher Pro 后端已成功从 TypeORM 迁移到 Prisma ORM，提供更好的类型安全和开发体验。

## 📁 项目结构

```
backend/
├── prisma/
│   ├── migrations/           # 数据库迁移文件
│   │   ├── 20250906143755_init/
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   ├── schema.prisma        # Prisma 数据模型定义
│   └── seed.ts              # 种子数据文件
├── src/
│   ├── prisma/
│   │   ├── prisma.module.ts # Prisma 模块
│   │   └── prisma.service.ts # Prisma 服务
│   └── modules/
│       └── users/
│           └── users.service.prisma.ts # 示例服务
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制并修改环境变量文件：

```bash
cp .env.example .env
```

修改 `.env` 文件中的数据库连接字符串：

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/smartteacher_db?schema=public"
```

### 3. 生成 Prisma Client

```bash
npm run prisma:generate
```

### 4. 运行数据库迁移

```bash
npm run prisma:migrate
```

### 5. 导入种子数据

```bash
npm run seed
```

## 📊 数据模型

### 核心实体

- **User** - 用户表（教师、学生、管理员）
- **Course** - 课程表
- **Enrollment** - 选课关系表
- **Classroom** - 教室表
- **SeatMap** - 座位图表
- **Attendance** - 考勤记录表
- **Assignment** - 作业表
- **Submission** - 提交记录表
- **Grade** - 成绩表
- **Notification** - 通知表
- **FileUpload** - 文件上传表

### 用户角色

- `super_admin` - 超级管理员
- `department_admin` - 院系管理员
- `teacher` - 教师
- `student` - 学生

## 💾 种子数据

运行 `npm run seed` 后会自动创建：

- **1 个超级管理员**
- **5 个教师账户**
- **150 个学生账户**
- **9 门课程**（覆盖计算机、数学、工程等专业）
- **选课关系**（每个学生选2-5门课）
- **教室和座位系统**
- **作业和提交记录**
- **考勤数据**（过去30天）
- **成绩记录**
- **系统通知**

### 默认登录账户

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 超级管理员 | admin@smartteacher.com | admin123456 |
| 教师示例 | teacher1@university.edu | teacher123456 |
| 学生示例 | student1@university.edu | student123456 |

## 🛠️ Prisma 命令

### 数据库管理

```bash
# 生成 Prisma Client
npm run prisma:generate

# 创建并应用迁移
npm run prisma:migrate

# 重置数据库（清空并重新迁移）
npm run prisma:reset

# 部署迁移到生产环境
npm run prisma:deploy

# 打开 Prisma Studio（数据库管理界面）
npm run prisma:studio

# 导入种子数据
npm run seed
```

### 开发工作流

1. **修改 schema.prisma** - 定义数据模型
2. **生成迁移** - `npm run prisma:migrate`
3. **更新 Client** - 自动生成类型安全的客户端
4. **更新代码** - 使用新的类型和方法

## 🔍 使用示例

### 基本查询

```typescript
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExampleService {
  constructor(private prisma: PrismaService) {}

  // 查找用户
  async findUser(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        teachingCourses: true,
        enrollments: {
          include: {
            course: true
          }
        }
      }
    });
  }

  // 创建用户
  async createUser(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({
      data
    });
  }

  // 更新用户
  async updateUser(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data
    });
  }
}
```

### 复杂查询

```typescript
// 获取某个教师的课程统计
async getTeacherStats(teacherId: string) {
  return this.prisma.course.findMany({
    where: { teacherId },
    include: {
      _count: {
        select: {
          enrollments: true,
          assignments: true,
          attendances: true
        }
      }
    }
  });
}

// 获取学生的成绩统计
async getStudentGrades(studentId: string) {
  return this.prisma.grade.findMany({
    where: { studentId },
    include: {
      assignment: {
        include: {
          course: true
        }
      }
    },
    orderBy: {
      gradedAt: 'desc'
    }
  });
}
```

## 🔄 与 TypeORM 的主要差异

| 特性 | TypeORM | Prisma |
|------|---------|--------|
| **模型定义** | 装饰器类 | Schema 文件 |
| **查询方式** | Repository 模式 | 直接客户端调用 |
| **类型安全** | 运行时 | 编译时 |
| **关系查询** | `relations: []` | `include: {}` |
| **条件查询** | `where: {}` | `where: {}` |
| **数据验证** | class-validator | Prisma schema |

## 🚨 注意事项

1. **迁移安全** - 生产环境迁移前务必备份数据库
2. **类型生成** - 修改 schema 后必须运行 `prisma generate`
3. **环境隔离** - 不同环境使用不同的数据库
4. **密码安全** - 生产环境务必修改默认密码

## 🔧 故障排除

### 常见问题

1. **Client 未生成**
   ```bash
   npm run prisma:generate
   ```

2. **迁移失败**
   ```bash
   npm run prisma:reset
   npm run seed
   ```

3. **连接失败**
   - 检查 `DATABASE_URL` 配置
   - 确认数据库服务是否启动

4. **类型错误**
   - 确保已运行 `prisma generate`
   - 重启 TypeScript 服务

## 📚 参考资源

- [Prisma 官方文档](https://www.prisma.io/docs)
- [Prisma with NestJS](https://docs.nestjs.com/recipes/prisma)
- [数据库设计最佳实践](https://www.prisma.io/dataguide)

---

🎓 **SmartTeacher Pro** - 智慧教学助手系统，现在由 Prisma 强力驱动！