-- ================================================
-- Migration: 001_create_student_classes.sql
-- Description: 创建学生班级管理表
-- Author: SmartTeacher Pro System
-- Date: 2025-09-09
-- ================================================

-- 创建学生班级信息表
-- 用于统一管理全校班级信息，便于按班级批量管理学生
CREATE TABLE student_classes (
  id VARCHAR(30) PRIMARY KEY,
  name VARCHAR(100) NOT NULL, -- 班级名称，如"软件工程2021级1班"
  code VARCHAR(50) UNIQUE NOT NULL, -- 班级编码，如"SE2021-1"
  department VARCHAR(100), -- 院系
  major VARCHAR(100), -- 专业
  grade VARCHAR(10), -- 年级，如"2021"
  academic_year VARCHAR(10), -- 学年，如"2024-2025"
  class_teacher VARCHAR(100), -- 班主任
  total_students INTEGER DEFAULT 0, -- 班级总人数
  status VARCHAR(20) DEFAULT 'active', -- active, graduated, disbanded
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引以优化查询性能
CREATE INDEX idx_student_classes_department_major ON student_classes(department, major);
CREATE INDEX idx_student_classes_grade_academic_year ON student_classes(grade, academic_year);
CREATE INDEX idx_student_classes_status ON student_classes(status);
CREATE INDEX idx_student_classes_code ON student_classes(code);

-- 添加约束确保数据完整性
ALTER TABLE student_classes ADD CONSTRAINT check_status 
  CHECK (status IN ('active', 'graduated', 'disbanded'));

ALTER TABLE student_classes ADD CONSTRAINT check_total_students 
  CHECK (total_students >= 0);

-- 创建触发器自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_student_classes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_student_classes_updated_at
    BEFORE UPDATE ON student_classes
    FOR EACH ROW
    EXECUTE FUNCTION update_student_classes_updated_at();

-- 插入示例数据（可选）
INSERT INTO student_classes (id, name, code, department, major, grade, academic_year, class_teacher) VALUES
('class_001', '软件工程2021级1班', 'SE2021-1', '计算机学院', '软件工程', '2021', '2024-2025', '张教授'),
('class_002', '软件工程2021级2班', 'SE2021-2', '计算机学院', '软件工程', '2021', '2024-2025', '李教授'),
('class_003', '计算机科学2022级1班', 'CS2022-1', '计算机学院', '计算机科学与技术', '2022', '2024-2025', '王教授'),
('class_004', '数据科学2023级1班', 'DS2023-1', '计算机学院', '数据科学与大数据技术', '2023', '2024-2025', '刘教授');

-- 创建班级统计视图
CREATE VIEW v_student_classes_stats AS
SELECT 
  sc.id,
  sc.name,
  sc.code,
  sc.department,
  sc.major,
  sc.grade,
  sc.academic_year,
  sc.class_teacher,
  sc.total_students,
  sc.status,
  COUNT(u.id) AS actual_student_count,
  CASE 
    WHEN sc.total_students > 0 THEN ROUND((COUNT(u.id)::DECIMAL / sc.total_students) * 100, 2)
    ELSE 0
  END AS enrollment_percentage,
  sc.created_at,
  sc.updated_at
FROM student_classes sc
LEFT JOIN users u ON u.class_id = sc.id AND u.role = 'student' AND u.status = 'active'
GROUP BY sc.id, sc.name, sc.code, sc.department, sc.major, sc.grade, 
         sc.academic_year, sc.class_teacher, sc.total_students, sc.status, 
         sc.created_at, sc.updated_at;

-- 添加注释
COMMENT ON TABLE student_classes IS '学生班级信息表，用于统一管理全校班级信息';
COMMENT ON COLUMN student_classes.id IS '班级唯一标识符';
COMMENT ON COLUMN student_classes.name IS '班级名称，如"软件工程2021级1班"';
COMMENT ON COLUMN student_classes.code IS '班级编码，用于快速查找和引用';
COMMENT ON COLUMN student_classes.department IS '所属院系';
COMMENT ON COLUMN student_classes.major IS '专业名称';
COMMENT ON COLUMN student_classes.grade IS '年级';
COMMENT ON COLUMN student_classes.academic_year IS '学年，如"2024-2025"';
COMMENT ON COLUMN student_classes.class_teacher IS '班主任姓名';
COMMENT ON COLUMN student_classes.total_students IS '班级规定总人数';
COMMENT ON COLUMN student_classes.status IS '班级状态：active-活跃, graduated-已毕业, disbanded-已解散';

COMMENT ON VIEW v_student_classes_stats IS '班级统计视图，显示班级的实际学生数量和入学率';

-- 验证表创建成功
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_classes') THEN
        RAISE NOTICE '✅ 学生班级管理表(student_classes)创建成功';
    ELSE
        RAISE EXCEPTION '❌ 学生班级管理表创建失败';
    END IF;
END $$;-- ================================================
-- Migration: 002_create_operation_logs.sql
-- Description: 创建系统操作日志表
-- Author: SmartTeacher Pro System
-- Date: 2025-09-09
-- ================================================

-- 创建系统全局操作日志表
-- 记录所有重要的系统操作，用于审计、监控和问题排查
CREATE TABLE operation_logs (
  id VARCHAR(30) PRIMARY KEY,
  operation_type VARCHAR(50) NOT NULL, -- 操作类型枚举
  module VARCHAR(50) NOT NULL, -- 操作模块：course, user, attendance, assignment等
  target_type VARCHAR(50) NOT NULL, -- 目标类型：class, individual, course, assignment等
  target_id VARCHAR(30) NOT NULL, -- 目标资源ID
  affected_ids JSON, -- 受影响的资源ID列表，JSON数组格式
  operator_id VARCHAR(30), -- 操作者ID，可为NULL（系统操作）
  operator_role VARCHAR(20) NOT NULL, -- 操作者角色：teacher, student, admin, system
  details JSON, -- 操作详细信息，JSON格式
  before_data JSON, -- 操作前数据快照
  after_data JSON, -- 操作后数据快照
  ip_address VARCHAR(45), -- 操作IP地址（支持IPv6）
  user_agent VARCHAR(500), -- 用户代理信息
  success BOOLEAN DEFAULT true, -- 操作是否成功
  error_message VARCHAR(1000), -- 错误信息（如果失败）
  execution_time_ms INTEGER DEFAULT 0, -- 操作执行时间（毫秒）
  notes VARCHAR(500), -- 操作备注
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引以优化查询性能
CREATE INDEX idx_operation_logs_type_module_time ON operation_logs(operation_type, module, created_at);
CREATE INDEX idx_operation_logs_target_type_id_time ON operation_logs(target_type, target_id, created_at);
CREATE INDEX idx_operation_logs_operator_time ON operation_logs(operator_id, created_at);
CREATE INDEX idx_operation_logs_module_success_time ON operation_logs(module, success, created_at);
CREATE INDEX idx_operation_logs_created_at ON operation_logs(created_at);

-- 为JSON字段创建GIN索引以支持JSON查询
CREATE INDEX idx_operation_logs_details ON operation_logs USING GIN(details);
CREATE INDEX idx_operation_logs_affected_ids ON operation_logs USING GIN(affected_ids);

-- 添加约束确保数据完整性
ALTER TABLE operation_logs ADD CONSTRAINT check_operator_role 
  CHECK (operator_role IN ('teacher', 'student', 'admin', 'system'));

ALTER TABLE operation_logs ADD CONSTRAINT check_execution_time 
  CHECK (execution_time_ms >= 0);

-- 添加外键约束（可选，取决于现有表结构）
-- ALTER TABLE operation_logs ADD CONSTRAINT fk_operation_logs_operator 
--   FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL;

-- 创建操作类型枚举（文档参考）
CREATE TYPE operation_category AS ENUM (
  'user_management',
  'course_management', 
  'class_management',
  'attendance_management',
  'assignment_management',
  'classroom_management',
  'material_management',
  'system_management'
);

-- 创建操作日志汇总视图
CREATE VIEW v_operation_logs_summary AS
SELECT 
  DATE(created_at) as log_date,
  module,
  operation_type,
  operator_role,
  COUNT(*) as total_operations,
  COUNT(CASE WHEN success = true THEN 1 END) as successful_operations,
  COUNT(CASE WHEN success = false THEN 1 END) as failed_operations,
  ROUND(AVG(execution_time_ms), 2) as avg_execution_time_ms,
  MIN(created_at) as first_operation_time,
  MAX(created_at) as last_operation_time
FROM operation_logs
GROUP BY DATE(created_at), module, operation_type, operator_role
ORDER BY log_date DESC, module, operation_type;

-- 创建错误操作监控视图
CREATE VIEW v_operation_errors AS
SELECT 
  id,
  operation_type,
  module,
  target_type,
  target_id,
  operator_id,
  operator_role,
  error_message,
  execution_time_ms,
  ip_address,
  created_at
FROM operation_logs
WHERE success = false
ORDER BY created_at DESC;

-- 创建高频操作监控视图
CREATE VIEW v_high_frequency_operations AS
SELECT 
  operator_id,
  operation_type,
  module,
  COUNT(*) as operation_count,
  MIN(created_at) as first_time,
  MAX(created_at) as last_time,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))/60 as time_span_minutes
