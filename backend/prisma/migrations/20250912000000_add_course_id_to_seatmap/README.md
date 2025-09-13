# 座位管理系统多课程支持迁移

## 迁移目的
支持同一教室在不同时间段被不同课程使用的场景。

## 主要改动
1. 添加 `course_id` 字段到 `seat_maps` 表
2. 更新唯一性约束以支持多课程隔离

## 使用场景示例

### 场景1：同一天不同时间段
- 教室：A101
- 周一 08:00-10:00：数据结构课程（course_id: cs101）
- 周一 14:00-16:00：算法分析课程（course_id: cs102）

数据示例：
```sql
-- 上午的数据结构课
INSERT INTO seat_maps (classroom_id, course_id, seat_number, session_date, session_number, student_id)
VALUES ('classroom_a101', 'cs101', 'A1', '2025-09-16', '0800', '20210001');

-- 下午的算法分析课（同一座位，不同课程）
INSERT INTO seat_maps (classroom_id, course_id, seat_number, session_date, session_number, student_id)
VALUES ('classroom_a101', 'cs102', 'A1', '2025-09-16', '1400', '20210002');
```

### 场景2：周期性课程
每周一的数据结构课，每次课程都是独立的座位记录：
- 2025-09-09 周一：第1次课
- 2025-09-16 周一：第2次课
- 2025-09-23 周一：第3次课

每次课程的座位选择都是独立的，学生可以选择不同的座位。

## 字段说明
- `classroom_id`: 教室ID
- `course_id`: 课程ID（新增）
- `session_date`: 具体日期（如 2025-09-16）
- `session_number`: 时间段标识（如 "0800" 表示8:00开始，"1400" 表示14:00开始）
- `row`, `column`: 座位位置
- `student_id`: 学生学号

## 唯一性保证
组合唯一键：`(classroom_id, course_id, row, column, session_date, session_number)`

这确保了：
- 同一教室的同一座位
- 在同一天的同一时间段
- 对于同一门课程
- 只能被一个学生占用

## 查询示例

### 查询某个课程某天的座位情况
```sql
SELECT * FROM seat_maps 
WHERE classroom_id = 'classroom_a101' 
  AND course_id = 'cs101'
  AND session_date = '2025-09-16'
  AND session_number = '0800';
```

### 查询某个教室某天的所有课程座位情况
```sql
SELECT * FROM seat_maps 
WHERE classroom_id = 'classroom_a101' 
  AND session_date = '2025-09-16'
ORDER BY session_number, course_id;
```