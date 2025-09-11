import React, { useState, useEffect } from 'react';
// Force recompilation to clear TypeScript cache
import { Routes, Route } from 'react-router-dom';
import { 
  Button, 
  Card, 
  List, 
  Avatar, 
  Space, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  Switch,
  Upload,
  ColorPicker,
  Row,
  Col,
  Statistic,
  Progress,
  Typography,
  Divider,
  Tooltip,
  Dropdown,
  MenuProps,
  TimePicker,
  InputNumber,
  message
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  BookOutlined,
  CalendarOutlined,
  SettingOutlined,
  MoreOutlined,
  EyeOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { request } from '../services/api';
import { Course, CourseStatus, Semester, User, Classroom, ClassroomType } from '../types';
import CourseDetail from './CourseDetail';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const Courses: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<CourseList />} />
      <Route path="/:id/*" element={<CourseDetail />} />
    </Routes>
  );
};

const CourseList: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [classroomModalVisible, setClassroomModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [availableClassrooms, setAvailableClassrooms] = useState<Classroom[]>([]);
  const [form] = Form.useForm();
  const [classroomForm] = Form.useForm();

  useEffect(() => {
    loadCourses();
    loadClassrooms();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const response = await request.get<{ courses: Course[], total: number }>('/courses/my-courses');
      setCourses(response?.courses || []);
    } catch (error) {
      message.error('加载课程失败');
    } finally {
      setLoading(false);
    }
  };

  const loadClassrooms = async () => {
    try {
      const response = await request.get<Classroom[]>('/classrooms');
      setClassrooms(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('加载教室失败:', error);
    }
  };

  const loadAvailableClassrooms = async () => {
    try {
      // 获取所有教室
      const response = await request.get<Classroom[]>('/classrooms');
      const allClassrooms = Array.isArray(response) ? response : [];
      
      // 过滤掉已经绑定课程的教室（courseId不为空的教室）
      const availableClassrooms = allClassrooms.filter(classroom => !classroom.courseId);
      setAvailableClassrooms(availableClassrooms);
    } catch (error) {
      console.error('加载可用教室失败:', error);
      message.error('加载可用教室失败');
    }
  };

  const handleCreate = () => {
    setEditingCourse(null);
    form.resetFields();
    form.setFieldsValue({
      semester: Semester.FALL,
      academicYear: new Date().getFullYear().toString(),
      status: CourseStatus.ACTIVE,
      attendanceEnabled: true,
      assignmentEnabled: true,
      credits: 3,
      maxStudents: 50,
    });
    setModalVisible(true);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    form.setFieldsValue({
      ...course,
      dateRange: course.startDate && course.endDate ? 
        [dayjs(course.startDate), dayjs(course.endDate)] : undefined,
    });
    setModalVisible(true);
  };

  const handleDelete = (course: Course) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除课程"${course.name}"吗？此操作不可撤销。`,
      onOk: async () => {
        try {
          await request.delete(`/courses/${course.id}`);
          message.success('删除成功');
          loadCourses();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const { dateRange, ...formData } = values;
      
      if (dateRange) {
        formData.startDate = dateRange[0].toISOString();
        formData.endDate = dateRange[1].toISOString();
      }

      if (editingCourse) {
        await request.put(`/courses/${editingCourse.id}`, formData);
        message.success('更新成功');
      } else {
        await request.post('/courses', formData);
        message.success('创建成功');
      }

      setModalVisible(false);
      loadCourses();
    } catch (error) {
      message.error(editingCourse ? '更新失败' : '创建失败');
    }
  };

  const handleBindClassroom = (course: Course) => {
    setSelectedCourse(course);
    loadAvailableClassrooms();
    
    // 如果课程已经绑定了教室，预填表单信息
    if (course.classroomBookings && course.classroomBookings.length > 0) {
      const booking = course.classroomBookings[0];
      const startTime = booking.startTime ? dayjs(booking.startTime) : dayjs().hour(8).minute(0);
      const endTime = booking.endTime ? dayjs(booking.endTime) : dayjs().hour(18).minute(0);
      
      classroomForm.setFieldsValue({
        classroomId: booking.classroomId,
        startTime: startTime,
        endTime: endTime,
        recurring: booking.recurring !== undefined ? booking.recurring : true,
        dayOfWeek: booking.dayOfWeek || 1 // 从booking获取或默认星期一
      });
    } else {
      // 重置表单为默认值
      classroomForm.setFieldsValue({
        classroomId: undefined,
        startTime: dayjs().hour(8).minute(0),
        endTime: dayjs().hour(18).minute(0),
        recurring: true,
        dayOfWeek: 1
      });
    }
    
    setClassroomModalVisible(true);
  };

  const handleClassroomSubmit = async () => {
    try {
      const values = await classroomForm.validateFields();
      
      // 调试：检查表单值
      console.log('[DEBUG] 表单值:', values);
      
      // 时间验证
      if (values.startTime && values.endTime) {
        const startHour = values.startTime.hour() * 60 + values.startTime.minute();
        const endHour = values.endTime.hour() * 60 + values.endTime.minute();
        
        if (endHour <= startHour) {
          message.error('结束时间必须晚于开始时间');
          return;
        }
      }
      
      // 构建时间字符串 (ISO格式)
      const today = new Date();
      const startTime = values.startTime ? 
        new Date(today.getFullYear(), today.getMonth(), today.getDate(), 
                values.startTime.hour(), values.startTime.minute()).toISOString() :
        new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0).toISOString();
      
      const endTime = values.endTime ? 
        new Date(today.getFullYear(), today.getMonth(), today.getDate(), 
                values.endTime.hour(), values.endTime.minute()).toISOString() :
        new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0).toISOString();
      
      // 调试：检查构建的时间
      console.log('[DEBUG] 构建的时间:', { startTime, endTime });

      await request.post(`/classrooms/${values.classroomId}/bind-course`, {
        courseId: selectedCourse?.id,
        startTime,
        endTime,
        recurring: values.recurring || false,
        dayOfWeek: values.dayOfWeek || 1
      });
      message.success('教室绑定成功');
      setClassroomModalVisible(false);
      classroomForm.resetFields();
      // 重新加载课程和教室数据
      await Promise.all([loadCourses(), loadClassrooms()]);
    } catch (error) {
      message.error('教室绑定失败');
    }
  };

  const handleStartClass = async (course: Course) => {
    try {
      const response = await request.post('/classrooms/start-class', {
        courseId: course.id
      });
      message.success('开始上课成功');
      console.log('开始上课响应:', response);
      // 这里可以跳转到签到页面或显示座位图
      window.open(`/courses/${course.id}/attendance`, '_blank');
    } catch (error) {
      message.error('开始上课失败，请先绑定教室');
    }
  };

  const getStatusColor = (status: CourseStatus) => {
    switch (status) {
      case CourseStatus.ACTIVE:
        return 'success';
      case CourseStatus.COMPLETED:
        return 'default';
      case CourseStatus.ARCHIVED:
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: CourseStatus) => {
    switch (status) {
      case CourseStatus.ACTIVE:
        return '进行中';
      case CourseStatus.COMPLETED:
        return '已完成';
      case CourseStatus.ARCHIVED:
        return '已归档';
      default:
        return status;
    }
  };

  const getSemesterText = (semester: Semester) => {
    switch (semester) {
      case Semester.SPRING:
        return '春季学期';
      case Semester.FALL:
        return '秋季学期';
      case Semester.SUMMER:
        return '夏季学期';
      case Semester.WINTER:
        return '冬季学期';
      default:
        return semester;
    }
  };

  const getDayOfWeekText = (dayOfWeek?: number) => {
    if (!dayOfWeek) return '';
    const days = ['', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
    return days[dayOfWeek] || '';
  };

  const getCourseActions = (course: Course): MenuProps['items'] => [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: '查看详情',
      onClick: () => window.open(`/courses/${course.id}`, '_blank'),
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '编辑',
      onClick: () => handleEdit(course),
    },
    {
      type: 'divider',
    },
    {
      key: 'bind-classroom',
      icon: <EnvironmentOutlined />,
      label: course.classroomBookings && course.classroomBookings.length > 0 ? '更换教室' : '绑定教室',
      onClick: () => handleBindClassroom(course),
    },
    {
      key: 'start-class',
      icon: <TeamOutlined />,
      label: '开始上课',
      onClick: () => handleStartClass(course),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除',
      danger: true,
      onClick: () => handleDelete(course),
    },
  ];

  const renderCourseCard = (course: Course) => (
    <Card
      key={course.id}
      hoverable
      style={{ marginBottom: 16 }}
      bodyStyle={{ padding: 0 }}
    >
      <div 
        style={{
          background: course.color || '#1890ff',
          padding: '16px 24px',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Title level={4} style={{ color: 'white', margin: '0 0 8px 0' }}>
              {course.name}
            </Title>
            <Text style={{ color: 'white', opacity: 0.9 }}>
              {course.courseCode}
            </Text>
          </div>
          <Dropdown menu={{ items: getCourseActions(course) }} trigger={['click']}>
            <Button 
              type="text" 
              icon={<MoreOutlined />} 
              style={{ color: 'white' }}
            />
          </Dropdown>
        </div>
      </div>

      <div style={{ padding: '16px 24px' }}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Space wrap>
              <Tag color={getStatusColor(course.status)}>
                {getStatusText(course.status)}
              </Tag>
              <Tag>
                {getSemesterText(course.semester)} {course.academicYear}
              </Tag>
              <Tag>
                {course.credits} 学分
              </Tag>
            </Space>
          </Col>

          <Col span={24}>
            <div style={{ color: '#666', fontSize: 14, lineHeight: '22px' }}>
              {course.description}
            </div>
          </Col>

          <Col span={24}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="学生数量"
                  value={course.enrollmentCount || 0}
                  suffix={`/ ${course.maxStudents}`}
                  prefix={<TeamOutlined />}
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>
                    <EnvironmentOutlined style={{ marginRight: 4 }} />
                    {course.classroomBookings && course.classroomBookings.length > 0 
                      ? `${course.classroomBookings[0].classroom.name} (${course.classroomBookings[0].classroom.location || '位置未知'})`
                      : course.location || '未绑定教室'}
                  </div>
                  <div style={{ color: '#999', fontSize: 12 }}>教室位置</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    {course.classroomBookings && course.classroomBookings.length > 0 && course.classroomBookings[0].startTime
                      ? `${getDayOfWeekText(course.classroomBookings[0].dayOfWeek)} ${new Date(course.classroomBookings[0].startTime).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}-${new Date(course.classroomBookings[0].endTime).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}`
                      : course.schedule || '未设置'}
                  </div>
                  <div style={{ color: '#999', fontSize: 12 }}>上课时间</div>
                </div>
              </Col>
            </Row>
          </Col>

          <Col span={24}>
            <Space>
              <Button type="primary" onClick={() => window.open(`/courses/${course.id}`)}>
                <EyeOutlined /> 进入课程
              </Button>
              <Button 
                type="primary" 
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                onClick={() => handleStartClass(course)}
              >
                <TeamOutlined /> 开始上课
              </Button>
              <Button onClick={() => handleEdit(course)}>
                <EditOutlined /> 编辑
              </Button>
              <Button onClick={() => handleBindClassroom(course)}>
                <EnvironmentOutlined /> 
                {course.classroomBookings && course.classroomBookings.length > 0 ? '更换教室' : '绑定教室'}
              </Button>
            </Space>
          </Col>
        </Row>
      </div>
    </Card>
  );

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>我的课程</Title>
          <Text type="secondary">管理您的所有课程</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          创建课程
        </Button>
      </div>

      <List
        loading={loading}
        dataSource={courses}
        renderItem={renderCourseCard}
        locale={{
          emptyText: (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <BookOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
              <div style={{ fontSize: 16, color: '#999' }}>暂无课程</div>
              <div style={{ fontSize: 14, color: '#ccc', marginTop: 8 }}>
                点击"创建课程"按钮开始创建您的第一门课程
              </div>
            </div>
          )
        }}
      />

      <Modal
        title={editingCourse ? '编辑课程' : '创建课程'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 20 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="课程名称"
                rules={[{ required: true, message: '请输入课程名称' }]}
              >
                <Input placeholder="请输入课程名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="courseCode"
                label="课程代码"
                rules={[{ required: true, message: '请输入课程代码' }]}
              >
                <Input placeholder="请输入课程代码" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="课程描述"
          >
            <TextArea rows={3} placeholder="请输入课程描述" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="credits"
                label="学分"
                rules={[{ required: true, message: '请输入学分' }]}
              >
                <Input type="number" min={1} max={10} placeholder="学分" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="semester"
                label="学期"
                rules={[{ required: true, message: '请选择学期' }]}
              >
                <Select placeholder="请选择学期">
                  <Option value={Semester.SPRING}>春季学期</Option>
                  <Option value={Semester.FALL}>秋季学期</Option>
                  <Option value={Semester.SUMMER}>夏季学期</Option>
                  <Option value={Semester.WINTER}>冬季学期</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="academicYear"
                label="学年"
                rules={[{ required: true, message: '请输入学年' }]}
              >
                <Input placeholder="如: 2024" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="location" label="上课地点">
                <Input placeholder="请输入上课地点" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="schedule" label="上课时间">
                <Input placeholder="如: 周一 1-2节" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="maxStudents" label="最大学生数">
                <Input type="number" min={1} placeholder="最大学生数" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="color" label="课程颜色">
                <ColorPicker showText />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="dateRange" label="课程时间">
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="attendanceEnabled" valuePropName="checked" label="启用考勤">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="assignmentEnabled" valuePropName="checked" label="启用作业">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={selectedCourse?.classroomBookings && selectedCourse?.classroomBookings.length > 0 ? '更换教室' : '绑定教室'}
        open={classroomModalVisible}
        onCancel={() => {
          setClassroomModalVisible(false);
          classroomForm.resetFields();
        }}
        onOk={handleClassroomSubmit}
        width={600}
        destroyOnClose
      >
        <Form
          form={classroomForm}
          layout="vertical"
          style={{ marginTop: 20 }}
          initialValues={{
            startTime: dayjs().hour(8).minute(0),
            endTime: dayjs().hour(18).minute(0),
            recurring: true,
            dayOfWeek: 1
          }}
        >
          {/* 显示当前绑定的教室信息 */}
          {selectedCourse?.classroomBookings && selectedCourse.classroomBookings.length > 0 && (
            <div style={{ 
              marginBottom: 24, 
              padding: 16, 
              backgroundColor: '#f6f6f6', 
              borderRadius: 8,
              border: '1px solid #d9d9d9'
            }}>
              <div style={{ fontWeight: 500, marginBottom: 8, color: '#666' }}>
                📍 当前绑定的教室
              </div>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#1890ff' }}>
                {selectedCourse.classroomBookings[0].classroom.name}
              </div>
              <div style={{ color: '#999', fontSize: 14 }}>
                📍 {selectedCourse.classroomBookings[0].classroom.location || '位置未设置'} • 
                容量 {selectedCourse.classroomBookings[0].classroom.capacity} 人
              </div>
              {selectedCourse.classroomBookings[0].startTime && (
                <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                  📅 {getDayOfWeekText(selectedCourse.classroomBookings[0].dayOfWeek)} {' '}
                  ⏰ {new Date(selectedCourse.classroomBookings[0].startTime).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})} - {new Date(selectedCourse.classroomBookings[0].endTime).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}
                  {selectedCourse.classroomBookings[0].recurring && <span> (循环预订)</span>}
                </div>
              )}
            </div>
          )}

          <Form.Item
            name="classroomId"
            label="选择教室"
            rules={[{ required: true, message: '请选择教室' }]}
          >
            <Select placeholder="请选择要绑定的教室">
              {availableClassrooms.map(classroom => (
                <Option key={classroom.id} value={classroom.id}>
                  {classroom.name} - {classroom.location} (容量: {classroom.capacity}人)
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Divider>上课时间设置</Divider>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startTime"
                label="上课开始时间"
                rules={[{ required: true, message: '请选择开始时间' }]}
              >
                <TimePicker
                  format="HH:mm"
                  placeholder="选择开始时间"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endTime"
                label="上课结束时间"
                rules={[
                  { required: true, message: '请选择结束时间' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const startTime = getFieldValue('startTime');
                      if (!value || !startTime) {
                        return Promise.resolve();
                      }
                      
                      const startMinutes = startTime.hour() * 60 + startTime.minute();
                      const endMinutes = value.hour() * 60 + value.minute();
                      
                      if (endMinutes <= startMinutes) {
                        return Promise.reject(new Error('结束时间必须晚于开始时间'));
                      }
                      
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <TimePicker
                  format="HH:mm"
                  placeholder="选择结束时间"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dayOfWeek"
                label="星期几上课"
                rules={[{ required: true, message: '请选择星期几' }]}
              >
                <Select placeholder="选择星期几">
                  <Option value={1}>星期一</Option>
                  <Option value={2}>星期二</Option>
                  <Option value={3}>星期三</Option>
                  <Option value={4}>星期四</Option>
                  <Option value={5}>星期五</Option>
                  <Option value={6}>星期六</Option>
                  <Option value={7}>星期日</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="recurring"
                label="循环预订"
                valuePropName="checked"
              >
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
          </Row>
          
          <div style={{ color: '#666', fontSize: 12 }}>
            <p>绑定说明：</p>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li>选择教室后，该课程将与教室绑定</li>
              <li>绑定后可以使用座位图签到功能</li>
              <li>时间独占性：同一时间段内教室只能被一个课程使用</li>
              <li>循环预订：每周固定时间自动预订教室</li>
            </ul>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Courses;