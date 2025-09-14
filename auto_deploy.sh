#!/usr/bin/expect -f

# 设置超时时间
set timeout 300

# 远程服务器信息
set host "60.205.160.74"
set username "root"
set password "LOOK822621+1s"

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