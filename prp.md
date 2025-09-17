# 上下文工程化产品需求提示词

# 教师智能助手系统

# 系统上下文层

## 角色定义

您是一位精通现代Web开发和教育技术的高级全栈开发工程师和软件架构师。您拥有丰富的经验，能够构建具有企业级架构、安全性和可扩展性的教育管理平台。您深刻理解教育场景的特殊需求，能够将教学管理需求转化为智能化、人性化的技术解决方案。

## 行为准则

- 在每个决策中始终优先考虑数据安全性、系统稳定性和用户体验
- 严格遵循教育行业数据保护规范和隐私政策
- 提供完整、可工作的生产就绪实现，特别关注高并发场景（如集中签到）
- 包含全面的权限管理、审计日志和数据追踪功能
- 生成清晰、文档完善的代码，便于学校IT部门维护和二次开发
- 充分考虑教育场景的特殊性，如学期管理、批量操作、成绩敏感性等

## 质量标准

- 代码必须通过教育行业安全标准，包括学生信息保护
- 所有功能模块必须支持大规模班级使用（200+学生同时操作）
- 包含完整的数据备份和恢复策略
- 提供详细的教师使用手册和学生操作指南
- 实现完善的异常处理机制，确保教学活动不受技术故障影响

# 领域上下文层

## 技术栈

- **前端**: React 18 with TypeScript, Ant Design Pro, Redux Toolkit 用于状态管理
- **移动端**: PWA（Progressive Web App）响应式Web应用，支持离线缓存和推送通知
- **后端**: Node.js with NestJS and TypeScript
- **数据库**: PostgreSQL with PrismaORM
- **身份验证**: JWT tokens with refresh token机制
- **实时通信**: WebSocket (Socket.io) 用于实时签到和通知推送
- **文件存储**: 本地文件系统存储（使用multer处理上传）
- **AI服务**: 集成自然语言处理API用于作业智能批改
- **部署**: Docker containers

## 架构模式

- 模块化单体架构（Modular Monolith），便于初期快速开发
- RESTful API设计，清晰的资源导向
- MVC分层架构，职责分离
- Repository模式用于数据访问层
- Service层处理业务逻辑
- 中间件模式处理认证、日志、错误处理等横切关注点

## 行业标准

- **数据安全**: 符合《个人信息保护法》，学生数据加密存储
- **可访问性**: 支持视障学生使用，符合无障碍设计规范
- **性能要求**: 签到响应时间<1秒，支持500+并发签到
- **数据标准**: 支持教务系统标准数据格式导入导出
- **备份策略**: 实时数据备份，作业和成绩数据保留3年

# 任务上下文层

## 应用概述

**名称**: SmartTeacher Pro（智慧教师专业版）
**类型**: 教育管理综合平台
**目标**: 为高校教师提供智能化教学管理工具，覆盖课前准备、课中互动、课后管理全流程，通过技术手段提升教学效率，改善师生互动体验。

## 功能需求

### 核心功能模块

#### 1. **用户管理与认证系统**

**教师端功能：**

- 教师账号注册与实名认证
- 与学校教务系统对接，自动同步教师信息
- 多因素身份验证（手机号+密码+人脸识别）
- 教师个人信息维护（职称、院系、研究方向等）
- 权限分级：超级管理员、院系管理员、普通教师

**学生管理系统：**

- **统一学生信息维护**：
  - 全校学生信息统一管理，避免重复录入
  - 支持教务系统数据同步，自动更新学生基础信息
  - 学生基本信息包括：学号、姓名、性别、专业、年级、班级、联系方式等
  - 学生状态管理：在校、休学、转学、毕业等状态追踪
- **学生认证与登录**：
  - 学生统一认证登录（学号+密码）
  - 支持第三方登录（微信、QQ等，可选）
  - 多设备登录管理和安全验证
- **学生信息统一导入与维护**：
  - 系统管理员统一导入全校学生信息（Excel/CSV批量导入）
  - 按院系、专业、年级、班级等维度组织学生信息
  - 提供学生信息的增删改查统一管理界面
  - 支持按班级、专业等条件批量查询和筛选学生

#### 2. **智能课堂签到系统**

**基础签到功能：**

- **课程学生管理**：
  - 教师在创建课程时选择参与学生（建立课程-学生多对多关系）
  - 支持按班级批量选择学生（如"软件工程2021级1班"）
  - 支持单个学生添加和移除
  - 可以按专业、年级、班级等条件筛选并批量添加学生
  - 自动生成每个课程的实时花名册
  
- **签到数据管理**：
  - 基于课程学生关系生成签到记录，避免数据冗余
  - 支持按课程、时间、学生等多维度筛选历史签到记录  
  - 签到数据实时同步，支持离线缓存
  - 跨课程签到统计，生成学生综合出勤分析

**模拟座位图签到：**

- 支持自定义教室布局（阶梯教室、普通教室、实验室）
- 教师可上传或绘制教室座位布局图
- 学生通过手机端选择实际就坐的座位进行签到
- 自动生成座位分布热力图，直观显示学生分布
- 支持固定座位和自由选座两种模式
- 座位状态实时更新（空闲、已占用、请假）
- 记录学生座位偏好，便于教师认识学生

