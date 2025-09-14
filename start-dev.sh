#!/bin/bash

echo "🚀 启动 SmartTeacher Pro 开发环境..."

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 启动后端
echo -e "${BLUE}启动后端服务...${NC}"
cd backend && npm run start:dev &
BACKEND_PID=$!

# 等待后端启动
sleep 5

# 启动教师端前端
echo -e "${BLUE}启动教师端前端...${NC}"
cd ../frontend-teacher && REACT_APP_API_URL=http://localhost:3000 npm start &
TEACHER_PID=$!

# 启动学生端前端
echo -e "${BLUE}启动学生端前端...${NC}"
cd ../frontend-student && REACT_APP_API_URL=http://localhost:3000 PORT=3002 npm start &
STUDENT_PID=$!

echo -e "${GREEN}✅ 所有服务启动完成！${NC}"
echo ""
echo "📝 访问地址："
echo "  后端 API: http://localhost:3000"
echo "  教师端: http://localhost:3001"
echo "  学生端: http://localhost:3002"
echo ""
echo "📧 测试账号："
echo "  教师: teacher@example.com / teacher123456"
echo "  学生: student1@example.com / student123456"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "kill $BACKEND_PID $TEACHER_PID $STUDENT_PID 2>/dev/null; exit" INT
wait