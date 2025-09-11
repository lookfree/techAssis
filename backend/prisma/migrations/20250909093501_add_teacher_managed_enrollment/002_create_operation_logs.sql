-- ================================================
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
END $$;