**签到管理功能：**

- 补签功能：限定时间窗口内的补签申请
- 签到统计：自动生成出勤率报表，标记习惯性迟到学生

#### 3. **作业全周期管理**

**作业发布增强功能：**

- **富文本编辑器升级**：
  - 支持LaTeX数学公式编辑和渲染
  - 代码高亮显示（支持多种编程语言）  
  - 图表、表格、流程图插入
  - 音频、视频嵌入支持
  - Markdown格式支持
- **作业模板系统**：
  - 可复用的作业模板库（按学科、题型分类）
  - 自定义模板创建和分享
  - 模板评分标准预设
  - 快速克隆历史作业功能
- **作业配置选项**：
  - 允许迟交设置（扣分规则可配置）
  - 重做次数限制和评分策略
  - 协作作业支持（小组作业分配和评分）
  - 匿名评议功能（学生互评作业）

**作业提交：**

- 支持多种格式（PDF、Word、图片、视频、代码文件）
- 在线编辑器（支持Markdown、代码高亮）
- 版本管理：学生可多次提交，保留所有版本
- 防抄袭检测：自动检测作业相似度

**智能批改系统：**

- **客观题自动批改：** 
  - 支持选择题、填空题、判断题
  - 支持答案模糊匹配（如同义词识别）
- **主观题AI辅助：**
  - 关键点识别：检测答案是否包含必要知识点
  - 语言质量评估：语法、逻辑、表达流畅度评分
  - 相似度检测：标记疑似抄袭内容
  - 批改建议生成：为每份作业生成个性化评语
- **批改工作流：**
  - 批量批改：相似答案快速批改
  - 评分标准设置：自定义评分规则和权重
  - 批改进度追踪：显示待批/已批作业数量
    **成绩管理：**
- 成绩自动统计：平均分、最高分、分数分布
- 成绩导出：支持教务系统格式
- 成绩复议：学生申请复查，教师二次批改
- 历史成绩对比：学生个人成绩趋势分析

#### 4. **课程管理与班级建设**

**课程创建与配置：**

- 课程基本信息管理（课程大纲、教学计划、考核方式）
- **课程学生选择**：
  - 教师在创建课程时从全校学生库中选择参与学生
  - 支持按班级批量选择（如"软件工程2021级1班"）
  - 支持按专业、年级等条件筛选并批量添加
  - 支持单个学生的添加和移除
  - 课程创建后仍可随时调整学生名单
- 课程资源库（课件、视频、参考资料）
- 课程公告发布
- 教学日历同步

**课程学生管理：**

- **学生名单管理**：
  - 查看当前课程所有参与学生列表
  - 支持学生信息的查看和基本编辑
  - 学生在课程中的学习状态追踪
  - 批量导出学生名单和成绩单
  
- **多班级并行管理**：
  - 同一教师可创建多个独立课程
  - 不同课程可以有不同的学生组合
  - 支持跨班级、跨专业的学生选择
  
- **学生分组与协作**：
  - 基于课程学生的分组功能（学习小组、项目团队）
  - 课程内学生分组，支持小组作业和协作
  - 班委设置和权限分配
  - 班级论坛和讨论区，促进学生交流

**课程数据分析：**

- 课程参与度分析（签到率、作业提交率、讨论活跃度）
- 学习效果评估（成绩分布、知识点掌握度）
- 教学反馈收集（匿名评教、实时反馈）

#### 5. **智能数据分析与报告**

**教师端数据看板：**

- 教学工作量统计
- 班级整体学情分析
- 学生个体画像和预警
- 教学效果对比（不同班级、不同学期）

**学生端数据展示：**

- 个人学习报告（出勤、作业、成绩趋势）
- 同辈对比（匿名排名）
- 学习建议推送

**管理端报表：**

- 院系教学质量报告
- 教师教学评价汇总
- 异常数据监测（如大面积缺勤）

### 新增核心功能模块

#### 5.5. **教室管理与座位布局系统**

**教室绑定功能：**

- 课程创建完成后，强制绑定具体教室（支持多教室绑定）
- 教室基础信息管理（名称、位置、容量、设备配置）
- **时间独占性约束**：同一个教室在同一时间段内只能被一个课程绑定和使用

**教室布局设计：**

- 可视化座位布局编辑器，支持拖拽设计
- 预设教室类型模板：
  - 阶梯教室（倾斜排列，视野优化）
  - 普通教室（网格排列，规整布局）
  - 实验室（实验台布局，小组座位）
  - 研讨室（圆桌布局，互动交流）
- **教室模板系统**：
  - 每种类型的教室对应一个标准布局模板
  - 同一模板可对应多个具体的物理教室实例
  - 模板包含：座位排列方式、设备配置、容量范围
  - 支持基于模板快速创建新教室实例
