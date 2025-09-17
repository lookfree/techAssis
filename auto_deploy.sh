#!/usr/bin/expect -f

# 设置超时时间
set timeout 300

# 从环境变量读取服务器信息
set host [lindex $argv 0]
set username [lindex $argv 1]
set password [lindex $argv 2]

if {$host == "" || $username == "" || $password == ""} {
    puts "使用方法: ./auto_deploy.sh <host> <username> <password>"
    exit 1
}

# 连接SSH
spawn ssh $username@$host

# 处理SSH密钥验证
expect {
    "yes/no" {
        send "yes\r"
        exp_continue
    }
    "password:" {
        send "$password\r"
    }
}

# 等待登录成功
expect "root@*" {
    send "echo '开始拉取Docker镜像...'\r"
}

# 拉取后端镜像
expect "root@*" {
    send "docker pull lookfree/smartteacher-backend:latest\r"
}

# 等待拉取完成
expect "root@*" {
    send "echo '后端镜像拉取完成'\r"
}

# 拉取教师端镜像
expect "root@*" {
    send "docker pull lookfree/smartteacher-teacher-frontend:latest\r"
}

# 等待拉取完成
expect "root@*" {
    send "echo '教师端镜像拉取完成'\r"
}

# 拉取学生端镜像
expect "root@*" {
    send "docker pull lookfree/smartteacher-student-frontend:latest\r"
}

# 等待拉取完成
expect "root@*" {
    send "echo '学生端镜像拉取完成'\r"
}

# 查看镜像列表
expect "root@*" {
    send "docker images | grep lookfree\r"
}

# 退出
expect "root@*" {
    send "exit\r"
}

expect eof