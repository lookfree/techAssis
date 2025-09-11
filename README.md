# SmartTeacher Pro - 智慧教师专业版

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/node-%3E%3D16.0.0-green.svg" alt="Node">
  <img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
</p>

<p align="center">
  <b>智能教学助手系统 - 为高校教师提供全方位智能化教学管理解决方案</b>
</p>

## 📖 项目简介

SmartTeacher Pro 是一个专为高等教育机构设计的综合性教学管理平台，通过智能化技术革新传统教学模式，提供从课堂管理到数据分析的一站式解决方案。

### 🎯 核心价值

- **提升教学效率** - 自动化处理重复性工作，让教师专注于教学本身
- **增强互动体验** - 实时互动工具促进师生交流
- **数据驱动决策** - 全面的数据分析助力教学改进
- **灵活可扩展** - 模块化设计支持定制化需求

## 🏗️ 系统架构

```
techAssis/
├── backend/                    # 🚀 NestJS 后端服务
│   ├── src/
│   │   ├── modules/           # 功能模块
│   │   │   ├── auth/         # 🔐 认证授权
│   │   │   ├── courses/      # 📚 课程管理
│   │   │   ├── attendance/   # ✅ 考勤管理
│   │   │   ├── assignments/  # 📝 作业管理
│   │   │   ├── classrooms/   # 🏫 教室管理
│   │   │   ├── students/     # 👥 学生管理
│   │   │   ├── analytics/    # 📊 数据分析
│   │   │   └── notifications/# 🔔 通知系统
│   │   ├── common/           # 公共组件
│   │   └── prisma/           # 数据库服务
│   ├── prisma/
│   │   ├── schema.prisma     # 数据模型
│   │   ├── seed.ts          # 种子数据
│   │   └── migrations/      # 数据迁移
│   └── uploads/             # 文件存储
├── frontend-teacher/        # 👨‍🏫 教师端 (React)
├── frontend-student/        # 👨‍🎓 学生端 (React)
├── docs/                   # 📖 项目文档
└── scripts/               # 🔧 工具脚本
```

### 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| **后端** | NestJS + TypeScript | 企业级Node.js框架 |
| **数据库** | PostgreSQL + Prisma | 关系型数据库 + 现代化ORM |
| **缓存** | 内存缓存 / Redis | 高性能数据缓存 |
| **认证** | JWT + Passport | 安全的身份认证 |
| **前端** | React 18 + TypeScript | 现代化前端框架 |
| **UI库** | Ant Design Pro | 企业级UI组件库 |
| **状态管理** | Redux Toolkit | 可预测的状态容器 |
| **实时通信** | Socket.io | WebSocket实时通信 |

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- PostgreSQL >= 13.0
- npm >= 8.0.0 或 yarn >= 1.22.0

### 一键安装

```bash
# 克隆项目
git clone https://github.com/your-org/smartteacher-pro.git
cd smartteacher-pro

# 安装依赖并初始化
./scripts/setup.sh  # Linux/Mac
# 或
./scripts/setup.bat # Windows
```

### 手动安装

#### 1️⃣ 后端配置

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件配置数据库连接

# 初始化数据库
npx prisma generate
npx prisma db push
npm run seed  # 生成测试数据