- 自定义行列数配置（如6排8列，总计48个座位）
- 特殊座位标记（讲台附近VIP座位、后排观察席等）
- 无障碍座位预留和标识

**座位坐标系统：**

- 二维坐标定位（行号-列号，如A1, B3等）
- 座位状态实时同步：空闲、占用、预留、故障
- 座位属性配置：固定分配、自由选择、特殊需求座位
- 座位使用历史追踪，生成座位偏好分析

#### 5.6. **智能课堂管理系统**

**上课管理流程：**

- 教师一键开始上课，自动激活该课程的座位表格
- 系统根据课程表自动推送上课提醒给相关学生
- 实时显示当前教室布局和座位占用状况
- 支持课程暂停、继续、提前结束等状态管理

**学生座位选择签到：**

- 学生进入课堂后，手机显示实时座位分布图
- 学生点击对应座位坐标进行签到确认
- 必填信息：学号、姓名（防止代签）

#### 5.7. **PPT演示与课件管理系统**

**课件上传与管理：**

- 支持多种格式：PPT、PPTX、PDF、DOCX、视频、音频
- 课件版本控制，支持多版本并存和回滚
- 课件预览功能，无需下载即可浏览
- 课件分类管理：按章节、知识点、难度等维度组织
- 批量上传和文件夹结构保持

## 非功能性需求

### 性能要求

- **并发能力：** 支持1000+学生同时签到
- **响应时间：** 页面加载<2秒，API响应<500ms
- **数据处理：** 批量作业批改1000份/小时
- **存储容量：** 单课程支持100GB文件存储

### 安全要求

- **数据加密：** 敏感数据AES-256加密
- **访问控制：** 基于角色的细粒度权限控制
- **审计日志：** 所有关键操作留痕
- **数据备份：** 每日增量备份，每周全量备份

### 可用性要求

- **系统可用性：** 99.9%可用性保证
- **故障恢复：** RTO<1小时，RPO<10分钟
- **降级策略：** 核心功能优先保障

### 兼容性要求

- **浏览器支持：** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **移动设备：** iOS 13+, Android 8+
- **屏幕适配：** 响应式设计，支持手机、平板、PC

## 技术约束

- 必须支持与主流教务系统对接（正方、青果、URP等）
- 需提供开放API供第三方系统集成
- 支持私有化部署和SaaS两种模式
- 符合教育部相关信息化标准

# 交互上下文层

## 开发阶段

1. **架构设计**: 前后端分离、数据库schema设计、RESTful API规范、模块划分、组件层次结构
2. **后端基础**: JWT身份验证系统、PrismaORM数据模型、RBAC权限管理、核心API端点
3. **前端基础**: React组件库搭建、路由配置、Redux状态管理、Ant Design Pro集成
4. **核心功能-签到系统**: 座位图签到实现、座位布局管理、实时座位状态同步、签到统计报表
5. **核心功能-作业管理**: 作业发布与提交、文件上传处理、成绩自动统计、相似度检测
6. **实时功能**: Socket.io WebSocket集成、实时签到推送、消息通知系统、在线状态管理
7. **高级功能**: 数据库全文搜索、多维度筛选、数据报表生成、本地文件管理服务
8. **测试**: Jest单元测试、API集成测试、Cypress E2E测试
9. **文档**: Swagger API文档、教师操作手册、学生使用指南、系统部署文档
10. **生产设置**: Docker镜像构建、环境变量管理、日志系统配置

## 沟通风格

- 清晰解释架构决策和权衡，特别是教育场景的特殊考虑
- 为复杂业务逻辑提供详细代码注释（如座位分配算法、签到验证逻辑）
- 在适用时包含多种实现选项（如不同的座位布局模板）
- 主动解决潜在的可扩展性和安全问题（如并发选座、重复签到）
- 提供清晰的代码示例和使用说明

## 错误处理策略

- 实现全局错误处理中间件（统一错误格式和日志记录）
- 提供用户友好的错误消息（区分教师端和学生端的提示语言）
- 包含适当的调试日志（开发、测试、生产环境分级）
- 非关键功能的优雅降级（如座位图加载失败显示列表模式）
- 实现断线重连和数据补偿机制

## 数据库连接配置

### PostgreSQL主数据库

- **数据库类型**: PostgreSQL
- **主机**: [配置在环境变量中]
- **端口**: 5432（默认）
- **数据库名**: [配置在环境变量中]
- **用户名**: [配置在环境变量中]
- **密码**: [配置在环境变量中]
- **连接池**: min: 10, max: 100

**注意**: 数据库连接信息应配置在 `.env` 文件中，不要提交到版本控制

### 本地存储配置

- **文件上传目录**: ./uploads
- **临时文件目录**: ./temp
- **静态资源目录**: ./public
- **日志文件目录**: ./logs
- **会话存储**: 内存存储（开发）/ 文件存储（生产）

## 环境变量配置示例

