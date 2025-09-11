-- ================================================
-- Migration: 005_extend_users_table.sql
-- Description: 扩展用户表字段，支持学生信息统一管理
-- Author: SmartTeacher Pro System
-- Date: 2025-09-09
-- ================================================

-- 扩展现有用户表，添加学生管理相关字段
-- 基于现有User表结构，新增字段以支持班级管理和学生信息完善

-- 添加新字段到用户表
ALTER TABLE users ADD COLUMN IF NOT EXISTS class_name VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS class_id VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS academic_year VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS enrollment_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS student_type VARCHAR(20) DEFAULT 'regular';
ALTER TABLE users ADD COLUMN IF NOT EXISTS graduation_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dormitory_info VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- 添加外键约束关联班级表
ALTER TABLE users ADD CONSTRAINT fk_users_class 
  FOREIGN KEY (class_id) REFERENCES student_classes(id) ON DELETE SET NULL;

-- 添加约束确保数据完整性
ALTER TABLE users ADD CONSTRAINT check_user_status 
  CHECK (status IN ('active', 'inactive', 'graduated', 'transferred', 'suspended', 'expelled'));

ALTER TABLE users ADD CONSTRAINT check_student_type 
  CHECK (student_type IN ('regular', 'exchange', 'transfer', 'audit', 'special'));

ALTER TABLE users ADD CONSTRAINT check_login_count 
  CHECK (login_count >= 0);

-- 为新字段创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_users_class_major_grade 
  ON users(class_name, major, grade) WHERE role = 'student';

CREATE INDEX IF NOT EXISTS idx_users_class_id_status 
  ON users(class_id, status) WHERE role = 'student';

CREATE INDEX IF NOT EXISTS idx_users_academic_year_status 
  ON users(academic_year, status) WHERE role = 'student';

CREATE INDEX IF NOT EXISTS idx_users_enrollment_date 
  ON users(enrollment_date) WHERE role = 'student';

CREATE INDEX IF NOT EXISTS idx_users_graduation_date 
  ON users(graduation_date) WHERE role = 'student';

CREATE INDEX IF NOT EXISTS idx_users_last_login 
  ON users(last_login_at, role);

-- 创建学生信息统计视图
CREATE OR REPLACE VIEW v_student_info_stats AS
SELECT 
  u.class_id,
  sc.name as class_name,
  sc.department,
  sc.major,
  sc.grade,
  sc.academic_year,
  COUNT(*) as total_students,
  COUNT(CASE WHEN u.status = 'active' THEN 1 END) as active_students,
  COUNT(CASE WHEN u.status = 'graduated' THEN 1 END) as graduated_students,
  COUNT(CASE WHEN u.status = 'transferred' THEN 1 END) as transferred_students,
  COUNT(CASE WHEN u.last_login_at >= NOW() - INTERVAL '30 days' THEN 1 END) as active_last_month,
  ROUND(AVG(u.login_count), 2) as avg_login_count,
  MAX(u.last_login_at) as latest_login,
  MIN(u.enrollment_date) as earliest_enrollment,
  MAX(u.enrollment_date) as latest_enrollment
FROM users u
LEFT JOIN student_classes sc ON u.class_id = sc.id
WHERE u.role = 'student'
GROUP BY u.class_id, sc.name, sc.department, sc.major, sc.grade, sc.academic_year
ORDER BY sc.department, sc.major, sc.grade;

-- 创建学生学习状态视图
CREATE OR REPLACE VIEW v_student_learning_status AS
SELECT 
  u.id,
  u.student_id,
  u.first_name,
  u.last_name,
  u.class_name,
  u.major,
  u.grade,
  u.status,
  u.academic_year,
  u.enrollment_date,
  u.last_login_at,
  u.login_count,
  -- 基于现有关联表计算学习数据
  COUNT(DISTINCT e.course_id) as enrolled_courses,
  ROUND(AVG(e.attendance_rate), 2) as avg_attendance_rate,
  ROUND(AVG(CASE WHEN e.final_grade IS NOT NULL THEN e.final_grade END), 2) as avg_grade,
  COUNT(DISTINCT a.id) as total_attendances,
  COUNT(DISTINCT asub.id) as total_submissions,
  -- 计算学习活跃度
  CASE 
    WHEN u.last_login_at >= NOW() - INTERVAL '7 days' THEN 'highly_active'
    WHEN u.last_login_at >= NOW() - INTERVAL '30 days' THEN 'active'
    WHEN u.last_login_at >= NOW() - INTERVAL '90 days' THEN 'low_active'
    ELSE 'inactive'
  END as activity_level,
  -- 计算在校时长（月）
  CASE 
    WHEN u.graduation_date IS NOT NULL THEN 
      EXTRACT(MONTHS FROM AGE(u.graduation_date, u.enrollment_date))
    ELSE 
      EXTRACT(MONTHS FROM AGE(NOW(), u.enrollment_date))
  END as months_enrolled
