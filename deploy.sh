#!/bin/bash

# 从环境变量或参数读取服务器信息
HOST="${DEPLOY_HOST:-$1}"
USERNAME="${DEPLOY_USER:-$2}"

if [ -z "$HOST" ] || [ -z "$USERNAME" ]; then
    echo "使用方法: ./deploy.sh <host> <username>"
    echo "或设置环境变量: DEPLOY_HOST 和 DEPLOY_USER"
    exit 1
fi

echo "正在连接到远程服务器 $HOST..."

# SSH到远程服务器并执行docker pull命令
ssh $USERNAME@$HOST << 'EOF'
echo "开始拉取Docker镜像..."

# 拉取后端镜像
echo "1. 拉取后端镜像..."
docker pull lookfree/smartteacher-backend:latest

# 拉取教师端镜像
echo "2. 拉取教师端镜像..."
docker pull lookfree/smartteacher-teacher-frontend:latest

# 拉取学生端镜像
echo "3. 拉取学生端镜像..."
docker pull lookfree/smartteacher-student-frontend:latest

echo "镜像拉取完成！"

# 查看已拉取的镜像
echo ""
echo "已拉取的镜像列表："
docker images | grep lookfree

EOF

echo "部署脚本执行完成！"