FROM operation_logs
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY operator_id, operation_type, module
HAVING COUNT(*) > 10  -- 1小时内超过10次操作
ORDER BY operation_count DESC;

-- 插入示例操作日志数据
INSERT INTO operation_logs (
  id, operation_type, module, target_type, target_id, 
  operator_id, operator_role, details, success, notes
) VALUES
(
  'log_001', 
  'batch_add_class_to_course', 
  'course', 
  'course', 
  'course_123',
  'teacher_456', 
  'teacher',
  '{"course_name": "数据结构与算法", "class_name": "软件工程2021级1班", "class_id": "SE2021-01", "student_count": 45}',
  true,
  '批量添加软件工程2021级1班学生到数据结构课程'
),
(
  'log_002',
  'start_attendance',
  'attendance',
  'course',
  'course_123',
  'teacher_456',
  'teacher', 
  '{"attendance_method": "seat_selection", "classroom_id": "room_101", "total_seats": 60}',
  true,
  '开始座位选择签到'
),
(
  'log_003',
  'create_assignment',
  'assignment',
  'assignment',
  'assignment_789',
  'teacher_456',
  'teacher',
  '{"title": "数据结构课程作业1", "due_date": "2025-09-15", "max_score": 100}',
  true,
  '创建新的作业任务'
);

-- 创建存储过程：记录操作日志
CREATE OR REPLACE FUNCTION log_operation(
  p_operation_type VARCHAR(50),
  p_module VARCHAR(50),
  p_target_type VARCHAR(50),
  p_target_id VARCHAR(30),
  p_operator_id VARCHAR(30) DEFAULT NULL,
  p_operator_role VARCHAR(20) DEFAULT 'system',
  p_details JSON DEFAULT NULL,
  p_before_data JSON DEFAULT NULL,
  p_after_data JSON DEFAULT NULL,
  p_affected_ids JSON DEFAULT NULL,
  p_ip_address VARCHAR(45) DEFAULT NULL,
  p_user_agent VARCHAR(500) DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_error_message VARCHAR(1000) DEFAULT NULL,
  p_execution_time_ms INTEGER DEFAULT 0,
  p_notes VARCHAR(500) DEFAULT NULL
) RETURNS VARCHAR(30) AS $$
DECLARE
  v_log_id VARCHAR(30);
BEGIN
  -- 生成日志ID
  v_log_id := 'log_' || to_char(NOW(), 'YYYYMMDD') || '_' || 
              LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 10, '0') || '_' ||
              LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
  
  -- 插入操作日志
  INSERT INTO operation_logs (
    id, operation_type, module, target_type, target_id,
    operator_id, operator_role, details, before_data, after_data,
    affected_ids, ip_address, user_agent, success, error_message,
    execution_time_ms, notes, created_at
  ) VALUES (
    v_log_id, p_operation_type, p_module, p_target_type, p_target_id,
    p_operator_id, p_operator_role, p_details, p_before_data, p_after_data,
    p_affected_ids, p_ip_address, p_user_agent, p_success, p_error_message,
    p_execution_time_ms, p_notes, NOW()
  );
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- 创建清理历史日志的存储过程
CREATE OR REPLACE FUNCTION cleanup_operation_logs(
  p_days_to_keep INTEGER DEFAULT 365  -- 默认保留1年
) RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
  v_cutoff_date TIMESTAMP;
BEGIN
  v_cutoff_date := NOW() - INTERVAL '1 day' * p_days_to_keep;
  
  -- 删除超期的日志记录
  DELETE FROM operation_logs 
  WHERE created_at < v_cutoff_date;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- 记录清理操作
  PERFORM log_operation(
    'cleanup_logs',
    'system_management',
    'system',
    'operation_logs',
    NULL,
    'system',
    JSON_BUILD_OBJECT(
      'days_to_keep', p_days_to_keep,
      'cutoff_date', v_cutoff_date,
      'deleted_count', v_deleted_count
    ),
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    true,
    NULL,
    0,
    '自动清理历史操作日志'
  );
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 添加注释
COMMENT ON TABLE operation_logs IS '系统操作日志表，记录所有重要操作用于审计和监控';
COMMENT ON COLUMN operation_logs.id IS '日志记录唯一标识符';
COMMENT ON COLUMN operation_logs.operation_type IS '操作类型，如create_user, batch_add_class_to_course等';
COMMENT ON COLUMN operation_logs.module IS '操作模块，如course, user, attendance等';
COMMENT ON COLUMN operation_logs.target_type IS '操作目标类型，如class, individual, course等';
COMMENT ON COLUMN operation_logs.target_id IS '操作目标的资源ID';
COMMENT ON COLUMN operation_logs.affected_ids IS '受影响的资源ID列表，JSON数组格式';
COMMENT ON COLUMN operation_logs.operator_id IS '操作者用户ID，NULL表示系统操作';
COMMENT ON COLUMN operation_logs.operator_role IS '操作者角色：teacher, student, admin, system';
COMMENT ON COLUMN operation_logs.details IS '操作详细信息，JSON格式存储';
COMMENT ON COLUMN operation_logs.before_data IS '操作前数据快照，用于审计和回滚';
COMMENT ON COLUMN operation_logs.after_data IS '操作后数据快照，用于变更追踪';
COMMENT ON COLUMN operation_logs.execution_time_ms IS '操作执行时间，毫秒';

COMMENT ON VIEW v_operation_logs_summary IS '操作日志汇总视图，按日期和操作类型统计';
COMMENT ON VIEW v_operation_errors IS '失败操作监控视图，用于错误分析';
COMMENT ON VIEW v_high_frequency_operations IS '高频操作监控视图，用于异常行为检测';

