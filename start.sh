#!/bin/bash

# SmartTeacher Pro 快速启动脚本

set -e

echo "🚀 启动 SmartTeacher Pro 智慧教师专业版"
echo "================================================="

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 获取启动模式
MODE=${1:-production}

echo "📦 启动模式: $MODE"

if [ "$MODE" == "dev" ] || [ "$MODE" == "development" ]; then
    echo "🔧 启动开发环境..."
    
    # 创建开发环境变量文件
    if [ ! -f "./backend/.env" ]; then
        echo "📝 创建后端环境变量文件..."
        cp ./backend/.env.example ./backend/.env
    fi
    
    # 启动开发环境
    docker-compose -f docker-compose.dev.yml up -d
    
    echo "✅ 开发环境启动成功!"
    echo ""
    echo "🌐 访问地址:"
    echo "   - 后端API:    http://localhost:3000"
    echo "   - API文档:    http://localhost:3000/api/docs"
    echo "   - 教师端:     http://localhost:3001"
    echo "   - 学生端:     http://localhost:3002"
    echo "   - 数据库:     localhost:5432"
    echo "   - Redis:      localhost:6379"
    
else
    echo "🏭 启动生产环境..."
    
    # 检查生产环境配置
    if [ ! -f "./backend/.env" ]; then
        echo "⚠️  警告: 生产环境需要配置环境变量"
        echo "请复制 .env.example 为 .env 并修改配置"
        exit 1
    fi
    
    # 构建镜像
    echo "🔨 构建应用镜像..."
    docker-compose build
    
    # 启动生产环境
    docker-compose up -d
    
    echo "✅ 生产环境启动成功!"
    echo ""
    echo "🌐 访问地址:"
    echo "   - 应用入口:   http://localhost"
    echo "   - 教师端:     http://localhost/teacher"
    echo "   - 学生端:     http://localhost/"
    echo "   - API文档:    http://localhost/api/docs"
fi

echo ""
echo "📋 常用命令:"
echo "   查看日志:     docker-compose logs -f"
echo "   停止服务:     docker-compose down"
echo "   重启服务:     docker-compose restart"
echo "   查看状态:     docker-compose ps"
echo ""

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 健康检查
echo "🔍 健康检查..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ 后端服务正常"
else
    echo "⚠️  后端服务可能未就绪，请稍后重试"
fi

echo ""
echo "🎉 SmartTeacher Pro 启动完成!"
echo "📖 更多信息请查看 README.md"