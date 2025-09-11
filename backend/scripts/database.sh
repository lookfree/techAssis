#!/bin/bash

# SmartTeacher Pro Database Management Script
# 数据库管理脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_USER="${DATABASE_USERNAME:-postgres}"
DB_PASSWORD="${DATABASE_PASSWORD:-postgres}"
DB_NAME="${DATABASE_NAME:-smartteacher_db}"
DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 PostgreSQL 连接
check_postgres() {
    log_info "检查 PostgreSQL 连接..."
    
    if ! command -v psql &> /dev/null; then
        log_error "PostgreSQL client (psql) 未安装"
        exit 1
    fi
    
    if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c '\q' 2>/dev/null; then
        log_error "无法连接到 PostgreSQL 服务器"
        log_error "请检查数据库连接配置: $DB_HOST:$DB_PORT"
        exit 1
    fi
    
    log_success "PostgreSQL 连接正常"
}

# 创建数据库
create_database() {
    log_info "创建数据库: $DB_NAME"
    
    # 检查数据库是否存在
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        log_warning "数据库 '$DB_NAME' 已存在"
        read -p "是否要删除并重新创建? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            drop_database
        else
            log_info "跳过数据库创建"
            return
        fi
    fi
    
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
    log_success "数据库 '$DB_NAME' 创建成功"
}

# 删除数据库
drop_database() {
    log_warning "删除数据库: $DB_NAME"
    
    # 终止所有连接到目标数据库的连接
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"
    
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
    log_success "数据库 '$DB_NAME' 删除成功"
}

# 执行迁移
run_migrations() {
    log_info "运行数据库迁移..."
    
    if [ ! -f "src/database/data-source.ts" ]; then
        log_error "未找到 data-source.ts 文件"
        exit 1
    fi
    
    npm run migration:run
    log_success "数据库迁移完成"
}

# 创建迁移文件
create_migration() {
    if [ -z "$1" ]; then
        log_error "请提供迁移名称"
        echo "使用方式: $0 migration:create <migration-name>"
        exit 1
    fi
    
    log_info "创建迁移文件: $1"
    npm run migration:create src/database/migrations/$1
    log_success "迁移文件创建成功"
}

# 撤销迁移
revert_migration() {
    log_warning "撤销最近的迁移..."
    read -p "确定要撤销迁移吗? (y/N): " confirm
    if [[ $confirm =~ ^[Yy]$ ]]; then
        npm run migration:revert
        log_success "迁移撤销成功"
    else
        log_info "取消撤销操作"
    fi
}

# 执行种子数据
run_seeds() {
    log_info "运行种子数据..."
    
    if [ ! -f "src/database/seeds/index.ts" ]; then
        log_error "未找到种子数据文件"
        exit 1
    fi
    
    npm run seed
    log_success "种子数据执行完成"
}

# 备份数据库
backup_database() {
    log_info "备份数据库..."
    
    local backup_dir="backups"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="${backup_dir}/${DB_NAME}_${timestamp}.sql"
    
    mkdir -p $backup_dir
    
    PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
        --clean --create --if-exists > $backup_file
    
    log_success "数据库备份完成: $backup_file"
}

# 还原数据库
restore_database() {
    if [ -z "$1" ]; then
        log_error "请提供备份文件路径"
        echo "使用方式: $0 restore <backup-file>"
        exit 1
    fi
    
    if [ ! -f "$1" ]; then
        log_error "备份文件不存在: $1"
        exit 1
    fi
    
    log_info "从备份文件还原数据库: $1"
    read -p "这将覆盖当前数据库，确定继续吗? (y/N): " confirm
    if [[ $confirm =~ ^[Yy]$ ]]; then
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres < "$1"
        log_success "数据库还原完成"
    else
        log_info "取消还原操作"
    fi
}

# 重置数据库
reset_database() {
    log_warning "重置数据库 (删除并重新创建)"
    read -p "这将删除所有数据，确定继续吗? (y/N): " confirm
    if [[ $confirm =~ ^[Yy]$ ]]; then
        drop_database
        create_database
        run_migrations
        run_seeds
        log_success "数据库重置完成"
    else
        log_info "取消重置操作"
    fi
}

# 检查数据库状态
check_status() {
    log_info "检查数据库状态..."
    
    check_postgres
    
    # 检查数据库是否存在
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        log_success "数据库 '$DB_NAME' 存在"
        
        # 检查表数量
        table_count=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
        
        log_info "数据表数量: $table_count"
        
        # 检查用户数量
        if [ "$table_count" -gt 0 ]; then
            user_count=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
            course_count=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM courses;" 2>/dev/null || echo "0")
            
            log_info "用户数量: $user_count"
            log_info "课程数量: $course_count"
        fi
    else
        log_warning "数据库 '$DB_NAME' 不存在"
    fi
}

# 显示帮助信息
show_help() {
    cat << EOF
SmartTeacher Pro Database Management Script

使用方式: $0 <command> [options]

Commands:
    init                    初始化数据库 (创建数据库 + 迁移 + 种子数据)
    create                  创建数据库
    drop                    删除数据库
    reset                   重置数据库 (删除 + 重新创建)
    
    migration:run           运行迁移
    migration:create <name> 创建迁移文件
    migration:revert        撤销迁移
    
    seed                    运行种子数据
    
    backup                  备份数据库
    restore <file>          从备份还原数据库
    
    status                  检查数据库状态
    help                    显示此帮助信息

环境变量:
    DATABASE_HOST           数据库主机 (默认: localhost)
    DATABASE_PORT           数据库端口 (默认: 5432)
    DATABASE_USERNAME       数据库用户名 (默认: postgres)
    DATABASE_PASSWORD       数据库密码 (默认: postgres)
    DATABASE_NAME           数据库名称 (默认: smartteacher_db)

示例:
    $0 init                 # 完整初始化数据库
    $0 status              # 检查数据库状态
    $0 backup              # 备份数据库
    $0 seed                # 运行种子数据

EOF
}

# 初始化数据库
init_database() {
    log_info "初始化 SmartTeacher Pro 数据库..."
    
    check_postgres
    create_database
    
    # 应用schema
    log_info "应用数据库 schema..."
    if [ -f "database-schema.sql" ]; then
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database-schema.sql
        log_success "Schema 应用成功"
    else
        log_warning "未找到 database-schema.sql，将使用迁移"
        run_migrations
    fi
    
    run_seeds
    
    log_success "数据库初始化完成!"
    log_info ""
    log_info "🔑 默认登录账户:"
    log_info "   管理员: admin@smartteacher.com / admin123"
    log_info "   教师: teacher1@university.edu / teacher123"
    log_info "   学生: student1@university.edu / student123"
}

# 主程序
main() {
    case "$1" in
        "init")
            init_database
            ;;
        "create")
            check_postgres
            create_database
            ;;
        "drop")
            drop_database
            ;;
        "reset")
            reset_database
            ;;
        "migration:run")
            run_migrations
            ;;
        "migration:create")
            create_migration "$2"
            ;;
        "migration:revert")
            revert_migration
            ;;
        "seed")
            run_seeds
            ;;
        "backup")
            backup_database
            ;;
        "restore")
            restore_database "$2"
            ;;
        "status")
            check_status
            ;;
        "help"|"--help"|"-h"|"")
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"