```env
# 数据库配置
DATABASE_URL=postgresql://smartteacher_admin:password@localhost:5432/smartteacher_db

# 应用配置
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:3001

# 认证配置
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# 文件存储（本地）
UPLOAD_DIR=./uploads
TEMP_DIR=./temp
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif,mp4,zip

# AI服务配置（可选）
AI_SERVICE_URL=https://ai-api.example.com
AI_SERVICE_KEY=${AI_API_KEY}

# 邮件服务（可选）
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@smartteacher.edu
SMTP_PASS=${SMTP_PASSWORD}

# 日志配置
LOG_LEVEL=info
LOG_DIR=./logs
```

# 响应上下文层

## 输出结构

请按以下结构交付完整的SmartTeacher Pro教师智能助手系统：

### 1. 项目架构设计文档

- 系统整体架构图（微服务划分）
- 数据库ER图和表结构设计
- API接口设计文档（RESTful + GraphQL）
- 前后端交互流程图
- 部署架构图

### 2. 后端实现

- NestJS模块化架构实现
- PrismaORM数据模型和迁移脚本
- JWT认证和RBAC权限系统
- 座位图签到系统实现
- 作业管理服务
- WebSocket实时通信服务
- 文件上传和存储服务
- 数据分析和报表服务

### 3. 前端实现

**教师端Web应用：**

- React + TypeScript完整实现
- Ant Design Pro企业级UI
- Redux Toolkit状态管理
- 所有功能模块的页面和组件

**学生端PWA应用：**

- 响应式Web设计，完美适配手机/平板/PC
- 支持离线缓存，弱网环境可用
- 推送通知功能（作业提醒、签到通知）
- 可添加到手机主屏幕，获得类原生APP体验
- 无需安装，浏览器直接访问即可使用

### 4. 数据库设计

- PostgreSQL完整schema
- 数据迁移脚本
- 测试数据和种子数据
- 索引优化策略
- 本地文件存储结构设计

### 5. AI服务集成

- NLP作业批改服务
- 相似度检测算法
- 知识点提取模型
- 个性化推荐算法

### 6. 部署配置

- Docker容器化配置
- docker-compose开发环境配置
- 环境变量和配置管理
- Nginx反向代理配置
- PM2进程管理配置

### 7. 测试套件

- 单元测试（Jest）
- 集成测试
- 端到端测试（Cypress）
- 性能测试脚本
- 安全测试清单

### 8. 文档

- 系统管理员手册
- 教师使用手册
- 学生使用指南
- API开发文档
- 部署和运维手册
- 常见问题解答（FAQ）

### 9. 安全与合规

- 数据加密实现
- 访问控制和审计日志
- 隐私政策和使用条款模板
- 安全评估报告
- 灾备方案

### 10. 性能优化

- 数据库查询优化
- 缓存策略实施
- CDN配置
- 负载均衡方案
- 性能监控指标

## 代码组织要求

- 遵循Domain-Driven Design原则
- 使用TypeScript严格类型
- 实现依赖注入和控制反转
- 完善的错误处理和日志记录
- 代码注释覆盖率>30%
- Git提交规范（Conventional Commits）

## 特殊实现要求

- 座位图签到必须防止重复选座，实时同步座位状态
- 作业批改结果必须可追溯、可修改
- 所有涉及成绩的操作需要二次确认
- 支持批量操作但要有进度提示
- 关键数据变更需要保留历史版本
- 提供数据导入导出的错误处理和回滚机制

## 新增功能实现优先级和详细规划

### 阶段一：教室管理与座位系统 (优先级：高)

**实现内容：**
1. 教室信息管理系统
2. 座位布局可视化编辑器
3. 课程-教室绑定功能
4. 学生座位选择签到系统

**技术实现要点：**
- 使用Canvas或SVG实现座位布局编辑器
- WebSocket实现座位状态实时同步
- 防并发选座的乐观锁机制
- 座位坐标系统和路径算法

### 阶段二：PPT管理与演示系统 (优先级：高)

**实现内容：**
1. PPT/PDF文件上传和预处理
2. 在线PPT播放器和控制界面
3. 师生端PPT同步显示功能
4. PPT标注和录屏功能

**技术实现要点：**
- PDF.js用于PPT文件渲染
- Canvas API实现标注功能
- MediaRecorder API录制演示过程
- WebSocket实现师生端同步

### 阶段三：学生管理增强 (优先级：中)

**实现内容：**
1. 批量导入学生信息系统
2. 学生画像和行为分析
3. 智能分组和标签管理
4. 学习预警和推荐系统

**技术实现要点：**
- Excel/CSV解析和数据验证
- 机器学习算法用于行为分析
- 数据可视化展示学生画像
- 规则引擎实现智能推荐

### 阶段四：作业系统升级 (优先级：中)

**实现内容：**
1. 富文本编辑器和模板系统
2. 智能作业分发算法
3. 同伴评议和协作功能
4. 高级批改和分析工具

**技术实现要点：**
- Quill.js或类似富文本编辑器
- 算法实现个性化作业分配
- 区块链思想确保评议公正性
- NLP API集成智能批改

### 数据库扩展需求

**基于现有数据模型的扩展设计：**