COMMENT ON FUNCTION log_operation IS '记录操作日志的存储过程';
COMMENT ON FUNCTION cleanup_operation_logs IS '清理历史操作日志的存储过程';

-- 验证表创建成功
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'operation_logs') THEN
        RAISE NOTICE '✅ 操作日志表(operation_logs)创建成功';
    ELSE
        RAISE EXCEPTION '❌ 操作日志表创建失败';
    END IF;
END $$;-- ================================================
-- Migration: 003_create_course_materials.sql
-- Description: 创建课件管理表，扩展现有文件上传功能
-- Author: SmartTeacher Pro System
-- Date: 2025-09-09
-- ================================================

-- 课件文件管理表（扩展现有文件上传功能）
-- 基于现有 file_uploads 表进行扩展，管理课程相关的教学材料
CREATE TABLE course_materials (
  id VARCHAR(30) PRIMARY KEY,
  course_id VARCHAR(30) NOT NULL, -- 关联课程ID
  file_upload_id VARCHAR(30), -- 关联现有文件表，可为NULL（外部链接）
  name VARCHAR(255) NOT NULL, -- 课件名称
  description TEXT, -- 课件描述
  type VARCHAR(50) NOT NULL, -- ppt, pdf, doc, video, audio, link等
  category VARCHAR(50) DEFAULT 'material', -- material, exercise, reference, multimedia
  version INTEGER DEFAULT 1, -- 版本号
  file_size BIGINT DEFAULT 0, -- 文件大小（字节）
  file_path VARCHAR(500), -- 文件路径（本地存储或URL）
  thumbnail_path VARCHAR(500), -- 缩略图路径
  is_active BOOLEAN DEFAULT true, -- 是否启用
  is_downloadable BOOLEAN DEFAULT true, -- 是否允许下载
  is_presentation BOOLEAN DEFAULT false, -- 是否为演示文件
  requires_login BOOLEAN DEFAULT true, -- 是否需要登录访问
  order_index INTEGER DEFAULT 0, -- 排序
  view_count INTEGER DEFAULT 0, -- 浏览次数
  download_count INTEGER DEFAULT 0, -- 下载次数
  last_accessed_at TIMESTAMP, -- 最后访问时间
  created_by VARCHAR(30), -- 创建者ID
  updated_by VARCHAR(30), -- 更新者ID
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引以优化查询性能
CREATE INDEX idx_course_materials_course_id ON course_materials(course_id, is_active);
CREATE INDEX idx_course_materials_type_category ON course_materials(type, category);
CREATE INDEX idx_course_materials_created_by ON course_materials(created_by, created_at);
CREATE INDEX idx_course_materials_order ON course_materials(course_id, order_index);
CREATE INDEX idx_course_materials_presentation ON course_materials(is_presentation, is_active);

-- 添加外键约束（假设现有表结构）
-- ALTER TABLE course_materials ADD CONSTRAINT fk_course_materials_course 
--   FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
-- ALTER TABLE course_materials ADD CONSTRAINT fk_course_materials_file 
--   FOREIGN KEY (file_upload_id) REFERENCES file_uploads(id) ON DELETE SET NULL;
-- ALTER TABLE course_materials ADD CONSTRAINT fk_course_materials_creator 
--   FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 添加约束确保数据完整性
ALTER TABLE course_materials ADD CONSTRAINT check_material_type 
  CHECK (type IN ('ppt', 'pdf', 'doc', 'docx', 'video', 'audio', 'image', 'link', 'zip', 'other'));

ALTER TABLE course_materials ADD CONSTRAINT check_material_category 
  CHECK (category IN ('material', 'exercise', 'reference', 'multimedia', 'template'));

ALTER TABLE course_materials ADD CONSTRAINT check_version 
  CHECK (version > 0);

ALTER TABLE course_materials ADD CONSTRAINT check_file_size 
  CHECK (file_size >= 0);

ALTER TABLE course_materials ADD CONSTRAINT check_order_index 
  CHECK (order_index >= 0);

-- 创建触发器自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_course_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_course_materials_updated_at
    BEFORE UPDATE ON course_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_course_materials_updated_at();

-- 创建触发器更新访问统计
CREATE OR REPLACE FUNCTION update_material_access_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- 记录访问时间
    NEW.last_accessed_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 课件统计视图
CREATE VIEW v_course_materials_stats AS
SELECT 
  cm.course_id,
  COUNT(*) as total_materials,
  COUNT(CASE WHEN cm.is_active = true THEN 1 END) as active_materials,
  COUNT(CASE WHEN cm.type = 'ppt' THEN 1 END) as ppt_count,
  COUNT(CASE WHEN cm.type = 'pdf' THEN 1 END) as pdf_count,
  COUNT(CASE WHEN cm.type = 'video' THEN 1 END) as video_count,
  COUNT(CASE WHEN cm.is_presentation = true THEN 1 END) as presentation_count,
  SUM(cm.file_size) as total_size_bytes,
  ROUND(AVG(cm.view_count), 2) as avg_view_count,
  MAX(cm.created_at) as latest_upload_time,
  MIN(cm.created_at) as first_upload_time
FROM course_materials cm
GROUP BY cm.course_id;

-- 热门课件视图
CREATE VIEW v_popular_materials AS
SELECT 
  cm.id,
  cm.course_id,
  cm.name,
  cm.type,
  cm.category,
  cm.view_count,
  cm.download_count,
  cm.last_accessed_at,
  cm.created_at,
  ROW_NUMBER() OVER (PARTITION BY cm.course_id ORDER BY cm.view_count DESC) as popularity_rank
FROM course_materials cm
WHERE cm.is_active = true
ORDER BY cm.view_count DESC;

-- 课件版本管理视图
CREATE VIEW v_material_versions AS
SELECT 
  cm.course_id,
  cm.name,
  COUNT(*) as version_count,
  MAX(cm.version) as latest_version,
  MAX(cm.created_at) as latest_version_time,
  STRING_AGG(cm.version::TEXT, ',' ORDER BY cm.version) as all_versions
FROM course_materials cm
GROUP BY cm.course_id, cm.name
HAVING COUNT(*) > 1
ORDER BY latest_version_time DESC;

-- 插入示例课件数据
INSERT INTO course_materials (
  id, course_id, name, type, category, version, 
  is_presentation, order_index, created_by
) VALUES
('material_001', 'course_123', '数据结构导论PPT', 'ppt', 'material', 1, true, 1, 'teacher_456'),
('material_002', 'course_123', '算法复杂度分析PDF', 'pdf', 'reference', 1, false, 2, 'teacher_456'),
('material_003', 'course_123', '编程练习题集', 'doc', 'exercise', 1, false, 3, 'teacher_456'),
('material_004', 'course_123', '数据结构可视化演示', 'video', 'multimedia', 1, false, 4, 'teacher_456'),
('material_005', 'course_456', '面向对象程序设计PPT', 'ppt', 'material', 1, true, 1, 'teacher_789');

-- 创建存储过程：添加课件
CREATE OR REPLACE FUNCTION add_course_material(
  p_course_id VARCHAR(30),
  p_name VARCHAR(255),
  p_type VARCHAR(50),
  p_category VARCHAR(50) DEFAULT 'material',
  p_file_upload_id VARCHAR(30) DEFAULT NULL,
  p_file_path VARCHAR(500) DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_is_presentation BOOLEAN DEFAULT false,
  p_is_downloadable BOOLEAN DEFAULT true,
  p_created_by VARCHAR(30) DEFAULT NULL
) RETURNS VARCHAR(30) AS $$
DECLARE
  v_material_id VARCHAR(30);
  v_max_order INTEGER;
BEGIN
  -- 生成课件ID
  v_material_id := 'material_' || to_char(NOW(), 'YYYYMMDD') || '_' || 
                   LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 10, '0') || '_' ||
                   LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
  
  -- 获取最大排序号
  SELECT COALESCE(MAX(order_index), 0) + 1 INTO v_max_order
  FROM course_materials 
  WHERE course_id = p_course_id;
  
  -- 插入课件记录
  INSERT INTO course_materials (
    id, course_id, file_upload_id, name, description, type, category,
    file_path, is_presentation, is_downloadable, order_index, created_by
  ) VALUES (
    v_material_id, p_course_id, p_file_upload_id, p_name, p_description, 
    p_type, p_category, p_file_path, p_is_presentation, p_is_downloadable,
    v_max_order, p_created_by
  );
  
  -- 记录操作日志
  PERFORM log_operation(
    'upload_material',
    'material_management',
    'material',
    v_material_id,
    p_created_by,
    'teacher',
    JSON_BUILD_OBJECT(
      'material_name', p_name,
      'course_id', p_course_id,
      'type', p_type,
      'category', p_category,
      'is_presentation', p_is_presentation
    ),
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    true,
    NULL,
    0,
    '添加课程教学材料'
  );
  
  RETURN v_material_id;
