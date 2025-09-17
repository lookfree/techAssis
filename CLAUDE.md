# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains documentation and specifications for **SmartTeacher Pro** (智慧教师专业版), an intelligent teaching assistant system designed for higher education institutions. The project aims to provide comprehensive classroom management tools including attendance tracking, assignment management, course administration, and data analytics.

## Current Status

This repository is in the **planning and specification phase** - it contains comprehensive requirements documentation but no actual code implementation yet.

## Repository Contents

The repository currently contains planning and specification documents:

- `教师智能助手功能分析报告.md` - Detailed functional analysis report in Chinese covering core modules including intelligent attendance system, assignment lifecycle management, course management, and user authentication
- `prp.md` - Comprehensive product requirements document (PRP) detailing technical specifications, system architecture, and implementation requirements

## Key System Components (from specifications)

### Core Modules
1. **智能课堂签到系统** (Intelligent Attendance System)
   - Multiple sign-in methods: verification codes, QR codes, seat mapping, geofencing, facial recognition
   - Anti-cheating mechanisms and real-time data synchronization
   - Automated attendance reporting and analytics

2. **作业全周期管理** (Assignment Lifecycle Management)
   - Assignment creation with rich text editor and template library
   - AI-assisted grading for subjective questions using NLP
   - Automated plagiarism detection and version control
   - Grade management with statistical analysis

3. **课程管理与班级建设** (Course Management & Class Building)
   - Course creation and configuration
   - Batch student import and invitation systems
   - Multi-class parallel management
   - Student grouping and forum functionality

4. **用户认证与权限管理** (User Authentication & Permission Management)
   - Role-based access control (teachers vs students)
   - Integration with university information systems
   - Multi-factor authentication support

### Planned Technical Stack
- **Frontend**: React 18 + TypeScript, Ant Design Pro, Redux Toolkit
- **Mobile**: React Native or Flutter for student app
- **Backend**: Node.js + NestJS + TypeScript
- **Database**: PostgreSQL + TypeORM, Redis for caching
- **Authentication**: JWT with university system integration
- **Real-time**: WebSocket (Socket.io)
- **Storage**: MinIO or Aliyun OSS
- **AI Services**: NLP APIs for intelligent grading
- **Deployment**: Docker + Kubernetes

### Architecture Principles
- Microservices architecture with independent module deployment
- RESTful API + GraphQL hybrid design
- Event Sourcing for attendance and grade change auditing
- Gateway pattern for unified API entry and permission control

## Development Phases (Planned)
1. Requirements analysis and prototype design (2 weeks)
2. System architecture design (1 week)
3. Database design and framework setup (2 weeks)
4. User authentication and permission system (2 weeks)
5. Attendance system development (3 weeks)
6. Assignment management system (3 weeks)
7. Course management features (2 weeks)
8. Data analysis and reporting (2 weeks)
9. Classroom interaction tools (2 weeks)
10. System integration testing (2 weeks)
11. Performance optimization and security hardening (1 week)
12. Deployment and training (1 week)

## Security and Compliance Requirements
- Student data encryption and privacy protection compliance
- Audit logging for all critical operations
- Support for accessibility standards
- Integration with mainstream university management systems
- Real-time data backup with 3-year retention policy

## Performance Requirements
- Support 1000+ concurrent student sign-ins
- Page load times <2 seconds, API response <500ms
- Batch assignment grading: 1000 assignments/hour
- 99.9% system availability guarantee

## Database Configuration

According to the specifications, the system will use PostgreSQL database with the following configuration:

```
PostgreSQL Database:
- Host: [configured via environment variable]
- Port: [configured via environment variable]
- Database: [configured via environment variable]
- Username: [configured via environment variable]
- Password: [configured via environment variable]
- Connection Pool: min: 10, max: 100
```

Note: Actual database credentials should be configured in the `.env` file (not tracked in version control)

## Environment Setup (When Implementation Begins)

Based on the specifications, the expected environment structure will be:

```bash
# Development setup commands (not yet implemented):
npm install                    # Install dependencies
npm run dev                    # Start development server
npm run build                  # Build for production
npm run test                   # Run test suite
npm run lint                   # Run linter
npm run typecheck              # TypeScript type checking

# Database migrations (planned):
npm run migration:run          # Run database migrations
npm run seed                   # Seed development data
```

## Implementation Guidelines

When implementing the system:

1. **Architecture**: Follow the modular monolith pattern specified in `prp.md`
2. **Security**: Implement JWT authentication with refresh tokens and role-based access control
3. **Real-time Features**: Use WebSocket (Socket.io) for attendance synchronization and notifications
4. **File Storage**: Implement local file system storage with multer for uploads
5. **Database**: Use PostgreSQL with TypeORM, including proper indexing for high-concurrency attendance scenarios
6. **Testing**: Include unit tests (Jest), integration tests, and E2E tests (Cypress)

## Key Features to Implement

1. **Intelligent Attendance System** - Multiple sign-in methods including seat mapping visualization
2. **Assignment Lifecycle Management** - AI-assisted grading with NLP integration
3. **Course Management** - Multi-class parallel management with batch operations
4. **Real-time Communication** - WebSocket-based notifications and status updates

This repository is currently documentation-only. All actual implementation code, build scripts, and deployment configurations are yet to be created.