## 📊 **现有数据模型分析**
当前系统已有完整的用户、课程、教室、签到等数据模型，我们需要在此基础上进行扩展，而不是重新设计。

## 🔧 **数据模型扩展方案**

### 1. **利用现有User表作为学生信息统一管理**
```sql
-- 现有User表已包含学生需要的字段：
-- studentId, firstName, lastName, email, phone, department, major, grade 等
-- 只需要新增几个字段来完善学生信息管理

ALTER TABLE users ADD COLUMN class_name VARCHAR(50);
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';
ALTER TABLE users ADD COLUMN academic_year VARCHAR(10);
ALTER TABLE users ADD COLUMN enrollment_date DATE;
```

### 2. **现有Enrollment表即为课程学生关系表**
```sql
-- 现有Enrollment表已实现学生-课程多对多关系：
-- studentId, courseId, status, finalGrade, attendanceRate 等
-- 符合新需求，无需修改，只需调整业务逻辑：
-- - 原来：学生自主选课创建enrollment记录
-- - 现在：教师创建课程时添加学生创建enrollment记录
```

### 3. **现有Classroom表已包含教室管理功能**
```sql
-- 现有Classroom表功能完整：
-- name, location, capacity, rows, seatsPerRow, layoutConfig 等
-- ClassroomBooking表管理教室预订
-- 无需修改，已满足需求
```

### 4. **现有Attendance和SeatMap表已支持签到管理**
```sql
-- 现有Attendance表：sessionDate, checkInTime, status, seatNumber 等
-- 现有SeatMap表：classroomId, seatNumber, status, studentId 等
-- 现有AttendanceSession表：管理签到会话
-- 无需修改，已满足座位签到需求
```

### 5. **新增表：学生班级管理**
```sql
-- 新增班级信息表，便于按班级批量管理学生
CREATE TABLE student_classes (
  id VARCHAR(30) PRIMARY KEY,
  name VARCHAR(100) NOT NULL, -- 班级名称，如"软件工程2021级1班"
  code VARCHAR(50) UNIQUE NOT NULL, -- 班级编码，如"SE2021-1"
  department VARCHAR(100), -- 院系
  major VARCHAR(100), -- 专业
  grade VARCHAR(10), -- 年级，如"2021"
  academic_year VARCHAR(10), -- 学年，如"2024-2025"
  class_teacher VARCHAR(100), -- 班主任
  total_students INTEGER DEFAULT 0, -- 班级总人数
  status VARCHAR(20) DEFAULT 'active', -- active, graduated, disbanded
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_department_major (department, major),
  INDEX idx_grade_academic_year (grade, academic_year)
);

-- 更新User表，添加班级关联
ALTER TABLE users ADD COLUMN class_id VARCHAR(30) REFERENCES student_classes(id);
```

### 6. **统一操作日志表**
```sql
-- 系统全局操作日志表，记录所有重要的系统操作
CREATE TABLE operation_logs (
  id VARCHAR(30) PRIMARY KEY,
  operation_type VARCHAR(50) NOT NULL, -- 操作类型枚举
  module VARCHAR(50) NOT NULL, -- 操作模块：course, user, attendance, assignment等
  target_type VARCHAR(50) NOT NULL, -- 目标类型：class, individual, course, assignment等
  target_id VARCHAR(30) NOT NULL, -- 目标资源ID
  affected_ids JSON, -- 受影响的资源ID列表，JSON数组格式
  operator_id VARCHAR(30) REFERENCES users(id), -- 操作者ID
  operator_role VARCHAR(20) NOT NULL, -- 操作者角色：teacher, student, admin
  details JSON, -- 操作详细信息，JSON格式
  before_data JSON, -- 操作前数据快照
  after_data JSON, -- 操作后数据快照
  ip_address VARCHAR(45), -- 操作IP地址（支持IPv6）
  user_agent VARCHAR(500), -- 用户代理信息
  success BOOLEAN DEFAULT true, -- 操作是否成功
  error_message VARCHAR(1000), -- 错误信息（如果失败）
  notes VARCHAR(500), -- 操作备注
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_operation_type_module_time (operation_type, module, created_at),
  INDEX idx_target_type_id_time (target_type, target_id, created_at),
  INDEX idx_operator_time (operator_id, created_at)
);

-- 操作类型枚举定义
/*
操作类型包括但不限于：
用户管理：create_user, update_user, delete_user, activate_user, deactivate_user
课程管理：create_course, update_course, delete_course, add_students_to_course, remove_students_from_course, batch_add_class_to_course
班级管理：create_class, update_class, delete_class, add_students_to_class, remove_students_from_class
考勤管理：start_attendance, check_in, update_attendance, export_attendance
作业管理：create_assignment, update_assignment, delete_assignment, submit_assignment, grade_assignment
教室管理：create_classroom, update_classroom, book_classroom, cancel_booking
课件管理：upload_material, update_material, delete_material, start_presentation
系统管理：login, logout, change_password, reset_password, system_backup, data_export, data_import
*/
```

