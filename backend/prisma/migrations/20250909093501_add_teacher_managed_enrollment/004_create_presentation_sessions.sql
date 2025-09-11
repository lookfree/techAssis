-- ================================================
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
END $$;