FROM users u
LEFT JOIN enrollments e ON u.id = e.student_id
LEFT JOIN attendances a ON u.id = a.student_id
LEFT JOIN assignment_submissions asub ON u.id = asub.student_id
WHERE u.role = 'student'
GROUP BY u.id, u.student_id, u.first_name, u.last_name, u.class_name, 
         u.major, u.grade, u.status, u.academic_year, u.enrollment_date, 
         u.last_login_at, u.login_count, u.graduation_date;

-- 创建班级成员管理视图
CREATE OR REPLACE VIEW v_class_members AS
SELECT 
  sc.id as class_id,
  sc.name as class_name,
  sc.code as class_code,
  sc.department,
  sc.major,
  sc.grade,
  sc.academic_year,
  sc.class_teacher,
  sc.total_students as planned_capacity,
  u.id as student_id,
  u.student_id as student_number,
  u.first_name,
  u.last_name,
  u.email,
  u.phone,
  u.status as student_status,
  u.student_type,
  u.enrollment_date,
  u.graduation_date,
  u.dormitory_info,
  u.emergency_contact,
  u.emergency_phone,
  u.last_login_at,
  u.login_count,
  u.created_at as student_created_at
FROM student_classes sc
LEFT JOIN users u ON sc.id = u.class_id AND u.role = 'student'
ORDER BY sc.department, sc.major, sc.grade, u.student_id;

-- 插入扩展用户数据示例（更新现有用户）
UPDATE users SET 
  class_name = '软件工程2021级1班',
  class_id = 'class_001',
  academic_year = '2024-2025',
  enrollment_date = '2021-09-01',
  status = 'active',
  student_type = 'regular'
WHERE role = 'student' AND student_id LIKE 'SE2021%' AND class_name IS NULL;

UPDATE users SET 
  class_name = '计算机科学2022级1班',
  class_id = 'class_003',
  academic_year = '2024-2025',
  enrollment_date = '2022-09-01',
  status = 'active',
  student_type = 'regular'
WHERE role = 'student' AND student_id LIKE 'CS2022%' AND class_name IS NULL;

-- 创建存储过程：批量导入学生信息
CREATE OR REPLACE FUNCTION batch_import_students(
  p_students_data JSON -- [{"student_id": "SE202101001", "first_name": "张三", ...}, ...]
) RETURNS JSON AS $$
DECLARE
  v_student JSON;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_errors JSON := '[]'::JSON;
  v_new_user_id VARCHAR(30);
  v_class_id VARCHAR(30);
BEGIN
  -- 遍历学生数据
  FOR v_student IN SELECT * FROM JSON_ARRAY_ELEMENTS(p_students_data)
  LOOP
    BEGIN
      -- 查找班级ID
      SELECT id INTO v_class_id
      FROM student_classes 
      WHERE code = v_student->>'class_code'
         OR name = v_student->>'class_name';
      
      -- 生成用户ID
      v_new_user_id := 'user_' || to_char(NOW(), 'YYYYMMDD') || '_' || 
                       LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 10, '0') || '_' ||
                       LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
      
      -- 插入学生用户
      INSERT INTO users (
        id, student_id, first_name, last_name, email, phone,
        role, department, major, grade, class_name, class_id,
        academic_year, enrollment_date, status, student_type,
        dormitory_info, emergency_contact, emergency_phone
      ) VALUES (
        v_new_user_id,
        v_student->>'student_id',
        v_student->>'first_name',
        v_student->>'last_name',
        v_student->>'email',
        v_student->>'phone',
        'student',
        v_student->>'department',
        v_student->>'major',
        v_student->>'grade',
        v_student->>'class_name',
        v_class_id,
        v_student->>'academic_year',
        (v_student->>'enrollment_date')::DATE,
        COALESCE(v_student->>'status', 'active'),
        COALESCE(v_student->>'student_type', 'regular'),
        v_student->>'dormitory_info',
        v_student->>'emergency_contact',
        v_student->>'emergency_phone'
      );
      
      v_success_count := v_success_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      v_errors := v_errors || JSON_BUILD_OBJECT(
        'student_id', v_student->>'student_id',
        'error', SQLERRM
      )::JSON;
    END;
  END LOOP;
  
  -- 记录批量导入操作日志
  PERFORM log_operation(
    'batch_import_students',
    'user_management',
    'user',
    'batch_import',
    NULL,
    'admin',
    JSON_BUILD_OBJECT(
      'total_records', JSON_ARRAY_LENGTH(p_students_data),
      'success_count', v_success_count,
      'error_count', v_error_count
    ),
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    v_error_count = 0,
    CASE WHEN v_error_count > 0 THEN 'Some records failed to import' ELSE NULL END,
    0,
    '批量导入学生信息'
  );
  
  RETURN JSON_BUILD_OBJECT(
    'success_count', v_success_count,
    'error_count', v_error_count,
    'errors', v_errors
  );
