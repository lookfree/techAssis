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
END $$;