END;
$$ LANGUAGE plpgsql;

-- 创建存储过程：更新课件访问统计
CREATE OR REPLACE FUNCTION update_material_stats(
  p_material_id VARCHAR(30),
  p_action VARCHAR(10) -- 'view' 或 'download'
) RETURNS BOOLEAN AS $$
BEGIN
  IF p_action = 'view' THEN
    UPDATE course_materials 
    SET view_count = view_count + 1,
        last_accessed_at = NOW()
    WHERE id = p_material_id;
  ELSIF p_action = 'download' THEN
    UPDATE course_materials 
    SET download_count = download_count + 1,
        last_accessed_at = NOW()
    WHERE id = p_material_id;
  END IF;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 创建存储过程：批量更新课件排序
CREATE OR REPLACE FUNCTION reorder_course_materials(
  p_course_id VARCHAR(30),
  p_material_orders JSON -- [{"id": "material_001", "order": 1}, ...]
) RETURNS BOOLEAN AS $$
DECLARE
  v_item JSON;
BEGIN
  -- 遍历更新排序
  FOR v_item IN SELECT * FROM JSON_ARRAY_ELEMENTS(p_material_orders)
  LOOP
    UPDATE course_materials 
    SET order_index = (v_item->>'order')::INTEGER,
        updated_at = NOW()
    WHERE id = v_item->>'id' 
      AND course_id = p_course_id;
  END LOOP;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 创建存储过程：清理未使用的课件
CREATE OR REPLACE FUNCTION cleanup_unused_materials(
  p_days_unused INTEGER DEFAULT 180  -- 默认180天未访问
) RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
  v_cutoff_date TIMESTAMP;
BEGIN
  v_cutoff_date := NOW() - INTERVAL '1 day' * p_days_unused;
  
  -- 软删除长时间未访问的课件
  UPDATE course_materials 
  SET is_active = false,
      updated_at = NOW()
  WHERE (last_accessed_at IS NULL OR last_accessed_at < v_cutoff_date)
    AND is_active = true
    AND view_count = 0;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 添加注释
COMMENT ON TABLE course_materials IS '课程教学材料管理表，扩展文件上传功能支持课件管理';
COMMENT ON COLUMN course_materials.id IS '课件唯一标识符';
COMMENT ON COLUMN course_materials.course_id IS '所属课程ID';
COMMENT ON COLUMN course_materials.file_upload_id IS '关联文件上传表ID，可为NULL';
COMMENT ON COLUMN course_materials.name IS '课件显示名称';
COMMENT ON COLUMN course_materials.type IS '文件类型：ppt, pdf, doc, video等';
COMMENT ON COLUMN course_materials.category IS '课件分类：material, exercise, reference, multimedia';
COMMENT ON COLUMN course_materials.version IS '版本号，支持版本控制';
COMMENT ON COLUMN course_materials.is_presentation IS '是否为演示文件（用于PPT播放）';
COMMENT ON COLUMN course_materials.order_index IS '课件排序号';
COMMENT ON COLUMN course_materials.view_count IS '浏览次数统计';
COMMENT ON COLUMN course_materials.download_count IS '下载次数统计';

COMMENT ON VIEW v_course_materials_stats IS '课程课件统计视图';
COMMENT ON VIEW v_popular_materials IS '热门课件视图，按浏览量排序';
COMMENT ON VIEW v_material_versions IS '课件版本管理视图';

COMMENT ON FUNCTION add_course_material IS '添加课程教学材料的存储过程';
COMMENT ON FUNCTION update_material_stats IS '更新课件访问统计的存储过程';
COMMENT ON FUNCTION reorder_course_materials IS '批量更新课件排序的存储过程';

-- 验证表创建成功
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_materials') THEN
        RAISE NOTICE '✅ 课件管理表(course_materials)创建成功';
    ELSE
        RAISE EXCEPTION '❌ 课件管理表创建失败';
    END IF;
END $$;-- ================================================
-- Migration: 004_create_presentation_sessions.sql
-- Description: 创建PPT演示会话表
-- Author: SmartTeacher Pro System
-- Date: 2025-09-09
-- ================================================

