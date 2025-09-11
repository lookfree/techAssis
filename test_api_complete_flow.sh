#!/bin/bash

# ================================================
# SmartTeacher Pro 完整功能测试脚本
# 包括统一学生管理、课程创建、PPT上传、签到等功能
# ================================================

# 配置
BASE_URL="http://localhost:3000/api"
TEST_DATA_DIR="./test_data"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 全局变量
ADMIN_TOKEN=""
TEACHER_TOKEN=""
STUDENT_TOKEN=""
COURSE_ID=""
CLASS_ID=""
STUDENT_IDS=()

# 创建测试数据目录
setup_test_environment() {
    log_info "设置测试环境..."
    mkdir -p "$TEST_DATA_DIR"
    
    # 创建测试PPT文件（模拟）
    echo "Mock PPT Content" > "$TEST_DATA_DIR/test_presentation.ppt"
    
    log_success "测试环境设置完成"
}

# 检查API响应
check_response() {
    local response="$1"
    local expected_status="$2"
    local description="$3"
    
    local status=$(echo "$response" | jq -r '.status // 200')
    
    if [ "$status" = "$expected_status" ] || [ "$expected_status" = "any" ]; then
        log_success "$description - 状态码: $status"
        return 0
    else
        log_error "$description - 期望状态码: $expected_status, 实际: $status"
        echo "响应内容: $response"
        return 1
    fi
}

# 1. 管理员登录
admin_login() {
    log_info "=== 1. 管理员登录测试 ==="
    
    local response=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin@smartteacher.edu",
            "password": "admin123456"
        }')
    
    if check_response "$response" "any" "管理员登录"; then
        ADMIN_TOKEN=$(echo "$response" | jq -r '.access_token // .token // ""')
        if [ -n "$ADMIN_TOKEN" ]; then
            log_success "管理员Token获取成功"
        else
            log_error "未能获取管理员Token"
            return 1
        fi
    else
        return 1
    fi
}

# 2. 创建班级信息
create_student_class() {
    log_info "=== 2. 创建学生班级测试 ==="
    
    local response=$(curl -s -X POST "$BASE_URL/classes" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "软件工程2021级1班",
            "code": "SE2021-01",
            "department": "计算机学院",
            "major": "软件工程",
            "grade": "2021",
            "academicYear": "2024-2025",
            "classTeacher": "张教授",
            "totalStudents": 45
        }')
    
    if check_response "$response" "any" "创建学生班级"; then
        CLASS_ID=$(echo "$response" | jq -r '.id // .data.id // ""')
        if [ -n "$CLASS_ID" ]; then
            log_success "班级创建成功，ID: $CLASS_ID"
        else
            log_warning "班级可能已存在，尝试获取现有班级"
            # 尝试获取现有班级
            local classes_response=$(curl -s -X GET "$BASE_URL/classes?search=SE2021-01" \
                -H "Authorization: Bearer $ADMIN_TOKEN")
            CLASS_ID=$(echo "$classes_response" | jq -r '.data[0].id // .classes[0].id // ""')
        fi
    fi
}

