-- ================================================
-- Migration: 006_optimize_indexes.sql
-- Description: 创建索引优化迁移脚本，提升查询性能
-- Author: SmartTeacher Pro System
-- Date: 2025-09-09
-- ================================================

-- 为现有表创建性能优化索引
-- 基于PRP文档中的高并发场景需求，优化数据库查询性能

-- =============================================
-- 现有表索引优化（基于已有表结构）
-- =============================================

-- 优化enrollments表索引（课程学生选课记录）
CREATE INDEX IF NOT EXISTS idx_enrollments_course_status ON enrollments(course_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_status ON enrollments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_student ON enrollments(course_id, student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_enrolled_at ON enrollments(enrolled_at);
CREATE INDEX IF NOT EXISTS idx_enrollments_final_grade ON enrollments(final_grade) WHERE final_grade IS NOT NULL;

-- 优化attendances表索引（签到记录）
CREATE INDEX IF NOT EXISTS idx_attendances_course_date ON attendances(course_id, session_date);
CREATE INDEX IF NOT EXISTS idx_attendances_student_date ON attendances(student_id, session_date);
CREATE INDEX IF NOT EXISTS idx_attendances_status_time ON attendances(status, check_in_time);
CREATE INDEX IF NOT EXISTS idx_attendances_seat_number ON attendances(seat_number) WHERE seat_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendances_session_student ON attendances(attendance_session_id, student_id);

-- 优化courses表索引（课程信息）
CREATE INDEX IF NOT EXISTS idx_courses_teacher_semester ON courses(teacher_id, semester);
CREATE INDEX IF NOT EXISTS idx_courses_code_semester ON courses(course_code, semester);
CREATE INDEX IF NOT EXISTS idx_courses_department_semester ON courses(department, semester);
CREATE INDEX IF NOT EXISTS idx_courses_start_date ON courses(start_date);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status) WHERE status IS NOT NULL;

-- 优化assignments表索引（作业管理）
CREATE INDEX IF NOT EXISTS idx_assignments_course_due ON assignments(course_id, due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by, created_at);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assignments_assignment_type ON assignments(assignment_type);

-- 优化assignment_submissions表索引（作业提交）
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_student ON assignment_submissions(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON assignment_submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_submissions_grade ON assignment_submissions(grade) WHERE grade IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_submissions_status ON assignment_submissions(status);

-- 优化classrooms表索引（教室管理）
CREATE INDEX IF NOT EXISTS idx_classrooms_building_floor ON classrooms(building, floor);
CREATE INDEX IF NOT EXISTS idx_classrooms_capacity ON classrooms(capacity);
CREATE INDEX IF NOT EXISTS idx_classrooms_layout_type ON classrooms(layout_type);

-- 优化classroom_bookings表索引（教室预订）
CREATE INDEX IF NOT EXISTS idx_bookings_classroom_date ON classroom_bookings(classroom_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_time_slot ON classroom_bookings(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_teacher_date ON classroom_bookings(teacher_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON classroom_bookings(status);

-- 优化attendance_sessions表索引（签到会话）
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_course_date ON attendance_sessions(course_id, session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_teacher ON attendance_sessions(teacher_id, created_at);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_status ON attendance_sessions(status);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_classroom ON attendance_sessions(classroom_id) WHERE classroom_id IS NOT NULL;

-- 优化seat_maps表索引（座位图）
CREATE INDEX IF NOT EXISTS idx_seat_maps_classroom_seat ON seat_maps(classroom_id, seat_number);
CREATE INDEX IF NOT EXISTS idx_seat_maps_student_session ON seat_maps(student_id, attendance_session_id);
CREATE INDEX IF NOT EXISTS idx_seat_maps_status ON seat_maps(status);

-- 优化file_uploads表索引（文件上传）
CREATE INDEX IF NOT EXISTS idx_file_uploads_uploader_date ON file_uploads(uploaded_by, upload_date);
CREATE INDEX IF NOT EXISTS idx_file_uploads_file_type ON file_uploads(file_type);
CREATE INDEX IF NOT EXISTS idx_file_uploads_file_size ON file_uploads(file_size);

-- =============================================
-- 复合索引优化（针对常用查询场景）
-- =============================================

-- 学生课程出勤率查询优化
CREATE INDEX IF NOT EXISTS idx_student_course_attendance 
  ON attendances(student_id, course_id, session_date, status);

-- 教师课程管理查询优化
CREATE INDEX IF NOT EXISTS idx_teacher_course_management 
  ON courses(teacher_id, semester, status, start_date);

-- 座位选择签到查询优化
CREATE INDEX IF NOT EXISTS idx_seat_selection_attendance 
  ON seat_maps(classroom_id, attendance_session_id, status, seat_number);

-- 作业提交统计查询优化
CREATE INDEX IF NOT EXISTS idx_assignment_submission_stats 
  ON assignment_submissions(assignment_id, status, submitted_at, grade);

-- 课程学生学习数据查询优化
CREATE INDEX IF NOT EXISTS idx_student_learning_data 
  ON enrollments(student_id, course_id, status, final_grade, attendance_rate);

-- =============================================
-- 全文搜索索引（GIN索引）
-- =============================================

-- 课程内容全文搜索
CREATE INDEX IF NOT EXISTS idx_courses_fulltext 
  ON courses USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- 作业内容全文搜索
CREATE INDEX IF NOT EXISTS idx_assignments_fulltext 
  ON assignments USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- 用户信息全文搜索
CREATE INDEX IF NOT EXISTS idx_users_fulltext 
  ON users USING GIN(to_tsvector('english', 
    first_name || ' ' || last_name || ' ' || 
    COALESCE(student_id, '') || ' ' || COALESCE(email, '')));

-- =============================================
-- 分区表索引（针对大数据量表）
-- =============================================

-- 按月分区的出勤记录索引
CREATE INDEX IF NOT EXISTS idx_attendances_monthly_partition
  ON attendances(DATE_TRUNC('month', session_date), course_id, student_id);

-- 按学期分区的作业提交索引
CREATE INDEX IF NOT EXISTS idx_submissions_semester_partition
  ON assignment_submissions(DATE_TRUNC('quarter', submitted_at), assignment_id, student_id);

-- =============================================
-- 条件索引（部分索引）
-- =============================================

-- 只为活跃课程创建索引
CREATE INDEX IF NOT EXISTS idx_active_courses_teacher 
  ON courses(teacher_id, start_date) 
  WHERE status = 'active' OR status IS NULL;

-- 只为已提交的作业创建索引
CREATE INDEX IF NOT EXISTS idx_submitted_assignments 
  ON assignment_submissions(assignment_id, submitted_at, grade) 
  WHERE status = 'submitted';

-- 只为成功签到创建索引
CREATE INDEX IF NOT EXISTS idx_successful_attendances 
  ON attendances(course_id, session_date, student_id) 
  WHERE status = 'present';

-- 只为学生用户创建班级索引
CREATE INDEX IF NOT EXISTS idx_student_class_info 
  ON users(class_id, major, grade, status) 
  WHERE role = 'student';

-- =============================================
-- 并发优化索引
-- =============================================

-- 座位并发选择优化（避免死锁）
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_seat_session 
  ON seat_maps(classroom_id, attendance_session_id, seat_number, student_id)
  WHERE status = 'occupied';

-- 教室预订冲突检测优化
CREATE INDEX IF NOT EXISTS idx_booking_time_conflict 
  ON classroom_bookings(classroom_id, booking_date, start_time, end_time)
  WHERE status = 'confirmed';

-- =============================================
-- 性能监控索引
-- =============================================

-- 慢查询监控索引
CREATE INDEX IF NOT EXISTS idx_operation_logs_performance 
  ON operation_logs(execution_time_ms, created_at) 
  WHERE execution_time_ms > 1000; -- 超过1秒的操作

-- 错误操作监控索引
CREATE INDEX IF NOT EXISTS idx_operation_logs_errors 
  ON operation_logs(success, operation_type, created_at) 
  WHERE success = false;

-- 高频操作监控索引
CREATE INDEX IF NOT EXISTS idx_high_frequency_operations 
  ON operation_logs(operator_id, operation_type, created_at) 
  WHERE created_at >= NOW() - INTERVAL '1 hour';

-- =============================================
-- 数据统计索引
-- =============================================

-- 学生出勤率统计索引
CREATE INDEX IF NOT EXISTS idx_attendance_rate_stats 
  ON attendances(student_id, DATE_TRUNC('month', session_date), status);

-- 课程容量利用率统计索引
CREATE INDEX IF NOT EXISTS idx_course_capacity_stats 
  ON enrollments(course_id, status, enrolled_at);

-- 教室使用率统计索引
CREATE INDEX IF NOT EXISTS idx_classroom_usage_stats 
  ON classroom_bookings(classroom_id, DATE_TRUNC('week', booking_date), status);

-- =============================================
-- 清理和维护
-- =============================================

-- 自动清理过期数据的索引
CREATE INDEX IF NOT EXISTS idx_expired_sessions 
  ON attendance_sessions(created_at) 
  WHERE status = 'ended' AND created_at < NOW() - INTERVAL '1 year';

-- 临时文件清理索引
CREATE INDEX IF NOT EXISTS idx_temp_files_cleanup 
  ON file_uploads(upload_date, file_path) 
  WHERE file_path LIKE '%/temp/%';

-- =============================================
-- 索引维护存储过程
-- =============================================

-- 创建索引维护存储过程
CREATE OR REPLACE FUNCTION maintain_database_indexes()
RETURNS TEXT AS $$
DECLARE
  v_result TEXT := '';
  v_start_time TIMESTAMP := NOW();
BEGIN
  -- 重建索引统计信息
  ANALYZE;
  
  -- 检查索引使用情况
  CREATE TEMP TABLE IF NOT EXISTS index_usage_temp AS
  SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
  FROM pg_stat_user_indexes
  WHERE idx_tup_read = 0 AND idx_tup_fetch = 0;
  
  -- 返回维护结果
  SELECT INTO v_result
    'Database index maintenance completed in ' || 
    EXTRACT(EPOCH FROM (NOW() - v_start_time))::TEXT || ' seconds. ' ||
    'Found ' || COUNT(*)::TEXT || ' unused indexes.'
  FROM index_usage_temp;
  
  DROP TABLE IF EXISTS index_usage_temp;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 创建索引监控视图
CREATE OR REPLACE VIEW v_index_usage_stats AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  CASE 
    WHEN idx_tup_read = 0 AND idx_tup_fetch = 0 THEN 'Unused'
    WHEN idx_tup_read < 100 THEN 'Low Usage'
    WHEN idx_tup_read < 1000 THEN 'Medium Usage'
    ELSE 'High Usage'
  END as usage_level
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;

-- 添加注释
COMMENT ON FUNCTION maintain_database_indexes IS '数据库索引维护存储过程，重建统计信息并检查未使用的索引';
COMMENT ON VIEW v_index_usage_stats IS '索引使用情况统计视图，用于监控索引效果';

-- 记录索引优化完成日志
INSERT INTO operation_logs (
  id, operation_type, module, target_type, target_id,
  operator_id, operator_role, details, success, notes, created_at
) VALUES (
  'log_index_optimization_' || to_char(NOW(), 'YYYYMMDD_HH24MISS'),
  'optimize_indexes',
  'system_management',
  'database',
  'smartteacher_db',
  'system',
  'system',
  '{"total_indexes_created": "50+", "optimization_areas": ["enrollments", "attendances", "courses", "assignments", "classrooms"], "special_indexes": ["fulltext", "partial", "concurrent"]}',
  true,
  '数据库索引优化完成，提升查询性能',
  NOW()
);

-- 验证索引创建成功
DO $$
DECLARE
  v_index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes 
    WHERE tablename IN (
      'enrollments', 'attendances', 'courses', 'assignments', 
      'assignment_submissions', 'classrooms', 'classroom_bookings'
    );
    
    IF v_index_count > 20 THEN
        RAISE NOTICE '✅ 数据库索引优化完成，共创建 % 个索引', v_index_count;
    ELSE
        RAISE WARNING '⚠️ 索引创建可能不完整，请检查数据库连接和权限';
    END IF;
END $$;