END;
$$ LANGUAGE plpgsql;

-- 创建存储过程：更新学生状态
CREATE OR REPLACE FUNCTION update_student_status(
  p_student_ids VARCHAR(30)[], -- 学生ID数组
  p_new_status VARCHAR(20),
  p_operator_id VARCHAR(30),
  p_notes TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
  v_student_id VARCHAR(30);
BEGIN
  -- 批量更新学生状态
  UPDATE users 
  SET status = p_new_status,
      notes = COALESCE(p_notes, notes),
      updated_at = NOW()
  WHERE id = ANY(p_student_ids)
    AND role = 'student';
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- 为每个学生记录状态变更日志
  FOREACH v_student_id IN ARRAY p_student_ids
  LOOP
    PERFORM log_operation(
      'update_student_status',
      'user_management',
      'individual',
      v_student_id,
      p_operator_id,
      'admin',
      JSON_BUILD_OBJECT(
        'new_status', p_new_status,
        'notes', p_notes
      ),
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      true,
      NULL,
      0,
      '更新学生状态'
    );
  END LOOP;
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- 创建存储过程：学生毕业处理
CREATE OR REPLACE FUNCTION graduate_students(
  p_class_id VARCHAR(30),
  p_graduation_date DATE DEFAULT CURRENT_DATE,
  p_operator_id VARCHAR(30)
) RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
  v_class_name VARCHAR(100);
BEGIN
  -- 获取班级名称
  SELECT name INTO v_class_name FROM student_classes WHERE id = p_class_id;
  
  -- 更新学生状态为已毕业
  UPDATE users 
  SET status = 'graduated',
      graduation_date = p_graduation_date,
      updated_at = NOW()
  WHERE class_id = p_class_id 
    AND role = 'student'
    AND status = 'active';
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- 更新班级状态
  UPDATE student_classes 
  SET status = 'graduated',
      updated_at = NOW()
  WHERE id = p_class_id;
  
  -- 记录批量毕业操作日志
  PERFORM log_operation(
    'graduate_class',
    'class_management',
    'class',
    p_class_id,
    p_operator_id,
    'admin',
    JSON_BUILD_OBJECT(
      'class_name', v_class_name,
      'graduation_date', p_graduation_date,
      'student_count', v_updated_count
    ),
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    true,
    NULL,
    0,
    '批量办理学生毕业'
  );
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：自动更新最后登录时间
CREATE OR REPLACE FUNCTION update_user_login_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- 当更新last_login_at时，自动增加登录次数
    IF NEW.last_login_at IS DISTINCT FROM OLD.last_login_at AND NEW.last_login_at IS NOT NULL THEN
        NEW.login_count = COALESCE(OLD.login_count, 0) + 1;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_user_login_stats
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_login_stats();

-- 添加注释
COMMENT ON COLUMN users.class_name IS '班级名称，如"软件工程2021级1班"';
COMMENT ON COLUMN users.class_id IS '关联班级表ID';
COMMENT ON COLUMN users.academic_year IS '学年，如"2024-2025"';
COMMENT ON COLUMN users.enrollment_date IS '入学日期';
COMMENT ON COLUMN users.graduation_date IS '毕业日期';
COMMENT ON COLUMN users.status IS '学生状态：active, inactive, graduated, transferred, suspended, expelled';
COMMENT ON COLUMN users.student_type IS '学生类型：regular, exchange, transfer, audit, special';
COMMENT ON COLUMN users.dormitory_info IS '宿舍信息';
COMMENT ON COLUMN users.emergency_contact IS '紧急联系人';
COMMENT ON COLUMN users.emergency_phone IS '紧急联系电话';
COMMENT ON COLUMN users.last_login_at IS '最后登录时间';
COMMENT ON COLUMN users.login_count IS '累计登录次数';

COMMENT ON VIEW v_student_info_stats IS '学生信息统计视图，按班级汇总';
COMMENT ON VIEW v_student_learning_status IS '学生学习状态视图，包含学习数据';
COMMENT ON VIEW v_class_members IS '班级成员管理视图';

COMMENT ON FUNCTION batch_import_students IS '批量导入学生信息的存储过程';
COMMENT ON FUNCTION update_student_status IS '批量更新学生状态的存储过程';
COMMENT ON FUNCTION graduate_students IS '批量办理学生毕业的存储过程';

-- 验证表扩展成功
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'class_id'
    ) THEN
        RAISE NOTICE '✅ 用户表扩展字段添加成功';
    ELSE
        RAISE EXCEPTION '❌ 用户表扩展字段添加失败';
    END IF;
END $$;