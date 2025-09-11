# SmartTeacher Pro 功能测试指南

## 概述

本文档提供了 SmartTeacher Pro 核心功能的完整测试流程，包括课程创建、PPT上传、学生管理、开始上课和学生签到等功能。

## 核心功能模块

### ✅ 已实现的功能

1. **课程创建功能（教师端）**
2. **PPT上传功能（教师端）**
3. **课程学生管理功能**
4. **开始上课和开启签到功能**
5. **学生签到功能**

## 功能测试流程

### 前置条件

1. **启动后端服务**
   ```bash
   cd backend
   npm run start:dev
   ```

2. **确保数据库连接正常**
   ```bash
   # 检查环境变量
   cat backend/.env
   
   # 测试数据库连接
   cd backend
   npx prisma db pull
   ```

3. **准备测试用户**
   - 教师账号：用于创建课程、上传PPT、管理学生
   - 学生账号：用于签到功能测试

### 1. 课程创建功能测试

#### API端点
```
POST /api/courses
```

#### 测试用例

**用例1：基础课程创建**
```bash
curl -X POST "http://localhost:3000/api/courses" \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "数据结构与算法",
    "courseCode": "CS101",
    "description": "计算机科学基础课程",
    "credits": 3,
    "semester": "2024-2025-1",
    "schedule": {
      "dayOfWeek": 1,
      "startTime": "08:00",
      "endTime": "09:40",
      "classroom": "教学楼A101"
    },
    "capacity": 60
  }'
```

**期望结果：**
- 状态码：201
- 返回创建的课程信息
- 数据库中新增课程记录

**用例2：重复课程代码测试**
```bash
# 使用相同的courseCode再次创建课程
curl -X POST "http://localhost:3000/api/courses" \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "重复课程",
    "courseCode": "CS101",
    "semester": "2024-2025-1"
  }'
```

**期望结果：**
- 状态码：400
- 错误信息：课程代码已存在

### 2. PPT上传功能测试

#### API端点
```
POST /api/courses/:id/ppt/upload
```

#### 测试用例

**用例1：上传PPT文件**
```bash
# 准备测试PPT文件
curl -X POST "http://localhost:3000/api/courses/<course_id>/ppt/upload" \
  -H "Authorization: Bearer <teacher_token>" \
  -F "file=@/path/to/test.ppt"
```

**期望结果：**
- 状态码：200
- 文件上传至 `./uploads/ppt/` 目录
- 返回文件信息和访问URL

**用例2：上传非PPT文件**
```bash
curl -X POST "http://localhost:3000/api/courses/<course_id>/ppt/upload" \
  -H "Authorization: Bearer <teacher_token>" \
  -F "file=@/path/to/test.txt"
```

**期望结果：**
- 状态码：400
- 错误信息：不支持的文件格式

**用例3：获取课程PPT列表**
```bash
curl -X GET "http://localhost:3000/api/courses/<course_id>/ppt" \
  -H "Authorization: Bearer <teacher_token>"
```

**期望结果：**
- 状态码：200
- 返回课程所有PPT文件列表

### 3. 课程学生管理功能测试

#### API端点
```
POST /api/courses/:id/students
GET /api/courses/:id/students
DELETE /api/courses/:id/students/:studentId
```

#### 测试用例

**用例1：添加学生到课程**
```bash
curl -X POST "http://localhost:3000/api/courses/<course_id>/students" \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "studentIds": ["student_1", "student_2"],
    "notes": "批量添加学生"
  }'
```

**期望结果：**
- 状态码：201
- 学生成功添加到课程
- 数据库中新增选课记录

**用例2：查看课程学生列表**
```bash
curl -X GET "http://localhost:3000/api/courses/<course_id>/students" \
  -H "Authorization: Bearer <teacher_token>"
```

**期望结果：**
- 状态码：200
- 返回课程所有学生信息

**用例3：按班级批量添加学生**
```bash
curl -X POST "http://localhost:3000/api/courses/<course_id>/students/batch" \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "className": "软件工程2021级1班"
  }'
```

**期望结果：**
- 状态码：201
- 班级所有学生添加到课程

### 4. 开始上课和开启签到功能测试

#### API端点
```
POST /api/attendance/sessions/:courseId/start
```

#### 测试用例

**用例1：发起验证码签到**
```bash
curl -X POST "http://localhost:3000/api/attendance/sessions/<course_id>/start" \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "checkInMethod": "verification_code",
    "verificationCode": "123456",
    "duration": 10
  }'
```

**期望结果：**
- 状态码：200
- 创建签到会话
- 返回签到信息（包括验证码）

**用例2：发起座位选择签到**
```bash
curl -X POST "http://localhost:3000/api/attendance/sessions/<course_id>/start" \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "checkInMethod": "seat_selection",
    "classroomId": "<classroom_id>",
    "duration": 15
  }'
```

**期望结果：**
- 状态码：200
- 创建座位选择签到会话
- 返回座位图信息

**用例3：发起二维码签到**
```bash
curl -X POST "http://localhost:3000/api/attendance/sessions/<course_id>/start" \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "checkInMethod": "qr_code",
    "qrCode": "QR_CODE_DATA",
    "duration": 5
  }'
```

**期望结果：**
- 状态码：200
- 创建二维码签到会话
- 返回二维码信息