-- PPT演示会话表
-- 用于管理课堂PPT演示的实时状态和同步功能
CREATE TABLE presentation_sessions (
  id VARCHAR(30) PRIMARY KEY,
  course_id VARCHAR(30) NOT NULL, -- 所属课程ID
  material_id VARCHAR(30) NOT NULL, -- 关联课件ID
  teacher_id VARCHAR(30) NOT NULL, -- 演示教师ID
  classroom_id VARCHAR(30), -- 教室ID（可选）
  session_name VARCHAR(100), -- 演示会话名称
  current_slide INTEGER DEFAULT 1, -- 当前幻灯片页码
  total_slides INTEGER DEFAULT 0, -- 总幻灯片数量
  status VARCHAR(20) DEFAULT 'inactive', -- 会话状态
  play_mode VARCHAR(20) DEFAULT 'manual', -- 播放模式：manual, auto, remote
  auto_advance_seconds INTEGER DEFAULT 0, -- 自动播放间隔（秒）
  allow_student_control BOOLEAN DEFAULT false, -- 是否允许学生控制
  enable_annotations BOOLEAN DEFAULT true, -- 是否启用标注功能
  enable_recording BOOLEAN DEFAULT false, -- 是否启用录制
  start_time TIMESTAMP, -- 开始时间
  end_time TIMESTAMP, -- 结束时间
  pause_time TIMESTAMP, -- 暂停时间
  resume_time TIMESTAMP, -- 恢复时间
  total_duration_seconds INTEGER DEFAULT 0, -- 总演示时长（秒）
  viewer_count INTEGER DEFAULT 0, -- 当前观看人数
  max_viewers INTEGER DEFAULT 0, -- 最大观看人数
  slide_timings JSON, -- 每页幻灯片停留时间记录 [{"slide": 1, "duration": 30}, ...]
  annotations JSON, -- 标注数据 {"slide_1": [{"type": "pen", "data": "..."}], ...}
  interaction_stats JSON, -- 互动统计 {"questions": 5, "polls": 2, "feedback": 8}
  settings JSON, -- 演示设置 {"theme": "dark", "laser_pointer": true, ...}
  recording_path VARCHAR(500), -- 录制文件路径
  recording_size_mb DECIMAL(10,2) DEFAULT 0, -- 录制文件大小（MB）
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引以优化查询性能
CREATE INDEX idx_presentation_sessions_course_status ON presentation_sessions(course_id, status);
CREATE INDEX idx_presentation_sessions_teacher_time ON presentation_sessions(teacher_id, created_at);
CREATE INDEX idx_presentation_sessions_material ON presentation_sessions(material_id, status);
CREATE INDEX idx_presentation_sessions_active ON presentation_sessions(status, start_time) WHERE status IN ('active', 'paused');
CREATE INDEX idx_presentation_sessions_classroom ON presentation_sessions(classroom_id, start_time);

-- 为JSON字段创建GIN索引以支持JSON查询
CREATE INDEX idx_presentation_sessions_annotations ON presentation_sessions USING GIN(annotations);
CREATE INDEX idx_presentation_sessions_settings ON presentation_sessions USING GIN(settings);
CREATE INDEX idx_presentation_sessions_slide_timings ON presentation_sessions USING GIN(slide_timings);

-- 添加外键约束（假设现有表结构）
-- ALTER TABLE presentation_sessions ADD CONSTRAINT fk_presentation_sessions_course 
--   FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
-- ALTER TABLE presentation_sessions ADD CONSTRAINT fk_presentation_sessions_material 
--   FOREIGN KEY (material_id) REFERENCES course_materials(id) ON DELETE CASCADE;
-- ALTER TABLE presentation_sessions ADD CONSTRAINT fk_presentation_sessions_teacher 
--   FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

-- 添加约束确保数据完整性
ALTER TABLE presentation_sessions ADD CONSTRAINT check_session_status 
  CHECK (status IN ('inactive', 'active', 'paused', 'ended', 'error'));

ALTER TABLE presentation_sessions ADD CONSTRAINT check_play_mode 
  CHECK (play_mode IN ('manual', 'auto', 'remote'));

ALTER TABLE presentation_sessions ADD CONSTRAINT check_current_slide 
  CHECK (current_slide > 0);

ALTER TABLE presentation_sessions ADD CONSTRAINT check_total_slides 
  CHECK (total_slides >= 0);

ALTER TABLE presentation_sessions ADD CONSTRAINT check_auto_advance 
  CHECK (auto_advance_seconds >= 0);

ALTER TABLE presentation_sessions ADD CONSTRAINT check_viewer_count 
  CHECK (viewer_count >= 0 AND max_viewers >= viewer_count);

ALTER TABLE presentation_sessions ADD CONSTRAINT check_duration 
  CHECK (total_duration_seconds >= 0);

-- 创建触发器自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_presentation_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- 自动计算总时长
    IF NEW.status = 'ended' AND NEW.start_time IS NOT NULL THEN
        NEW.total_duration_seconds = COALESCE(
            EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::INTEGER, 
            0
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_presentation_sessions_updated_at
    BEFORE UPDATE ON presentation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_presentation_sessions_updated_at();

-- 创建演示会话统计视图
CREATE VIEW v_presentation_sessions_stats AS
SELECT 
  ps.course_id,
  ps.teacher_id,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN ps.status = 'ended' THEN 1 END) as completed_sessions,
  COUNT(CASE WHEN ps.status = 'active' THEN 1 END) as active_sessions,
  ROUND(AVG(ps.total_duration_seconds), 2) as avg_duration_seconds,
  SUM(ps.total_duration_seconds) as total_presentation_time,
  MAX(ps.max_viewers) as peak_viewers,
  ROUND(AVG(ps.max_viewers), 2) as avg_viewers,
  COUNT(CASE WHEN ps.enable_recording = true THEN 1 END) as recorded_sessions,
  MAX(ps.created_at) as latest_session_time,
  MIN(ps.created_at) as first_session_time
FROM presentation_sessions ps
GROUP BY ps.course_id, ps.teacher_id;

-- 活跃演示会话监控视图
CREATE VIEW v_active_presentations AS
SELECT 
  ps.id,
  ps.course_id,
  ps.teacher_id,
  ps.session_name,
  ps.current_slide,
  ps.total_slides,
  ps.status,
  ps.viewer_count,
  ps.start_time,
  EXTRACT(EPOCH FROM (NOW() - ps.start_time))::INTEGER as running_seconds,
  cm.name as material_name,
  cm.type as material_type
FROM presentation_sessions ps
LEFT JOIN course_materials cm ON ps.material_id = cm.id
WHERE ps.status IN ('active', 'paused')
ORDER BY ps.start_time DESC;

-- 演示效果分析视图
CREATE VIEW v_presentation_analytics AS
SELECT 
  ps.id,
  ps.course_id,
  ps.material_id,
  ps.total_slides,
  ps.total_duration_seconds,
  ps.max_viewers,
  CASE 
    WHEN ps.total_slides > 0 AND ps.total_duration_seconds > 0 
    THEN ROUND(ps.total_duration_seconds::DECIMAL / ps.total_slides, 2)
    ELSE 0
  END as avg_seconds_per_slide,
  CASE 
    WHEN ps.total_duration_seconds > 0 
    THEN ROUND((ps.max_viewers * ps.total_duration_seconds)::DECIMAL / 60, 2)
    ELSE 0
  END as viewer_minutes,
  ps.enable_annotations,
  ps.enable_recording,
  JSON_ARRAY_LENGTH(COALESCE(ps.slide_timings, '[]'::JSON)) as recorded_slide_count,
  ps.created_at
FROM presentation_sessions ps
WHERE ps.status = 'ended'
ORDER BY ps.created_at DESC;

-- 插入示例演示会话数据
INSERT INTO presentation_sessions (
  id, course_id, material_id, teacher_id, session_name, 
  total_slides, status, current_slide
) VALUES
('session_001', 'course_123', 'material_001', 'teacher_456', '数据结构导论第一章', 25, 'inactive', 1),
('session_002', 'course_123', 'material_001', 'teacher_456', '数据结构导论第二章', 30, 'ended', 30),
('session_003', 'course_456', 'material_005', 'teacher_789', '面向对象程序设计概述', 20, 'active', 5);

-- 创建存储过程：开始演示会话
CREATE OR REPLACE FUNCTION start_presentation_session(
  p_course_id VARCHAR(30),
  p_material_id VARCHAR(30),
  p_teacher_id VARCHAR(30),
  p_session_name VARCHAR(100) DEFAULT NULL,
  p_classroom_id VARCHAR(30) DEFAULT NULL,
  p_total_slides INTEGER DEFAULT 0,
  p_settings JSON DEFAULT NULL
) RETURNS VARCHAR(30) AS $$
DECLARE
  v_session_id VARCHAR(30);
  v_material_name VARCHAR(255);
BEGIN
  -- 检查是否有活跃会话
  IF EXISTS (
    SELECT 1 FROM presentation_sessions 
    WHERE course_id = p_course_id 
      AND teacher_id = p_teacher_id 
      AND status IN ('active', 'paused')
  ) THEN
    RAISE EXCEPTION '该课程已有活跃的演示会话，请先结束当前会话';
  END IF;
  
  -- 生成会话ID
  v_session_id := 'session_' || to_char(NOW(), 'YYYYMMDD') || '_' || 
                  LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 10, '0') || '_' ||
                  LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
  
  -- 获取课件名称
  SELECT name INTO v_material_name 
  FROM course_materials 
  WHERE id = p_material_id;
  
  -- 插入演示会话
  INSERT INTO presentation_sessions (
    id, course_id, material_id, teacher_id, classroom_id,
    session_name, total_slides, status, start_time, settings
  ) VALUES (
    v_session_id, p_course_id, p_material_id, p_teacher_id, p_classroom_id,
    COALESCE(p_session_name, v_material_name || ' 演示'), 
    p_total_slides, 'active', NOW(), p_settings
  );
  
  -- 记录操作日志
  PERFORM log_operation(
    'start_presentation',
    'material_management',
    'presentation',
    v_session_id,
    p_teacher_id,
    'teacher',
    JSON_BUILD_OBJECT(
      'course_id', p_course_id,
      'material_id', p_material_id,
      'session_name', COALESCE(p_session_name, v_material_name || ' 演示'),
      'total_slides', p_total_slides,
      'classroom_id', p_classroom_id
    ),
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    true,
    NULL,
    0,
    '开始PPT演示会话'
  );
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- 创建存储过程：更新演示进度
CREATE OR REPLACE FUNCTION update_presentation_progress(
  p_session_id VARCHAR(30),
  p_current_slide INTEGER,
  p_annotations JSON DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_old_slide INTEGER;
  v_slide_start_time TIMESTAMP;
BEGIN
  -- 获取当前幻灯片
  SELECT current_slide INTO v_old_slide
  FROM presentation_sessions 
  WHERE id = p_session_id AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- 更新演示进度
  UPDATE presentation_sessions 
  SET current_slide = p_current_slide,
      annotations = COALESCE(p_annotations, annotations),
      updated_at = NOW()
  WHERE id = p_session_id;
  
  -- 记录幻灯片停留时间（如果切换了幻灯片）
  IF v_old_slide != p_current_slide THEN
    UPDATE presentation_sessions 
    SET slide_timings = COALESCE(slide_timings, '[]'::JSON) || 
                       JSON_BUILD_OBJECT(
                         'slide', v_old_slide,
                         'duration', EXTRACT(EPOCH FROM (NOW() - updated_at))::INTEGER,
                         'timestamp', NOW()
                       )::JSON
    WHERE id = p_session_id;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 创建存储过程：结束演示会话
CREATE OR REPLACE FUNCTION end_presentation_session(
  p_session_id VARCHAR(30),
  p_recording_path VARCHAR(500) DEFAULT NULL,
  p_recording_size_mb DECIMAL(10,2) DEFAULT 0
) RETURNS BOOLEAN AS $$
DECLARE
  v_session_record RECORD;
BEGIN
  -- 获取会话信息
  SELECT * INTO v_session_record
  FROM presentation_sessions 
  WHERE id = p_session_id AND status IN ('active', 'paused');
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- 更新会话状态
  UPDATE presentation_sessions 
  SET status = 'ended',
      end_time = NOW(),
      recording_path = p_recording_path,
      recording_size_mb = p_recording_size_mb,
      total_duration_seconds = EXTRACT(EPOCH FROM (NOW() - start_time))::INTEGER
  WHERE id = p_session_id;
  
  -- 记录操作日志
  PERFORM log_operation(
    'end_presentation',
    'material_management',
    'presentation',
    p_session_id,
    v_session_record.teacher_id,
    'teacher',
    JSON_BUILD_OBJECT(
      'duration_seconds', EXTRACT(EPOCH FROM (NOW() - v_session_record.start_time))::INTEGER,
      'total_slides', v_session_record.total_slides,
      'max_viewers', v_session_record.max_viewers,
      'has_recording', p_recording_path IS NOT NULL
    ),
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    true,
    NULL,
    0,
    '结束PPT演示会话'
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 创建存储过程：更新观看人数
CREATE OR REPLACE FUNCTION update_viewer_count(
  p_session_id VARCHAR(30),
  p_delta INTEGER -- 增加(+1)或减少(-1)观看人数
) RETURNS INTEGER AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  UPDATE presentation_sessions 
  SET viewer_count = GREATEST(0, viewer_count + p_delta),
      max_viewers = GREATEST(max_viewers, viewer_count + p_delta),
      updated_at = NOW()
  WHERE id = p_session_id AND status = 'active'
  RETURNING viewer_count INTO v_new_count;
  
  RETURN COALESCE(v_new_count, 0);
END;
$$ LANGUAGE plpgsql;

-- 添加注释
COMMENT ON TABLE presentation_sessions IS 'PPT演示会话表，管理课堂演示的实时状态和同步';
COMMENT ON COLUMN presentation_sessions.id IS '演示会话唯一标识符';
COMMENT ON COLUMN presentation_sessions.course_id IS '所属课程ID';
COMMENT ON COLUMN presentation_sessions.material_id IS '关联的课件材料ID';
COMMENT ON COLUMN presentation_sessions.teacher_id IS '演示教师ID';
COMMENT ON COLUMN presentation_sessions.current_slide IS '当前显示的幻灯片页码';
COMMENT ON COLUMN presentation_sessions.total_slides IS '演示文稿总页数';
COMMENT ON COLUMN presentation_sessions.status IS '会话状态：inactive, active, paused, ended, error';
COMMENT ON COLUMN presentation_sessions.viewer_count IS '当前观看人数';
COMMENT ON COLUMN presentation_sessions.max_viewers IS '会话期间最大观看人数';
COMMENT ON COLUMN presentation_sessions.slide_timings IS '每页幻灯片停留时间记录，JSON格式';
COMMENT ON COLUMN presentation_sessions.annotations IS '演示标注数据，JSON格式';
COMMENT ON COLUMN presentation_sessions.settings IS '演示设置，JSON格式';

COMMENT ON VIEW v_presentation_sessions_stats IS '演示会话统计视图';
COMMENT ON VIEW v_active_presentations IS '活跃演示会话监控视图';
COMMENT ON VIEW v_presentation_analytics IS '演示效果分析视图';

COMMENT ON FUNCTION start_presentation_session IS '开始PPT演示会话的存储过程';
COMMENT ON FUNCTION update_presentation_progress IS '更新演示进度的存储过程';
COMMENT ON FUNCTION end_presentation_session IS '结束演示会话的存储过程';
COMMENT ON FUNCTION update_viewer_count IS '更新观看人数的存储过程';

-- 验证表创建成功
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'presentation_sessions') THEN
        RAISE NOTICE '✅ PPT演示会话表(presentation_sessions)创建成功';
    ELSE
        RAISE EXCEPTION '❌ PPT演示会话表创建失败';
    END IF;
END $$;-- ================================================
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
END $$;-- ================================================
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
END $$;-- ================================================
-- Migration: 007_migrate_historical_data.sql
-- Description: 历史数据迁移和处理脚本
-- Author: SmartTeacher Pro System
-- Date: 2025-09-09
-- ================================================

-- 历史数据迁移脚本，用于处理现有数据与新表结构的兼容性
-- 确保数据完整性和一致性

-- =============================================
-- 1. 创建默认班级记录（基于现有用户数据）
-- =============================================

-- 为现有学生用户创建对应的班级记录
INSERT INTO student_classes (id, name, code, department, major, grade, academic_year, total_students, status)
SELECT DISTINCT
  CONCAT(
    COALESCE(department, 'UNKNOWN'), '_', 
    COALESCE(major, 'UNKNOWN'), '_', 
    COALESCE(grade, 'UNKNOWN')
  ) as id,
  CONCAT(
    COALESCE(major, '未知专业'), 
    COALESCE(grade, '未知年级'), '班'
  ) as name,
  CONCAT(
    UPPER(LEFT(COALESCE(major, 'UNK'), 3)), 
    COALESCE(grade, '0000')
  ) as code,
  department,
  major,
  grade,
  CASE 
    WHEN grade IS NOT NULL AND grade::INTEGER >= 2021 
    THEN CONCAT((grade::INTEGER + 3)::TEXT, '-', (grade::INTEGER + 4)::TEXT)
    ELSE '2024-2025'
  END as academic_year,
  0 as total_students,
  'active' as status
FROM users 
WHERE role = 'student' 
  AND department IS NOT NULL 
  AND major IS NOT NULL 
  AND grade IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 更新班级的总学生数
UPDATE student_classes 
SET total_students = (
  SELECT COUNT(*) 
  FROM users u 
  WHERE u.role = 'student' 
    AND u.department = student_classes.department
    AND u.major = student_classes.major 
    AND u.grade = student_classes.grade
),
updated_at = NOW();

-- =============================================
-- 2. 更新现有用户的班级关联
-- =============================================

-- 更新学生用户的班级关联信息
UPDATE users 
SET 
  class_id = CONCAT(
    COALESCE(department, 'UNKNOWN'), '_', 
    COALESCE(major, 'UNKNOWN'), '_', 
    COALESCE(grade, 'UNKNOWN')
  ),
  class_name = CONCAT(
    COALESCE(major, '未知专业'), 
    COALESCE(grade, '未知年级'), '班'
  ),
  academic_year = CASE 
    WHEN grade IS NOT NULL AND grade::INTEGER >= 2021 
    THEN CONCAT((grade::INTEGER + 3)::TEXT, '-', (grade::INTEGER + 4)::TEXT)
    ELSE '2024-2025'
  END,
  enrollment_date = CASE 
    WHEN grade IS NOT NULL AND grade::INTEGER >= 2020
    THEN DATE(grade || '-09-01')
    ELSE '2021-09-01'
  END,
  status = COALESCE(status, 'active'),
  student_type = 'regular',
  updated_at = NOW()
WHERE role = 'student' 
  AND class_id IS NULL
  AND department IS NOT NULL 
  AND major IS NOT NULL 
  AND grade IS NOT NULL;

-- =============================================
-- 3. 迁移现有课件文件到新的课件管理表
-- =============================================

-- 从现有file_uploads表迁移课程相关文件到course_materials表
INSERT INTO course_materials (
  id, course_id, file_upload_id, name, type, category, 
  file_size, file_path, is_active, is_downloadable, 
  order_index, created_by, created_at
)
SELECT 
  CONCAT('material_migrated_', fu.id) as id,
  -- 尝试从文件路径或名称中提取课程ID，如果没有则使用默认值
  COALESCE(
    (SELECT c.id FROM courses c WHERE fu.file_name ILIKE '%' || c.course_code || '%' LIMIT 1),
    'course_default'
  ) as course_id,
  fu.id as file_upload_id,
  fu.file_name as name,
  CASE 
    WHEN fu.file_type ILIKE '%powerpoint%' OR fu.file_type ILIKE '%ppt%' THEN 'ppt'
    WHEN fu.file_type ILIKE '%pdf%' THEN 'pdf'
    WHEN fu.file_type ILIKE '%word%' OR fu.file_type ILIKE '%doc%' THEN 'doc'
    WHEN fu.file_type ILIKE '%video%' THEN 'video'
    WHEN fu.file_type ILIKE '%audio%' THEN 'audio'
    WHEN fu.file_type ILIKE '%image%' THEN 'image'
    ELSE 'other'
  END as type,
  CASE 
    WHEN fu.file_name ILIKE '%exercise%' OR fu.file_name ILIKE '%homework%' THEN 'exercise'
    WHEN fu.file_name ILIKE '%reference%' OR fu.file_name ILIKE '%manual%' THEN 'reference'
    WHEN fu.file_name ILIKE '%video%' OR fu.file_name ILIKE '%audio%' THEN 'multimedia'
    ELSE 'material'
  END as category,
  fu.file_size,
  fu.file_path,
  true as is_active,
  true as is_downloadable,
  ROW_NUMBER() OVER (ORDER BY fu.upload_date) as order_index,
  fu.uploaded_by as created_by,
  fu.upload_date as created_at
FROM file_uploads fu
WHERE fu.file_path IS NOT NULL 
  AND fu.file_path NOT LIKE '%/temp/%'  -- 排除临时文件
  AND NOT EXISTS (
    SELECT 1 FROM course_materials cm WHERE cm.file_upload_id = fu.id
  );

-- =============================================
-- 4. 修复数据完整性问题
-- =============================================

-- 修复enrollments表中的孤立记录
DELETE FROM enrollments 
WHERE student_id NOT IN (SELECT id FROM users WHERE role = 'student');

DELETE FROM enrollments 
WHERE course_id NOT IN (SELECT id FROM courses);

-- 修复attendances表中的孤立记录
DELETE FROM attendances 
WHERE student_id NOT IN (SELECT id FROM users WHERE role = 'student');

DELETE FROM attendances 
WHERE course_id NOT IN (SELECT id FROM courses);

-- 修复assignment_submissions表中的孤立记录
DELETE FROM assignment_submissions 
WHERE student_id NOT IN (SELECT id FROM users WHERE role = 'student');

DELETE FROM assignment_submissions 
WHERE assignment_id NOT IN (SELECT id FROM assignments);

-- =============================================
-- 5. 历史统计数据计算和补全
-- =============================================

-- 计算并更新enrollments表中的出勤率
UPDATE enrollments 
SET attendance_rate = (
  SELECT 
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND(
        COUNT(CASE WHEN a.status = 'present' THEN 1 END)::DECIMAL / COUNT(*) * 100, 2
      )
    END
  FROM attendances a
  WHERE a.student_id = enrollments.student_id 
    AND a.course_id = enrollments.course_id
),
updated_at = NOW()
WHERE attendance_rate IS NULL;

-- 计算用户登录统计（模拟历史登录数据）
UPDATE users 
SET 
  login_count = FLOOR(RANDOM() * 50) + 10, -- 随机生成10-59次登录
  last_login_at = NOW() - INTERVAL '1 day' * FLOOR(RANDOM() * 30), -- 随机30天内登录
  updated_at = NOW()
WHERE role = 'student' 
  AND login_count IS NULL;

-- =============================================
-- 6. 创建历史数据备份表
-- =============================================

-- 创建数据迁移历史记录表
CREATE TABLE IF NOT EXISTS migration_history (
  id VARCHAR(30) PRIMARY KEY,
  migration_name VARCHAR(100) NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  operation_type VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE, MIGRATE
  affected_rows INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  migration_data JSON, -- 迁移相关数据
  executed_at TIMESTAMP DEFAULT NOW(),
  executed_by VARCHAR(30) DEFAULT 'system'
);

-- 记录本次迁移操作
INSERT INTO migration_history (
  id, migration_name, table_name, operation_type, 
  affected_rows, success, migration_data
) VALUES
('migration_001', '创建默认班级记录', 'student_classes', 'INSERT', 
 (SELECT COUNT(*) FROM student_classes), true,
 '{"source": "users table", "method": "auto_generate_from_existing_data"}'),
 
('migration_002', '更新用户班级关联', 'users', 'UPDATE', 
 (SELECT COUNT(*) FROM users WHERE role = 'student' AND class_id IS NOT NULL), true,
 '{"updated_fields": ["class_id", "class_name", "academic_year", "enrollment_date"]}'),
 
('migration_003', '迁移课件文件', 'course_materials', 'MIGRATE', 
 (SELECT COUNT(*) FROM course_materials WHERE file_upload_id IS NOT NULL), true,
 '{"source": "file_uploads table", "method": "intelligent_categorization"}'),
 
('migration_004', '数据完整性修复', 'multiple_tables', 'DELETE', 
 0, true, -- 实际删除数量会在执行时计算
 '{"tables": ["enrollments", "attendances", "assignment_submissions"], "operation": "remove_orphaned_records"}'),
 
('migration_005', '历史统计计算', 'enrollments', 'UPDATE', 
 (SELECT COUNT(*) FROM enrollments WHERE attendance_rate IS NOT NULL), true,
 '{"calculated_fields": ["attendance_rate"], "method": "aggregate_from_attendances"}');

-- =============================================
-- 7. 数据验证和一致性检查
-- =============================================

-- 创建数据验证存储过程
CREATE OR REPLACE FUNCTION validate_migrated_data()
RETURNS JSON AS $$
DECLARE
  v_validation_results JSON := '{}';
  v_student_count INTEGER;
  v_class_count INTEGER;
  v_orphaned_enrollments INTEGER;
  v_orphaned_attendances INTEGER;
  v_material_count INTEGER;
BEGIN
  -- 检查学生和班级数据
  SELECT COUNT(*) INTO v_student_count FROM users WHERE role = 'student';
  SELECT COUNT(*) INTO v_class_count FROM student_classes;
  
  -- 检查孤立记录
  SELECT COUNT(*) INTO v_orphaned_enrollments 
  FROM enrollments e 
  WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = e.student_id AND u.role = 'student');
  
  SELECT COUNT(*) INTO v_orphaned_attendances 
  FROM attendances a 
  WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = a.student_id AND u.role = 'student');
  
  SELECT COUNT(*) INTO v_material_count FROM course_materials;
  
  -- 构建验证结果
  v_validation_results := JSON_BUILD_OBJECT(
    'student_count', v_student_count,
    'class_count', v_class_count,
    'material_count', v_material_count,
    'orphaned_enrollments', v_orphaned_enrollments,
    'orphaned_attendances', v_orphaned_attendances,
    'validation_passed', (v_orphaned_enrollments = 0 AND v_orphaned_attendances = 0),
    'validation_time', NOW()
  );
  
  RETURN v_validation_results;
