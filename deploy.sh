#!/bin/bash

# 远程服务器信息
HOST="60.205.160.74"
USERNAME="root"

echo "正在连接到远程服务器 $HOST..."
echo "请输入密码: LOOK822621+1s"

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