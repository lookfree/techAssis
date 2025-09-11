# SmartTeacher Pro 快速上手指南

## 🚀 系统概述

SmartTeacher Pro（智慧教师专业版）是一个面向高等院校的智能教学助手系统，提供课堂管理、考勤跟踪、作业管理和数据分析等全方位教学支持。

## 📋 目录

1. [系统启动](#系统启动)
2. [默认账户](#默认账户)
3. [核心功能流程](#核心功能流程)
4. [API 接口说明](#api-接口说明)
5. [常见问题](#常见问题)
6. [开发说明](#开发说明)

## 🖥️ 系统启动

### 1. 启动后端服务

```bash
cd backend
npm run start:dev
```

服务将启动在 `http://localhost:3000`

### 2. 初始化数据库（首次运行）

```bash
cd backend
npm run seed
```

这将创建测试用户、课程、教室等示例数据。

### 3. 启动前端服务

**教师端：**
```bash
cd frontend-teacher
npm start
```
访问 `http://localhost:3001`

**学生端：**
```bash  
cd frontend-student
npm start
```
访问 `http://localhost:3002`

## 🔑 默认账户

系统初始化后会自动创建以下测试账户：

### 管理员账户
- **邮箱**: `admin@smartteacher.com`
- **密码**: `admin123456`
- **权限**: 超级管理员，拥有所有系统权限

### 教师账户
- **邮箱**: `teacher@example.com`
- **密码**: `teacher123456`
- **权限**: 教师权限，可创建课程、管理学生、发起签到

### 学生账户
- **邮箱**: `student1@university.edu` (student1-150)
- **密码**: `student123456`
- **权限**: 学生权限，可参与课程、提交作业、签到

## 🎯 核心功能流程

### 教师端完整流程

#### 1. 登录系统
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "teacher@example.com",
  "password": "teacher123456"
}
```

#### 2. 创建课程
```bash
POST /api/courses
Authorization: Bearer <teacher_token>
Content-Type: application/json

{
  "name": "数据结构与算法",
  "courseCode": "CS201",
  "description": "核心数据结构和算法设计",
  "credits": 3,
  "semester": "2024-2025-1",
  "capacity": 60
}
```

#### 3. 上传PPT课件
```bash
POST /api/courses/{courseId}/ppt/upload
Authorization: Bearer <teacher_token>
Content-Type: multipart/form-data

file: <ppt_file>
```

#### 4. 添加学生到课程
```bash
POST /api/courses/{courseId}/students
Authorization: Bearer <teacher_token>
Content-Type: application/json

{
  "studentIds": ["student_1", "student_2", "student_3"]
}
```

#### 5. 开始上课并发起签到
```bash
POST /api/attendance/sessions/{courseId}/start
Authorization: Bearer <teacher_token>
Content-Type: application/json

{
  "checkInMethod": "verification_code",
  "verificationCode": "123456",
  "duration": 10
}
```

### 学生端完整流程

#### 1. 学生登录
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "student1@university.edu", 
  "password": "student123456"
}
```

#### 2. 验证码签到
```bash
POST /api/attendance/code
Authorization: Bearer <student_token>
Content-Type: application/json

{
  "code": "123456",
  "courseId": "{courseId}"
}
```

#### 3. 座位选择签到
```bash
POST /api/attendance/check-in/{courseId}
Authorization: Bearer <student_token>
Content-Type: application/json

{
  "checkInMethod": "seat_selection",
  "seatNumber": "A05",
  "location": {
    "latitude": 39.9042,
    "longitude": 116.4074
  }
}
```

## 🔌 API 接口说明

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/refresh` - 刷新Token

### 课程管理
- `GET /api/courses` - 获取课程列表
- `POST /api/courses` - 创建课程
- `PUT /api/courses/{id}` - 更新课程
- `DELETE /api/courses/{id}` - 删除课程
- `POST /api/courses/{id}/ppt/upload` - 上传PPT
- `GET /api/courses/{id}/ppt` - 获取PPT列表

### 学生管理
- `GET /api/courses/{id}/students` - 获取课程学生列表
- `POST /api/courses/{id}/students` - 添加学生到课程
- `DELETE /api/courses/{id}/students/{studentId}` - 移除学生
- `POST /api/courses/{id}/students/batch` - 按班级批量添加

### 考勤管理
- `POST /api/attendance/sessions/{courseId}/start` - 发起签到
- `POST /api/attendance/check-in/{courseId}` - 学生签到
- `POST /api/attendance/code` - 验证码签到
- `GET /api/attendance/courses/{courseId}` - 获取考勤记录
- `GET /api/attendance/stats/{courseId}` - 考勤统计

### 作业管理
- `GET /api/assignments` - 获取作业列表
- `POST /api/assignments` - 创建作业
- `PUT /api/assignments/{id}` - 更新作业
- `DELETE /api/assignments/{id}` - 删除作业

### 用户管理
- `GET /api/users/profile` - 获取用户信息
- `PUT /api/users/profile` - 更新用户信息
- `GET /api/users/{id}` - 获取用户详情

## ❓ 常见问题

### Q1: 数据库连接失败
**A**: 检查 `.env` 文件中的数据库配置：
```
DATABASE_URL="postgresql://postgres:uro%40%23wet8332%40@60.205.160.74:5432/smartteacher_db?schema=public"
```

### Q2: 文件上传失败
**A**: 确保上传目录存在且有写权限：
```bash
mkdir -p backend/uploads/ppt
chmod 755 backend/uploads
```

### Q3: JWT Token 过期
**A**: 使用刷新token获取新的访问token：
```bash
POST /api/auth/refresh
Authorization: Bearer <refresh_token>
```

### Q4: 权限不足
**A**: 确认用户角色和权限：
- `super_admin`: 所有权限
- `teacher`: 教学相关权限
- `student`: 学习相关权限

### Q5: 签到失败
**A**: 检查以下条件：
- 签到会话是否有效
- 学生是否已选课
- 验证码是否正确
- 座位是否被占用

## 🛠️ 开发说明

### 项目结构
```
techAssis/
├── backend/                 # NestJS 后端
│   ├── src/
│   │   ├── modules/        # 功能模块
│   │   ├── common/         # 公共组件
│   │   └── main.ts         # 应用入口
│   ├── prisma/             # 数据库相关
│   │   ├── schema.prisma   # 数据模型
│   │   ├── seed.ts         # 种子数据
│   │   └── migrations/     # 迁移文件
│   └── uploads/            # 文件上传目录
├── frontend-teacher/       # 教师端前端
├── frontend-student/       # 学生端前端
├── test_api_complete_flow.sh  # API测试脚本
└── FEATURE_TESTING_GUIDE.md  # 功能测试指南
```

### 技术栈
- **后端**: NestJS + TypeScript + Prisma + PostgreSQL
- **前端**: React + TypeScript + Ant Design
- **认证**: JWT + Guards
- **文件存储**: 本地文件系统
- **实时通信**: WebSocket (Socket.io)

### 开发命令
```bash
# 后端开发
cd backend
npm run start:dev      # 启动开发服务器
npm run build         # 构建项目
npm run test          # 运行测试
npm run lint          # 代码检查

# 前端开发  
cd frontend-teacher
npm start            # 启动开发服务器
npm run build        # 构建项目
npm test             # 运行测试

# 数据库操作
npx prisma generate  # 生成客户端
npx prisma db push   # 推送schema到数据库
npx prisma db pull   # 从数据库拉取schema
npx prisma migrate dev  # 创建并应用迁移
```

### 环境配置

**.env 文件示例：**
```bash
# 数据库配置
DATABASE_URL="postgresql://postgres:password@localhost:5432/smartteacher_db"

# JWT 配置
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# 服务配置
PORT="3000"
NODE_ENV="development"

# 前端地址
FRONTEND_URL="http://localhost:3001"
STUDENT_FRONTEND_URL="http://localhost:3002"

# 文件上传配置
UPLOAD_PATH="./uploads"
MAX_FILE_SIZE="10485760"
```

## 🧪 测试指南

### 1. 运行完整API测试
```bash
chmod +x test_api_complete_flow.sh
./test_api_complete_flow.sh
```

### 2. 手动功能测试
参考 `FEATURE_TESTING_GUIDE.md` 进行详细的功能测试。

### 3. 性能测试
```bash
# 并发签到测试
for i in {1..50}; do
  curl -X POST "http://localhost:3000/api/attendance/code" \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{"code": "123456", "courseId": "<courseId>"}' &
done
wait
```

## 📞 支持和联系

- **技术支持**: SmartTeacher Pro 开发团队
- **文档更新**: 2025-09-09
- **版本**: v1.0

---

**快速开始提示**：
1. 先启动后端服务 (`npm run start:dev`)
2. 运行种子数据初始化 (`npm run seed`)
3. 使用默认教师账户登录测试核心功能
4. 查看 `FEATURE_TESTING_GUIDE.md` 了解详细测试流程

祝你使用愉快！🎉