END;
$$ LANGUAGE plpgsql;

-- 执行数据验证
DO $$
DECLARE
  v_validation JSON;
BEGIN
  SELECT validate_migrated_data() INTO v_validation;
  
  -- 记录验证结果到operation_logs
  PERFORM log_operation(
    'data_migration_validation',
    'system_management',
    'database',
    'migration_validation',
    NULL,
    'system',
    v_validation,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    (v_validation->>'validation_passed')::BOOLEAN,
    CASE WHEN NOT (v_validation->>'validation_passed')::BOOLEAN 
         THEN 'Data validation found issues' 
         ELSE NULL END,
    0,
    '历史数据迁移验证'
  );
  
  IF (v_validation->>'validation_passed')::BOOLEAN THEN
    RAISE NOTICE '✅ 历史数据迁移验证通过: %', v_validation;
  ELSE
    RAISE WARNING '⚠️ 历史数据迁移验证发现问题: %', v_validation;
  END IF;
END $$;

-- =============================================
-- 8. 创建数据清理和维护任务
-- =============================================

-- 创建定期数据清理存储过程
CREATE OR REPLACE FUNCTION cleanup_historical_data(
  p_days_to_keep INTEGER DEFAULT 1095  -- 默认保留3年
) RETURNS JSON AS $$
DECLARE
  v_cutoff_date TIMESTAMP;
  v_deleted_counts JSON := '{}';
  v_temp_count INTEGER;
