#!/bin/bash

# ================================================
# SmartTeacher Pro Prisma 数据库迁移执行脚本
# 创建日期: 2025-09-09
# 描述: 按照项目工作流程执行 Prisma 数据库迁移
# ================================================

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

# 检查是否在正确的目录
check_directory() {
    log_info "检查项目目录结构..."
    
    # 检查是否在项目根目录
    if [ ! -f "package.json" ]; then
        log_error "请在项目根目录执行此脚本"
        exit 1
    fi
    
    # 检查 backend 目录
    if [ ! -d "backend" ]; then
        log_error "未找到 backend 目录"
        exit 1
    fi
    
    # 检查 Prisma schema 文件
    if [ ! -f "backend/prisma/schema.prisma" ]; then
        log_error "未找到 Prisma schema 文件"
        exit 1
    fi
    
    log_success "目录结构检查通过"
}

# 检查依赖
check_dependencies() {
    log_info "检查项目依赖..."
    
    # 检查 pnpm
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm 未安装，请先安装 pnpm"
        exit 1
    fi
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 安装项目依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    if pnpm install; then
        log_success "项目依赖安装成功"
    else
        log_error "项目依赖安装失败"
        exit 1
    fi
}

# 生成 Prisma 客户端
generate_prisma_client() {
    log_info "生成 Prisma 客户端..."
    
    cd backend
    
    if pnpm prisma generate; then
        log_success "Prisma 客户端生成成功"
    else
        log_error "Prisma 客户端生成失败"
        cd ..
        exit 1
    fi
    
    cd ..
}

# 执行数据库迁移（开发环境）
migrate_dev() {
    log_info "执行数据库迁移（开发环境）..."
    
    cd backend
    
    # 设置迁移名称
    MIGRATION_NAME="add_teacher_managed_features"
    
    if pnpm prisma migrate dev --name "$MIGRATION_NAME"; then
        log_success "数据库迁移执行成功"
    else
        log_error "数据库迁移执行失败"
        cd ..
        exit 1
    fi
    
    cd ..
}

# 执行数据库迁移（生产环境）
migrate_deploy() {
    log_info "执行数据库迁移（生产环境）..."
    
    cd backend
    
    if pnpm prisma migrate deploy; then
        log_success "生产环境数据库迁移部署成功"
    else
        log_error "生产环境数据库迁移部署失败"
        cd ..
        exit 1
    fi
    
    cd ..
}

# 初始化种子数据
seed_database() {
    log_info "初始化种子数据..."
    
    cd backend
    
    # 检查是否存在种子文件
    if [ -f "prisma/seed.ts" ] || [ -f "prisma/seed.js" ]; then
        if pnpm prisma db seed; then
            log_success "种子数据初始化成功"
        else
            log_warning "种子数据初始化失败，但可以继续"
        fi
    else
        log_info "未找到种子文件，跳过种子数据初始化"
    fi
    
    cd ..
}

# 重置数据库
reset_database() {
    log_warning "⚠️  即将重置数据库，这将删除所有数据！"
    read -p "确认重置数据库？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "数据库重置已取消"
        return 0
    fi
    
    log_info "重置数据库..."
    
    cd backend
    
    if pnpm prisma migrate reset --force; then
        log_success "数据库重置成功"
    else
        log_error "数据库重置失败"
        cd ..
        exit 1
    fi
    
    cd ..
}

# 启动数据库管理界面
start_studio() {
    log_info "启动数据库管理界面..."
    
    cd backend
    
    log_info "数据库管理界面将在浏览器中打开..."
    log_info "按 Ctrl+C 可以停止服务"
    
    pnpm prisma studio
    
    cd ..
}

# 检查数据库连接
check_database_connection() {
    log_info "检查数据库连接..."
    
    cd backend
    
    if pnpm prisma db pull --force; then
        log_success "数据库连接正常"
    else
        log_error "数据库连接失败，请检查环境变量配置"
        cd ..
        exit 1
    fi
    
    cd ..
}

# 显示帮助信息
show_help() {
    echo "================================================"
    echo "SmartTeacher Pro Prisma 数据库迁移脚本"
    echo "================================================"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  setup      - 完整设置（安装依赖 + 生成客户端 + 迁移）"
    echo "  dev        - 开发环境迁移"
    echo "  deploy     - 生产环境迁移"
    echo "  generate   - 生成 Prisma 客户端"
    echo "  seed       - 初始化种子数据"
    echo "  reset      - 重置数据库"
    echo "  studio     - 启动数据库管理界面"
    echo "  check      - 检查数据库连接"
    echo "  help       - 显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 setup     # 完整设置项目"
    echo "  $0 dev       # 开发环境迁移"
    echo "  $0 studio    # 启动数据库管理界面"
    echo ""
    echo "环境变量:"
    echo "  DATABASE_URL - 数据库连接字符串"
    echo ""
    echo "注意事项:"
    echo "  - 请确保在项目根目录执行此脚本"
    echo "  - 请确保数据库服务正在运行"
    echo "  - 生产环境部署前请先备份数据库"
    echo ""
}

# 主函数
main() {
    case "${1:-help}" in
        "setup")
            echo "================================================"
            echo "SmartTeacher Pro 完整设置"
            echo "================================================"
            check_directory
            check_dependencies
            install_dependencies
            generate_prisma_client
            migrate_dev
            seed_database
            log_success "完整设置完成！"
            ;;
        "dev")
            echo "================================================"
            echo "开发环境数据库迁移"
            echo "================================================"
            check_directory
            check_dependencies
            generate_prisma_client
            migrate_dev
            log_success "开发环境迁移完成！"
            ;;
        "deploy")
            echo "================================================"
            echo "生产环境数据库迁移"
            echo "================================================"
            check_directory
            check_dependencies
            generate_prisma_client
            migrate_deploy
            log_success "生产环境迁移完成！"
            ;;
        "generate")
            echo "================================================"
            echo "生成 Prisma 客户端"
            echo "================================================"
            check_directory
            check_dependencies
            generate_prisma_client
            ;;
        "seed")
            echo "================================================"
            echo "初始化种子数据"
            echo "================================================"
            check_directory
            check_dependencies
            seed_database
            ;;
        "reset")
            echo "================================================"
            echo "重置数据库"
            echo "================================================"
            check_directory
            check_dependencies
            reset_database
            ;;
        "studio")
            echo "================================================"
            echo "启动数据库管理界面"
            echo "================================================"
            check_directory
            check_dependencies
            start_studio
            ;;
        "check")
            echo "================================================"
            echo "检查数据库连接"
            echo "================================================"
            check_directory
            check_dependencies
            check_database_connection
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# 执行主函数
main "$@"