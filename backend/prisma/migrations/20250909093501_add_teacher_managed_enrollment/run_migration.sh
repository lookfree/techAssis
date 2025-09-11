#!/bin/bash

# ================================================
# SmartTeacher Pro 数据库迁移执行脚本
# 创建日期: 2025-09-09
# 描述: 按顺序执行所有数据库迁移脚本
# ================================================

# 数据库连接配置
DB_HOST="60.205.160.74"
DB_PORT="5432"
DB_NAME="smartteacher_db"
DB_USER="postgres"
DB_PASS="uro@#wet8332@"

# 迁移脚本列表（按执行顺序）
SCRIPTS=(
  "001_create_student_classes.sql"
  "002_create_operation_logs.sql"
  "003_create_course_materials.sql"
  "004_create_presentation_sessions.sql"
  "005_extend_users_table.sql"
  "006_optimize_indexes.sql"
  "007_migrate_historical_data.sql"
)

# 颜色输出定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    # 检查 psql 命令
    if ! command -v psql &> /dev/null; then
        log_error "psql 命令未找到，请安装 PostgreSQL 客户端"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 测试数据库连接
test_connection() {
    log_info "测试数据库连接..."
    
    export PGPASSWORD=$DB_PASS
    if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" &> /dev/null; then
        log_success "数据库连接成功"
    else
        log_error "数据库连接失败，请检查连接参数"
        exit 1
    fi
}

# 创建备份
create_backup() {
    log_info "创建数据库备份..."
    
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    export PGPASSWORD=$DB_PASS
    
    if pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME > $BACKUP_FILE; then
        log_success "备份创建成功: $BACKUP_FILE"
    else
        log_warning "备份创建失败，但继续执行迁移"
    fi
}

# 执行单个迁移脚本
execute_script() {
    local script=$1
    log_info "执行迁移脚本: $script"
    
    export PGPASSWORD=$DB_PASS
    if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $script; then
        log_success "$script 执行成功"
        return 0
    else
        log_error "$script 执行失败"
        return 1
    fi
}

# 验证迁移结果
verify_migration() {
    log_info "验证迁移结果..."
    
    export PGPASSWORD=$DB_PASS
    
    # 检查新建表是否存在
    tables_check=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_name IN ('student_classes', 'operation_logs', 'course_materials', 'presentation_sessions');
    ")
    
    if [ "$tables_check" -eq 4 ]; then
        log_success "所有新表创建成功"
    else
        log_warning "部分表可能创建失败，请检查"
    fi
    
    # 检查用户表是否添加了新字段
    column_check=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name IN ('class_id', 'academic_year', 'enrollment_date');
    ")
    
    if [ "$column_check" -eq 3 ]; then
        log_success "用户表字段扩展成功"
    else
        log_warning "用户表字段扩展可能不完整"
    fi
}

# 主执行函数
main() {
    echo "================================================"
    echo "SmartTeacher Pro 数据库迁移脚本"
    echo "执行时间: $(date)"
    echo "================================================"
    
    # 检查当前目录是否包含迁移脚本
    if [ ! -f "001_create_student_classes.sql" ]; then
        log_error "未在当前目录找到迁移脚本，请确保在正确的目录执行"
        exit 1
    fi
    
    # 执行检查
    check_dependencies
    test_connection
    
    # 询问是否创建备份
    read -p "是否创建数据库备份？(y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_backup
    fi
    
    # 询问确认执行
    read -p "确认执行数据库迁移？(y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "迁移已取消"
        exit 0
    fi
    
    # 记录开始时间
    start_time=$(date +%s)
    
    # 执行迁移脚本
    success_count=0
    for script in "${SCRIPTS[@]}"; do
        if execute_script $script; then
            ((success_count++))
        else
            log_error "迁移中断，已成功执行 $success_count 个脚本"
            exit 1
        fi
        echo "----------------------------------------"
    done
    
    # 计算执行时间
    end_time=$(date +%s)
    execution_time=$((end_time - start_time))
    
    # 验证结果
    verify_migration
    
    echo "================================================"
    log_success "数据库迁移完成！"
    log_info "执行时间: ${execution_time} 秒"
    log_info "成功执行: $success_count 个脚本"
    echo "================================================"
}

# 执行主函数
main "$@"