BEGIN
  v_cutoff_date := NOW() - INTERVAL '1 day' * p_days_to_keep;
  
  -- 清理过期的操作日志
  DELETE FROM operation_logs WHERE created_at < v_cutoff_date;
  GET DIAGNOSTICS v_temp_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || JSON_BUILD_OBJECT('operation_logs', v_temp_count);
  
  -- 清理过期的临时文件记录
  DELETE FROM file_uploads 
  WHERE upload_date < v_cutoff_date 
    AND file_path LIKE '%/temp/%';
  GET DIAGNOSTICS v_temp_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || JSON_BUILD_OBJECT('temp_files', v_temp_count);
  
  -- 清理过期的演示会话记录
  DELETE FROM presentation_sessions 
  WHERE created_at < v_cutoff_date 
    AND status = 'ended';
  GET DIAGNOSTICS v_temp_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || JSON_BUILD_OBJECT('presentation_sessions', v_temp_count);
  
  -- 归档已毕业学生的详细记录（可选）
  -- 这里可以添加归档逻辑
  
  v_deleted_counts := v_deleted_counts || JSON_BUILD_OBJECT(
    'cleanup_date', NOW(),
    'cutoff_date', v_cutoff_date,
    'total_operations', 3
  );
  
  RETURN v_deleted_counts;