### 5. 学生签到功能测试

#### API端点
```
POST /api/attendance/check-in/:courseId
POST /api/attendance/code
```

#### 测试用例

**用例1：验证码签到**
```bash
curl -X POST "http://localhost:3000/api/attendance/code" \
  -H "Authorization: Bearer <student_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456",
    "courseId": "<course_id>"
  }'
```

**期望结果：**
- 状态码：200
- 学生签到成功
- 数据库中新增签到记录

**用例2：座位选择签到**
```bash
curl -X POST "http://localhost:3000/api/attendance/check-in/<course_id>" \
  -H "Authorization: Bearer <student_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "checkInMethod": "seat_selection",
    "seatNumber": "A05",
    "location": {
      "latitude": 39.9042,
      "longitude": 116.4074
    }
  }'
```

**期望结果：**
- 状态码：200
- 学生座位签到成功
- 更新座位占用状态

**用例3：手动签到**
```bash
curl -X POST "http://localhost:3000/api/attendance/check-in/<course_id>" \
  -H "Authorization: Bearer <student_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "checkInMethod": "manual"
  }'
```

**期望结果：**
- 状态码：200
- 手动签到成功

## 完整流程测试

### 测试场景：教师创建课程到学生签到的完整流程

#### 步骤1：教师登录并创建课程
```bash
# 1. 教师登录
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "password123"
  }'

# 获取token: <teacher_token>

# 2. 创建课程
curl -X POST "http://localhost:3000/api/courses" \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "软件工程导论",
    "courseCode": "SE2024001",
    "description": "软件工程基础理论与实践",
    "credits": 3,
    "semester": "2024-2025-1",
    "capacity": 50
  }'

# 获取courseId: <course_id>
```

#### 步骤2：上传PPT课件
```bash
# 3. 上传PPT
curl -X POST "http://localhost:3000/api/courses/<course_id>/ppt/upload" \
  -H "Authorization: Bearer <teacher_token>" \
  -F "file=@./test_files/introduction.ppt"
```

#### 步骤3：添加学生到课程
```bash
# 4. 添加学生
curl -X POST "http://localhost:3000/api/courses/<course_id>/students" \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "studentIds": ["student_001", "student_002", "student_003"]
  }'
```

#### 步骤4：开始上课并发起签到
```bash
# 5. 发起签到
curl -X POST "http://localhost:3000/api/attendance/sessions/<course_id>/start" \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "checkInMethod": "verification_code",
    "verificationCode": "888888",
    "duration": 10
  }'
```

#### 步骤5：学生登录并签到
```bash
# 6. 学生登录
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student001@example.com",
    "password": "password123"
  }'

# 获取token: <student_token>

# 7. 学生签到
curl -X POST "http://localhost:3000/api/attendance/code" \
  -H "Authorization: Bearer <student_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "888888",
    "courseId": "<course_id>"
  }'
```

#### 步骤6：验证结果
```bash
# 8. 查看签到记录
curl -X GET "http://localhost:3000/api/attendance/courses/<course_id>" \
  -H "Authorization: Bearer <teacher_token>"
```

## 错误测试场景

### 1. 权限测试
- 学生尝试创建课程（应失败）
- 非课程教师尝试上传PPT（应失败）
- 未选课学生尝试签到（应失败）

### 2. 数据验证测试
- 空课程名称（应失败）
- 重复课程代码（应失败）
- 无效的签到验证码（应失败）

### 3. 业务逻辑测试
- 重复签到（应失败或更新记录）
- 签到时间过期（应失败）
- 选择已占用座位（应失败）

## 性能测试

### 1. 并发签到测试
```bash
# 模拟50个学生同时签到
for i in {1..50}; do
  curl -X POST "http://localhost:3000/api/attendance/code" \
    -H "Authorization: Bearer <student_token_$i>" \
    -H "Content-Type: application/json" \
    -d '{
      "code": "888888",
      "courseId": "<course_id>"
    }' &
done
wait
```

### 2. 大文件上传测试
```bash
# 上传大型PPT文件（>10MB）
curl -X POST "http://localhost:3000/api/courses/<course_id>/ppt/upload" \
  -H "Authorization: Bearer <teacher_token>" \
  -F "file=@./large_presentation.ppt"
```

## 监控和日志

### 1. 检查应用日志
```bash
tail -f backend/logs/app.log
```

### 2. 检查数据库记录
```sql
-- 查看课程记录
SELECT * FROM courses WHERE course_code = 'SE2024001';

-- 查看选课记录
SELECT * FROM enrollments WHERE course_id = '<course_id>';

-- 查看签到记录
SELECT * FROM attendances WHERE course_id = '<course_id>';
```

### 3. 检查文件上传
```bash
ls -la backend/uploads/ppt/
```

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查 DATABASE_URL 环境变量
   - 确认数据库服务运行状态

2. **文件上传失败**
   - 检查上传目录权限
   - 确认文件大小限制

3. **签到失败**
   - 检查签到会话是否有效
   - 确认学生是否已选课

4. **权限错误**
   - 检查JWT token有效性
   - 确认用户角色权限

---

**测试负责人**: SmartTeacher Pro 开发团队  
**创建日期**: 2025-09-09  
**版本**: 1.0  
**最后更新**: 2025-09-09