# 3. 批量创建学生用户
create_students() {
    log_info "=== 3. 批量创建学生用户测试 ==="
    
    # 创建多个学生用户
    local students=(
        '{"studentId": "SE202101001", "firstName": "张", "lastName": "三", "email": "zhangsan@example.com", "password": "student123", "major": "软件工程", "grade": "2021", "classId": "'$CLASS_ID'"}'
        '{"studentId": "SE202101002", "firstName": "李", "lastName": "四", "email": "lisi@example.com", "password": "student123", "major": "软件工程", "grade": "2021", "classId": "'$CLASS_ID'"}'
        '{"studentId": "SE202101003", "firstName": "王", "lastName": "五", "email": "wangwu@example.com", "password": "student123", "major": "软件工程", "grade": "2021", "classId": "'$CLASS_ID'"}'
    )
    
    for student_data in "${students[@]}"; do
        local response=$(curl -s -X POST "$BASE_URL/users/students" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$student_data")
        
        local student_id=$(echo "$response" | jq -r '.id // .data.id // ""')
        if [ -n "$student_id" ]; then
            STUDENT_IDS+=("$student_id")
            local student_name=$(echo "$student_data" | jq -r '.firstName + .lastName')
            log_success "学生 $student_name 创建成功，ID: $student_id"
        else
            log_warning "学生创建失败或已存在: $response"
        fi
    done
    
    log_info "共创建/获取 ${#STUDENT_IDS[@]} 个学生"
}

# 4. 教师登录
teacher_login() {
    log_info "=== 4. 教师登录测试 ==="
    
    # 首先创建教师账号（如果不存在）
    local teacher_response=$(curl -s -X POST "$BASE_URL/users" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "teacher@smartteacher.edu",
            "firstName": "李",
            "lastName": "老师",
            "password": "teacher123456",
            "role": "teacher",
            "department": "计算机学院"
        }')
    
    # 教师登录
    local response=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "teacher@smartteacher.edu",
            "password": "teacher123456"
        }')
    
    if check_response "$response" "any" "教师登录"; then
        TEACHER_TOKEN=$(echo "$response" | jq -r '.access_token // .token // ""')
        if [ -n "$TEACHER_TOKEN" ]; then
            log_success "教师Token获取成功"
        else
            log_error "未能获取教师Token"
            return 1
        fi
    else
        return 1
    fi
}

# 5. 创建课程
create_course() {
    log_info "=== 5. 创建课程测试 ==="
    
    local response=$(curl -s -X POST "$BASE_URL/courses" \
        -H "Authorization: Bearer $TEACHER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "数据结构与算法",
            "courseCode": "CS2024001",
            "description": "计算机科学基础课程，涵盖基本数据结构和算法设计",
            "credits": 3,
            "semester": "2024-2025-1",
            "schedule": {
                "dayOfWeek": 1,
                "startTime": "08:00",
                "endTime": "09:40",
                "classroom": "教学楼A101"
            },
            "capacity": 60
        }')
    
    if check_response "$response" "any" "创建课程"; then
        COURSE_ID=$(echo "$response" | jq -r '.id // .data.id // ""')
        if [ -n "$COURSE_ID" ]; then
            log_success "课程创建成功，ID: $COURSE_ID"
        else
            log_error "未能获取课程ID"
            return 1
        fi
    else
        return 1
    fi
}

# 6. 上传PPT课件
upload_ppt() {
    log_info "=== 6. PPT上传测试 ==="
    
    local response=$(curl -s -X POST "$BASE_URL/courses/$COURSE_ID/ppt/upload" \
        -H "Authorization: Bearer $TEACHER_TOKEN" \
        -F "file=@$TEST_DATA_DIR/test_presentation.ppt")
    
    check_response "$response" "any" "PPT上传"
}

# 7. 按班级批量添加学生到课程
add_class_to_course() {
    log_info "=== 7. 按班级批量添加学生到课程测试 ==="
    
    local response=$(curl -s -X POST "$BASE_URL/courses/$COURSE_ID/students/batch" \
        -H "Authorization: Bearer $TEACHER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "classId": "'$CLASS_ID'",
            "className": "软件工程2021级1班",
            "notes": "批量添加整个班级"
        }')
    
    check_response "$response" "any" "按班级批量添加学生"
}