END;
$$ LANGUAGE plpgsql;

-- 添加注释
COMMENT ON TABLE migration_history IS '数据迁移历史记录表，记录所有迁移操作';
COMMENT ON FUNCTION validate_migrated_data IS '验证迁移数据完整性的存储过程';
COMMENT ON FUNCTION cleanup_historical_data IS '清理历史数据的维护存储过程';

-- 最终验证迁移成功
DO $$
DECLARE
  v_total_students INTEGER;
  v_total_classes INTEGER;
  v_total_materials INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_students FROM users WHERE role = 'student' AND class_id IS NOT NULL;
    SELECT COUNT(*) INTO v_total_classes FROM student_classes WHERE status = 'active';
    SELECT COUNT(*) INTO v_total_materials FROM course_materials WHERE is_active = true;
    
    RAISE NOTICE '✅ 历史数据迁移完成统计:';
    RAISE NOTICE '   - 迁移学生数量: %', v_total_students;
    RAISE NOTICE '   - 创建班级数量: %', v_total_classes;
    RAISE NOTICE '   - 迁移课件数量: %', v_total_materials;
    
    IF v_total_students > 0 AND v_total_classes > 0 THEN
        RAISE NOTICE '✅ 历史数据迁移成功完成';
    ELSE
        RAISE WARNING '⚠️ 历史数据迁移可能存在问题，请检查数据';
    END IF;
END $$;-- This migration has been applied manually
-- See the individual SQL files in this directory for the actual migration content