**操作日志使用示例：**
```json
{
  "operation_type": "batch_add_class_to_course",
  "module": "course",
  "target_type": "course",
  "target_id": "course_123",
  "affected_ids": ["student_1", "student_2", "student_3"],
  "operator_id": "teacher_456",
  "operator_role": "teacher",
  "details": {
    "course_name": "数据结构与算法",
    "class_name": "软件工程2021级1班",
    "class_id": "SE2021-01",
    "student_count": 45
  },
  "before_data": {
    "enrollment_count": 20
  },
  "after_data": {
    "enrollment_count": 65
  },
  "success": true,
  "notes": "批量添加软件工程2021级1班学生到数据结构课程"
}
```

### 7. **新增表：PPT演示管理（基于现有FileUpload扩展）**
```sql
-- 课件文件管理表（扩展现有文件上传功能）
CREATE TABLE course_materials (
  id VARCHAR(30) PRIMARY KEY,
  course_id VARCHAR(30) REFERENCES courses(id),
  file_upload_id VARCHAR(30) REFERENCES file_uploads(id), -- 关联现有文件表
  name VARCHAR(255) NOT NULL, -- 课件名称
  type VARCHAR(50), -- ppt, pdf, doc, video 等
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_presentation BOOLEAN DEFAULT false, -- 是否为演示文件
  order_index INTEGER DEFAULT 0, -- 排序
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_course_materials (course_id, is_active)
);

-- PPT演示会话表
CREATE TABLE presentation_sessions (
  id VARCHAR(30) PRIMARY KEY,
  course_id VARCHAR(30) REFERENCES courses(id),
  material_id VARCHAR(30) REFERENCES course_materials(id),
  teacher_id VARCHAR(30) REFERENCES users(id),
  session_name VARCHAR(100), -- 演示会话名称
  current_slide INTEGER DEFAULT 1,
  total_slides INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'inactive', -- inactive, active, paused, ended
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  viewer_count INTEGER DEFAULT 0, -- 观看人数
  annotations JSON, -- 标注数据
  settings JSON, -- 演示设置
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_course_presentations (course_id, status)
);
```

## 🔄 **数据库迁移策略**

### 阶段一：扩展现有表
```sql
-- 1. 扩展用户表
ALTER TABLE users ADD COLUMN IF NOT EXISTS class_name VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS class_id VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS academic_year VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS enrollment_date DATE;

-- 2. 为班级查询优化添加索引
CREATE INDEX IF NOT EXISTS idx_users_class_major_grade ON users(class_name, major, grade) WHERE role = 'student';
CREATE INDEX IF NOT EXISTS idx_enrollments_course_status ON enrollments(course_id, status);
```

### 阶段二：创建新表
```sql
-- 按优先级顺序创建新表
CREATE TABLE student_classes (...);
CREATE TABLE operation_logs (...);
CREATE TABLE course_materials (...);  
CREATE TABLE presentation_sessions (...);
```

### 操作日志系统设计说明

**统一操作日志的设计优势：**
1. **全局审计追踪**：所有系统操作统一记录，便于审计和问题排查
2. **数据安全保障**：重要操作前后数据快照，支持数据恢复和回滚
3. **行为分析支持**：操作模式分析，为系统优化提供数据支持
4. **合规性要求**：满足教育行业数据管理和隐私保护法规

**关键字段说明：**
- `operation_type`：细粒度操作类型，便于分类统计和权限控制
- `module`：模块化管理，支持按业务模块独立查询和分析
- `before_data/after_data`：数据快照，支持变更追踪和回滚操作
- `affected_ids`：受影响资源列表，支持批量操作的影响分析
- `success/error_message`：操作结果记录，便于错误分析和系统监控

**性能优化策略：**
- 异步日志记录，不阻塞主业务流程
- 定期数据清理，保持查询性能
- 索引优化，支持常用查询场景
- 分表存储，大数据量下的性能保证

**操作日志应用场景：**
- 教师批量添加学生到课程的完整记录
- 学生选座签到的详细轨迹
- 成绩修改的全过程追踪
- 系统管理员的权限变更历史
- 异常操作的快速定位和分析

### 阶段三：数据迁移
```sql
-- 1. 创建默认班级记录
INSERT INTO student_classes (id, name, code, department, major, grade)
SELECT 
  CONCAT(COALESCE(department, 'UNKNOWN'), '_', COALESCE(major, 'UNKNOWN'), '_', COALESCE(grade, 'UNKNOWN')),
  CONCAT(COALESCE(major, '未知专业'), COALESCE(grade, '未知年级'), '班'),
  CONCAT(COALESCE(major, 'UNK'), COALESCE(grade, '0000')),
  department, major, grade
FROM users 
WHERE role = 'student' AND department IS NOT NULL
GROUP BY department, major, grade;

-- 2. 更新学生的班级关联
UPDATE users SET class_id = CONCAT(
  COALESCE(department, 'UNKNOWN'), '_', 
  COALESCE(major, 'UNKNOWN'), '_', 
  COALESCE(grade, 'UNKNOWN')
) WHERE role = 'student';
```

