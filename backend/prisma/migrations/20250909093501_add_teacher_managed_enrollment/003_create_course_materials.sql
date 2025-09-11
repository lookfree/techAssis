-- ================================================
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
END $$;