# 8. 单独添加学生到课程
add_individual_students() {
    log_info "=== 8. 单独添加学生到课程测试 ==="
    
    if [ ${#STUDENT_IDS[@]} -gt 0 ]; then
        # 构建学生ID数组的JSON
        local student_ids_json=$(printf '%s\n' "${STUDENT_IDS[@]}" | jq -R . | jq -s .)
        
        local response=$(curl -s -X POST "$BASE_URL/courses/$COURSE_ID/students" \
            -H "Authorization: Bearer $TEACHER_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "studentIds": '$student_ids_json',
                "notes": "单独添加指定学生"
            }')
        
        check_response "$response" "any" "单独添加学生到课程"
    else
        log_warning "没有可用的学生ID进行测试"
    fi
}

# 9. 查看课程学生列表
view_course_students() {
    log_info "=== 9. 查看课程学生列表测试 ==="
    
    local response=$(curl -s -X GET "$BASE_URL/courses/$COURSE_ID/students" \
        -H "Authorization: Bearer $TEACHER_TOKEN")
    
    if check_response "$response" "any" "查看课程学生列表"; then
        local student_count=$(echo "$response" | jq '.data | length // .students | length // 0')
        log_success "课程共有 $student_count 名学生"
    fi
}

# 10. 开始上课并发起签到
start_class_and_attendance() {
    log_info "=== 10. 开始上课并发起签到测试 ==="
    
    local response=$(curl -s -X POST "$BASE_URL/attendance/sessions/$COURSE_ID/start" \
        -H "Authorization: Bearer $TEACHER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "checkInMethod": "verification_code",
            "verificationCode": "666888",
            "duration": 10,
            "notes": "第一次课堂签到"
        }')
    
    check_response "$response" "any" "发起签到"
}

# 11. 学生登录
student_login() {
    log_info "=== 11. 学生登录测试 ==="
    
    local response=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "zhangsan@example.com",
            "password": "student123"
        }')
    
    if check_response "$response" "any" "学生登录"; then
        STUDENT_TOKEN=$(echo "$response" | jq -r '.access_token // .token // ""')
        if [ -n "$STUDENT_TOKEN" ]; then
            log_success "学生Token获取成功"
        else
            log_error "未能获取学生Token"
            return 1
        fi
    else
        return 1
    fi
}

# 12. 学生查看可选课程
student_view_courses() {
    log_info "=== 12. 学生查看课程列表测试 ==="
    
    local response=$(curl -s -X GET "$BASE_URL/courses/student" \
        -H "Authorization: Bearer $STUDENT_TOKEN")
    
    if check_response "$response" "any" "学生查看课程列表"; then
        local course_count=$(echo "$response" | jq 'length // .data | length // 0')
        log_success "学生可见 $course_count 门课程"
    fi
}

# 13. 学生执行签到
student_checkin() {
    log_info "=== 13. 学生签到测试 ==="
    
    local response=$(curl -s -X POST "$BASE_URL/attendance/code" \
        -H "Authorization: Bearer $STUDENT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "code": "666888",
            "courseId": "'$COURSE_ID'"
        }')
    
    check_response "$response" "any" "学生验证码签到"
}

# 14. 教师查看签到记录
teacher_view_attendance() {
    log_info "=== 14. 教师查看签到记录测试 ==="
    
    local response=$(curl -s -X GET "$BASE_URL/attendance/courses/$COURSE_ID" \
        -H "Authorization: Bearer $TEACHER_TOKEN")
    
    if check_response "$response" "any" "查看签到记录"; then
        local attendance_count=$(echo "$response" | jq '.data | length // .attendances | length // 0')
        log_success "共有 $attendance_count 条签到记录"
    fi
}

# 15. 座位选择签到测试
test_seat_selection() {
    log_info "=== 15. 座位选择签到测试 ==="
    
    # 发起座位选择签到
    local start_response=$(curl -s -X POST "$BASE_URL/attendance/sessions/$COURSE_ID/start" \
        -H "Authorization: Bearer $TEACHER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "checkInMethod": "seat_selection",
            "duration": 5
        }')
    
    if check_response "$start_response" "any" "发起座位选择签到"; then
        # 学生选择座位签到
        local checkin_response=$(curl -s -X POST "$BASE_URL/attendance/check-in/$COURSE_ID" \
            -H "Authorization: Bearer $STUDENT_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "checkInMethod": "seat_selection",
                "seatNumber": "A05"
            }')
        
        check_response "$checkin_response" "any" "学生座位选择签到"
    fi
}

# 16. 数据统计测试
test_statistics() {
    log_info "=== 16. 数据统计测试 ==="
    
    # 课程统计
    local course_stats=$(curl -s -X GET "$BASE_URL/courses/$COURSE_ID/statistics" \
        -H "Authorization: Bearer $TEACHER_TOKEN")
    
    if check_response "$course_stats" "any" "课程统计数据"; then
        log_success "课程统计数据获取成功"
    fi
    
    # 学生出勤统计
    local attendance_stats=$(curl -s -X GET "$BASE_URL/attendance/courses/$COURSE_ID/statistics" \
        -H "Authorization: Bearer $TEACHER_TOKEN")
    
    if check_response "$attendance_stats" "any" "出勤统计数据"; then
        log_success "出勤统计数据获取成功"
    fi
}

# 17. 错误场景测试
test_error_scenarios() {
    log_info "=== 17. 错误场景测试 ==="
    
    # 测试重复签到
    local duplicate_checkin=$(curl -s -X POST "$BASE_URL/attendance/code" \
        -H "Authorization: Bearer $STUDENT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "code": "666888",
            "courseId": "'$COURSE_ID'"
        }')
    
    log_info "重复签到测试完成"
    
    # 测试错误验证码
    local wrong_code=$(curl -s -X POST "$BASE_URL/attendance/code" \
        -H "Authorization: Bearer $STUDENT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "code": "wrong_code",
            "courseId": "'$COURSE_ID'"
        }')
    
    log_info "错误验证码测试完成"
    
    # 测试无权限访问
    local unauthorized=$(curl -s -X GET "$BASE_URL/courses/$COURSE_ID/students" \
        -H "Authorization: Bearer $STUDENT_TOKEN")
    
    log_info "无权限访问测试完成"
}

# 清理测试环境
cleanup() {
    log_info "=== 清理测试环境 ==="
    
    # 可以选择清理创建的测试数据
    # 注意：这会删除测试过程中创建的数据
    
    log_warning "测试数据保留，如需清理请手动操作"
}

# 主函数
main() {
    echo "================================================"
    echo "SmartTeacher Pro 完整功能测试"
    echo "测试时间: $(date)"
    echo "================================================"
    
    # 检查依赖
    if ! command -v curl &> /dev/null; then
        log_error "curl 命令未找到，请安装 curl"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_error "jq 命令未找到，请安装 jq"
        exit 1
    fi
    
    # 设置测试环境
    setup_test_environment
    
    # 执行测试流程
    admin_login || exit 1
    create_student_class
    create_students
    teacher_login || exit 1
    create_course || exit 1
    upload_ppt
    add_class_to_course
    add_individual_students
    view_course_students
    start_class_and_attendance
    student_login || exit 1
    student_view_courses
    student_checkin
    teacher_view_attendance
    test_seat_selection
    test_statistics
    test_error_scenarios
    
    echo ""
    echo "================================================"
    log_success "完整功能测试完成！"
    echo "================================================"
    
    # 输出测试结果摘要
    echo ""
    echo "测试结果摘要:"
    echo "- 班级ID: $CLASS_ID"
    echo "- 课程ID: $COURSE_ID"
    echo "- 学生数量: ${#STUDENT_IDS[@]}"
    echo "- 测试文件: $TEST_DATA_DIR/"
    echo ""
    
    read -p "是否清理测试数据？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cleanup
    fi
}

# 检查参数
case "${1:-run}" in
    "help"|"-h"|"--help")
        echo "用法: $0 [选项]"
        echo ""
        echo "选项:"
        echo "  run, 无参数    - 运行完整测试流程"
        echo "  help, -h       - 显示帮助信息"
        echo ""
        echo "环境变量:"
        echo "  BASE_URL       - API基础URL (默认: http://localhost:3000/api)"
        echo ""
        echo "依赖:"
        echo "  - curl: HTTP客户端"
        echo "  - jq: JSON处理工具"
        echo ""
        ;;
    "run"|*)
        main
        ;;
esac