### 性能优化考虑

**并发处理：**
- 座位选择使用分布式锁避免冲突
- PPT同步使用WebSocket连接池管理
- 学生导入采用队列系统后台处理

**缓存策略：**
- Redis缓存座位状态和PPT会话信息
- CDN加速PPT和课件文件访问
- 数据库读写分离提升查询性能

**安全考虑：**
- 文件上传病毒扫描和格式验证
- 座位选择防刷机制和地理位置验证
- PPT演示权限控制和水印保护

------

# 执行请求

请按照上述定义的所有上下文层生成完整的SmartTeacher Pro教师智能助手系统。确保每个组件都是生产就绪的、完全文档化的，并遵循教育行业的特殊要求和最佳实践。

重点关注：

1. 座位图签到的用户体验和实时性
2. 作业管理的便捷性
3. 大规模并发场景的性能优化
4. 学生隐私和数据安全保护
5. 与现有教务系统的无缝集成

从项目架构设计文档开始，然后按逻辑顺序提供所有实现文件，确保学校IT部门能够成功部署和维护该系统。

## 用户界面设计原则

- **教师端Web应用**: 
  - 专业的仪表盘布局，左侧导航，右侧内容区
  - 支持多标签页操作，提高批改效率
  - 数据可视化优先，图表清晰直观
  - 批量操作便捷，支持快捷键

- **学生端PWA**: 
  - 响应式设计，手机优先
  - 底部导航栏，单手操作友好
  - 卡片式布局，信息层次清晰
  - 大按钮设计（最小44x44px），避免误操作
  - 支持深色模式，保护视力
  - Service Worker实现离线功能
  - Web Push API实现消息推送

- **响应式设计**: 
  - 断点：手机(<768px)、平板(768-1024px)、桌面(>1024px)
  - 触摸优化：最小点击区域44x44px
  - 自适应字体和间距
  - 无障碍设计：支持屏幕阅读器、键盘导航

## API设计规范

### RESTful端点示例

```
GET    /api/v1/courses              # 获取课程列表
POST   /api/v1/courses              # 创建课程
GET    /api/v1/courses/:id          # 获取课程详情
PUT    /api/v1/courses/:id          # 更新课程
DELETE /api/v1/courses/:id          # 删除课程

# 座位图签到相关
GET    /api/v1/classrooms           # 获取教室列表
POST   /api/v1/classrooms/layout    # 创建/更新教室布局
GET    /api/v1/attendance/seat-map  # 获取当前座位图状态
POST   /api/v1/attendance/select-seat # 选择座位并签到
GET    /api/v1/attendance/status    # 签到状态查询
POST   /api/v1/attendance/leave     # 请假申请

# 新增教室管理API
POST   /api/v1/classrooms           # 创建教室
PUT    /api/v1/classrooms/:id       # 更新教室信息
DELETE /api/v1/classrooms/:id       # 删除教室
GET    /api/v1/classrooms/:id/layout # 获取教室布局
POST   /api/v1/classrooms/:id/bind-course # 绑定课程到教室
GET    /api/v1/classrooms/schedule  # 获取教室使用时间表

# 课程管理增强API
POST   /api/v1/courses/:id/start-class # 教师开始上课
POST   /api/v1/courses/:id/end-class   # 教师结束上课
GET    /api/v1/courses/:id/realtime-seats # 获取实时座位状态
POST   /api/v1/courses/:id/upload-ppt   # 上传PPT课件
GET    /api/v1/courses/:id/ppt/:pptId   # 获取PPT内容
POST   /api/v1/courses/:id/ppt/:pptId/present # 开始PPT演示
POST   /api/v1/courses/:id/ppt/:pptId/annotate # 添加PPT标注

# 学生信息管理API（基于现有User表）
GET    /api/v1/users/students        # 获取学生列表（分页、筛选）
POST   /api/v1/users/students        # 创建单个学生用户
PUT    /api/v1/users/:id             # 更新学生信息（复用现有用户API）
DELETE /api/v1/users/:id             # 删除学生（软删除）
POST   /api/v1/users/students/batch-import # 批量导入学生
GET    /api/v1/users/:id/profile     # 获取学生详细信息和画像
GET    /api/v1/users/:id/courses     # 获取学生参与的课程列表
GET    /api/v1/users/students/analytics # 学生学习分析报告

# 班级管理API（新增功能）
GET    /api/v1/classes               # 获取班级列表
POST   /api/v1/classes               # 创建班级
PUT    /api/v1/classes/:id           # 更新班级信息
DELETE /api/v1/classes/:id           # 删除班级
GET    /api/v1/classes/:id/students  # 获取班级学生列表
POST   /api/v1/classes/batch-create  # 批量创建班级

# 课程学生管理API（基于现有Enrollment表）
GET    /api/v1/enrollments           # 获取选课记录列表（现有API）
POST   /api/v1/courses/:id/enroll-students # 教师添加学生到课程（创建enrollments）
DELETE /api/v1/enrollments/:id       # 移除学生（删除enrollment记录）
GET    /api/v1/courses/:id/students  # 获取课程学生列表（现有API）
POST   /api/v1/courses/:id/enroll-by-class # 按班级批量添加学生
POST   /api/v1/courses/:id/enroll-batch # 批量添加指定学生
GET    /api/v1/users/students/search # 按条件搜索学生（支持班级、专业等筛选）

# 课程学生批量操作API（新增功能）
POST   /api/v1/courses/:id/bulk-operations # 批量学生操作（添加/移除）
GET    /api/v1/courses/:id/operation-history # 查看批量操作历史
GET    /api/v1/courses/:id/enrollment-stats # 课程学生统计信息

# 作业系统增强API
POST   /api/v1/assignments          # 发布作业
POST   /api/v1/assignments/template # 创建作业模板
GET    /api/v1/assignments/:id/submissions  # 获取提交列表
POST   /api/v1/assignments/:id/grade        # 批改作业
POST   /api/v1/assignments/:id/peer-review  # 启动同伴评议
GET    /api/v1/assignments/templates        # 获取作业模板库
```