# 启动服务
npm run start:dev
```

#### 2️⃣ 前端配置

**教师端：**
```bash
cd frontend-teacher
npm install
PORT=3001 npm start
# 访问 http://localhost:3001
```

**学生端：**
```bash
cd frontend-student
npm install
PORT=3002 npm start
# 访问 http://localhost:3002
```

## 🔑 测试账号

| 角色 | 账号 | 密码 | 权限说明 |
|------|------|------|---------|
| 🔴 超级管理员 | admin@smartteacher.com | admin123456 | 系统所有权限 |
| 🟡 教师 | teacher@example.com | teacher123456 | 教学管理权限 |
| 🟢 学生 | student1@university.edu | student123456 | 学习相关权限 |

## ✨ 核心功能

### 1. 🎓 智能考勤系统

<table>
<tr>
<td width="50%">

**多样化签到方式**
- 📱 验证码签到
- 🔲 二维码扫描
- 🪑 座位选择签到
- 📍 地理围栏定位
- 👤 人脸识别（预留）

</td>
<td width="50%">

**智能防作弊**
- 🔒 IP地址检测
- ⏰ 时间窗口控制
- 📊 异常行为分析
- 📈 实时数据同步
- 📉 自动统计报表

</td>
</tr>
</table>

### 2. 📚 课程管理

- **课程创建** - 完整的课程信息管理
- **PPT上传** - 支持多种格式课件
- **学生管理** - 批量导入、分组管理
- **教室预约** - 智能排课系统
- **进度跟踪** - 课程进度可视化

### 3. 📝 作业管理

- **作业发布** - 富文本编辑器、模板库
- **在线提交** - 多格式文件支持
- **智能批改** - AI辅助评分建议
- **查重检测** - 自动相似度分析
- **成绩管理** - 多维度成绩统计

### 4. 🏫 教室管理

- **座位图可视化** - 拖拽式座位编排
- **设备管理** - 教室设备状态监控
- **预约系统** - 冲突检测、自动调度
- **使用率分析** - 资源利用率统计

### 5. 📊 数据分析

- **教学数据看板** - 实时数据展示
- **学生表现分析** - 个性化学习报告
- **课程质量评估** - 多维度评价体系
- **自定义报表** - 灵活的数据导出

### 6. 🔔 通知系统

- **实时推送** - WebSocket消息通知
- **多渠道通知** - 站内信、邮件、短信
- **定时提醒** - 作业截止、考试安排
- **公告管理** - 系统公告发布

## 📡 API接口

### 基础接口

| 模块 | 接口 | 说明 |
|------|------|------|
| **认证** | POST /api/auth/login | 用户登录 |
| | POST /api/auth/register | 用户注册 |
| | POST /api/auth/refresh | 刷新Token |
| **课程** | GET /api/courses | 课程列表 |
| | POST /api/courses | 创建课程 |
| | POST /api/courses/:id/ppt/upload | 上传PPT |
| **考勤** | POST /api/attendance/sessions/:id/start | 发起签到 |
| | POST /api/attendance/check-in/:id | 学生签到 |
| | GET /api/attendance/stats/:id | 考勤统计 |

完整API文档：http://localhost:3000/api/docs

## 🔧 开发指南

### 目录规范

```typescript
// 功能模块结构
src/modules/[module-name]/
├── dto/              # 数据传输对象
├── entities/         # 实体定义
├── [name].controller.ts  # 控制器
├── [name].service.ts     # 服务层
└── [name].module.ts      # 模块定义
```

### 代码规范

- **ESLint** - 代码检查
- **Prettier** - 代码格式化
- **Husky** - Git Hooks
- **Commitlint** - 提交规范

### 提交规范

```bash
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式
refactor: 代码重构
test: 测试相关
chore: 构建工具
```

## 🧪 测试

```bash
# 单元测试
npm run test

# E2E测试
npm run test:e2e

# 测试覆盖率
npm run test:cov

# API测试脚本
./test_api_complete_flow.sh
```

## 📊 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| **并发签到** | 1000+ | 支持千人同时签到 |
| **页面加载** | <2s | 首屏加载时间 |
| **API响应** | <500ms | 平均响应时间 |
| **系统可用性** | 99.9% | 年度可用性 |
| **数据备份** | 每日 | 自动备份机制 |

## 🔒 安全特性

- **JWT双令牌** - Access Token + Refresh Token
- **RBAC权限** - 基于角色的访问控制
- **数据加密** - AES-256敏感数据加密
- **审计日志** - 完整的操作记录
- **SQL注入防护** - Prisma ORM参数化查询
- **XSS防护** - 输入验证与转义
- **CSRF防护** - Token验证机制

## 🚀 部署

### Docker部署

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### PM2部署

```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status
```

## 📝 版本历史

- **v1.0.0** (2025-01) - 初始版本发布
  - ✅ 核心功能实现
  - ✅ 多端适配
  - ✅ 基础数据分析

- **v1.1.0** (计划中)
  - 📱 移动端优化
  - 🤖 AI批改增强
  - 📊 高级数据分析

## 🤝 贡献指南

欢迎提交 Pull Request 或创建 Issue！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

## 👥 团队

- **产品设计**: SmartTeacher Pro 产品团队
- **技术开发**: SmartTeacher Pro 研发团队
- **测试支持**: QA团队
- **运维支持**: DevOps团队

## 📞 联系方式

- 📧 邮箱: support@smartteacher.com
- 🌐 官网: https://smartteacher.pro
- 📖 文档: https://docs.smartteacher.pro
- 💬 社区: https://community.smartteacher.pro

---

<p align="center">
  <b>Made with ❤️ by SmartTeacher Pro Team</b>
</p>

<p align="center">
  Copyright © 2025 SmartTeacher Pro. All rights reserved.
</p>