### GraphQL查询示例

```graphql
# 查询课程及其参与学生信息（基于现有Enrollment表）
query GetCourseWithStudents($courseId: ID!) {
  course(id: $courseId) {
    id
    name
    courseCode
    capacity
    teacher {
      id
      firstName
      lastName
      department
    }
    enrollments {
      id
      status
      enrolledAt      # 现有字段：学生加入课程的时间
      finalGrade
      attendanceRate
      student {
        id
        studentId
        firstName
        lastName
        major
        grade
        className      # 新增字段
        department
        # 基于现有关联计算的字段
        courseAttendanceRate: attendanceRate
        courseAverageScore: finalGrade
      }
    }
    totalStudents: enrollmentsCount(status: "active")
    classDistribution {      # 统计各班级学生分布
      className
      count
    }
  }
}

# 查询学生及其参与课程信息（基于现有User表）
query GetStudentWithCourses($studentId: ID!) {
  user(id: $studentId) {
    id
    studentId
    firstName
    lastName
    major
    grade
    className       # 新增字段
    department
    # 基于现有enrollments关联
    enrollments {
      id
      status
      enrolledAt
      finalGrade
      attendanceRate
      course {
        id
        courseCode
        name
        credits
        teacher {
          firstName
          lastName
        }
        semester
      }
    }
    totalCourses: enrollmentsCount(status: "active")
    # 基于现有attendances关联计算
    overallAttendanceRate
    semesterGPA
  }
}

# 查询班级信息及其学生（新增功能）
query GetClassWithStudents($classId: ID!) {
  studentClass(id: $classId) {
    id
    name
    code
    department
    major
    grade
    academicYear
    classTeacher
    totalStudents
    students {
      id
      studentId
      firstName
      lastName
      email
      phone
      status
      # 基于现有关联的统计数据
      totalCourses: enrollmentsCount(status: "active")
      overallAttendanceRate
      semesterGPA
    }
  }
}

# 多维度查询：获取学生在多个课程中的表现
query GetStudentPerformanceAcrossCourses($studentId: ID!) {
  student(id: $studentId) {
    id
    name
    performanceAnalytics {
      overallAttendanceRate
      averageGrade
      bestPerformingCourse {
        courseCode
        name
        grade
      }
      attendanceByMonth {
        month
        rate
      }
      gradeDistribution {
        courseCode
        courseName
        grade
        attendanceRate
      }
    }
  }
}
```


## 本地存储实现方案

### 文件存储结构

```
project-root/
├── uploads/                 # 上传文件存储
│   ├── assignments/        # 作业文件
│   │   ├── 2025/          # 按年份组织
│   │   │   ├── 01/        # 按月份组织
│   │   │   │   └── assignment_[id]_[timestamp].[ext]
│   ├── avatars/           # 用户头像
│   │   └── user_[id]_[timestamp].[ext]
│   ├── resources/         # 课程资源
│   │   └── course_[id]/
│   │       └── resource_[id]_[timestamp].[ext]
│   └── temp/              # 临时文件（定期清理）
├── logs/                   # 日志文件
│   ├── access/            # 访问日志
│   ├── error/             # 错误日志
│   └── app/               # 应用日志
└── sessions/              # 会话文件存储（可选）
```

### 文件处理策略

- **文件命名**: 使用UUID + 时间戳避免冲突
- **文件大小限制**: 单文件最大10MB（可配置）
- **文件类型限制**: 白名单机制，只允许安全的文件格式
- **定期清理**: 临时文件72小时后自动删除

### 缓存策略（内存缓存）

```javascript
// 使用node-cache实现简单的内存缓存
const NodeCache = require('node-cache');
const cache = new NodeCache({
  stdTTL: 600,      // 默认10分钟过期
  checkperiod: 120  // 每2分钟检查过期键
});

// 缓存常用数据
- 用户会话信息
- 签到状态（5分钟）
- 课程列表（10分钟）
- 统计数据（30分钟）
```

