// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Tabs, 
  Button, 
  Space, 
  Typography, 
  Tag, 
  Row, 
  Col, 
  Statistic, 
  List,
  Avatar,
  Progress,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Spin
} from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
  BookOutlined,
  EditOutlined,
  SettingOutlined,
  TeamOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  TrophyOutlined,
  FileOutlined
} from '@ant-design/icons';
import { request } from '../services/api';
import { Course, User, Attendance, Assignment, Grade, Classroom } from '../types';
import SeatMap from '../components/SeatMap';
import PPTViewer from '../components/PPTViewer';
import AttendanceChart from '../components/AttendanceChart';
import AssignmentManagement from '../components/AssignmentManagement';
import CheckInManagement from '../components/CheckInManagement';
import { attendanceService, CheckInMethod } from '../services/attendanceService';

const { Title, Text } = Typography;
const { TextArea } = Input;

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadCourseDetail(id);
    }
  }, [id]);

  const loadCourseDetail = async (courseId: string) => {
    setLoading(true);
    try {
      const response = await request.get<Course>(`/courses/${courseId}`);
      setCourse(response);
      console.log('Course data loaded:', response); // 调试输出
    } catch (error) {
      message.error('加载课程详情失败，使用演示数据');
      // 如果API失败，使用演示数据
      const mockCourse = {
        id: courseId,
        name: '高级软件工程',
        courseCode: 'CS401',
        credits: 3,
        description: '本课程涵盖高级软件开发方法论和实践',
        location: '教学楼A-101',
        schedule: '周一、周三 14:00-16:00',
        semester: '2024春季',
        academicYear: '2023-2024',
        enrollmentCount: 45,
        maxStudents: 50,
        color: '#1890ff',
        classroomBookings: [
          {
            id: 'booking-1',
            classroom: {
              id: 'classroom-1',
              name: 'A101智慧教室',
              location: '教学楼A栋1层',
              capacity: 50
            },
            startTime: '14:00',
            endTime: '16:00',
            dayOfWeek: 1
          }
        ]
      };
      setCourse(mockCourse as any);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Title level={3}>课程不存在</Title>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* 课程头部 */}
      <div style={{ marginBottom: 24 }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/courses')}
          style={{ marginBottom: 16 }}
        >
          返回课程列表
        </Button>
        
        <Card
          style={{
            background: `linear-gradient(135deg, ${course.color || '#1890ff'} 0%, ${course.color || '#1890ff'}cc 100%)`,
            color: 'white',
            border: 'none'
          }}
          bodyStyle={{ padding: '24px' }}
        >
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={2} style={{ color: 'white', margin: '0 0 8px 0' }}>
                {course.name}
              </Title>
              <Space>
                <Text style={{ color: 'white', opacity: 0.9, fontSize: 16 }}>
                  {course.courseCode}
                </Text>
                <Tag color="rgba(255,255,255,0.2)" style={{ color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
                  {course.credits} 学分
                </Tag>
              </Space>
            </Col>
            <Col>
              <Button type="primary" ghost icon={<EditOutlined />}>
                编辑课程
              </Button>
            </Col>
          </Row>

          <Row gutter={24} style={{ marginTop: 24 }}>
            <Col span={6}>
              <Statistic
                title="学生总数"
                value={course.enrollmentCount || 0}
                suffix={`/ ${course.maxStudents}`}
                prefix={<TeamOutlined />}
                valueStyle={{ color: 'white', fontSize: 20 }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="出勤率"
                value={85}
                suffix="%"
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: 'white', fontSize: 20 }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="作业数量"
                value={12}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: 'white', fontSize: 20 }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="平均分"
                value={78.5}
                precision={1}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: 'white', fontSize: 20 }}
              />
            </Col>
          </Row>
        </Card>
      </div>

      {/* 课程内容 */}
      <Card>
        <Tabs defaultActiveKey="overview" size="large" tabPosition="top">
          <Tabs.TabPane tab="📋 课程概览" key="overview">
            <CourseOverview course={course} />
          </Tabs.TabPane>
          <Tabs.TabPane tab="👥 学生管理" key="students">
            <CourseStudents courseId={course.id} />
          </Tabs.TabPane>
          <Tabs.TabPane tab="📊 考勤统计" key="attendance-stats">
            <AttendanceChart courseId={course.id} />
          </Tabs.TabPane>
          <Tabs.TabPane tab="🚀 发起签到" key="attendance-checkin">
            <CheckInManagement courseId={course.id} courseName={course.name} />
          </Tabs.TabPane>
          <Tabs.TabPane tab="🪑 座位签到" key="seat-checkin">
            <CourseDetailSeatMap course={course} />
          </Tabs.TabPane>
          <Tabs.TabPane tab="📝 作业管理" key="assignments">
            <CourseAssignments courseId={course.id} />
          </Tabs.TabPane>
          <Tabs.TabPane tab="📄 PPT管理" key="ppt">
            <CoursePPT courseId={course.id} />
          </Tabs.TabPane>
          <Tabs.TabPane tab="⚙️ 课程设置" key="settings">
            <CourseSettings course={course} />
          </Tabs.TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

// 课程概览
const CourseOverview: React.FC<{ course: Course }> = ({ course }) => {
  // 统一的签到处理
  const handleQuickCheckIn = async () => {
    try {
      await attendanceService.startCheckIn({
        courseId: course.id,
        checkInMethod: CheckInMethod.VERIFICATION_CODE,
        duration: 30,
        description: `${course.name} - 快速验证码签到`
      });
    } catch (error) {
      // 错误已在service中处理
    }
  };

  return (
    <Row gutter={[24, 24]}>
      <Col span={16}>
        <Card title="课程信息" extra={<Button type="link" icon={<EditOutlined />}>编辑</Button>}>
          <div style={{ marginBottom: 16 }}>
            <Text strong>课程描述：</Text>
            <div style={{ marginTop: 8, lineHeight: '1.6' }}>
              {course.description || '暂无课程描述'}
            </div>
          </div>
          
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary">上课地点：</Text>
                <Text style={{ marginLeft: 8 }}>{course.location || '未设置'}</Text>
              </div>
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary">上课时间：</Text>
                <Text style={{ marginLeft: 8 }}>{course.schedule || '未设置'}</Text>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary">学期：</Text>
                <Text style={{ marginLeft: 8 }}>{course.semester} {course.academicYear}</Text>
              </div>
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary">状态：</Text>
                <Tag color="success" style={{ marginLeft: 8 }}>进行中</Tag>
              </div>
            </Col>
          </Row>
        </Card>
      </Col>
      
      <Col span={8}>
        <Card title="快捷操作">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button block type="primary" icon={<TeamOutlined />}>
              管理学生
            </Button>
            <Button block icon={<CheckCircleOutlined />} onClick={handleQuickCheckIn}>
              🚀 快速签到
            </Button>
            <Button block icon={<FileTextOutlined />}>
              创建作业
            </Button>
            <Button block icon={<FileOutlined />}>
              PPT管理
            </Button>
            <Button block icon={<SettingOutlined />}>
              课程设置
            </Button>
          </Space>
        </Card>
      </Col>
    </Row>
  );
};

// 学生管理
const CourseStudents: React.FC<{ courseId: string }> = ({ courseId }) => {
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [importForm] = Form.useForm();

  useEffect(() => {
    loadStudents();
  }, [courseId]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const enrollments = await request.get<any[]>(`/courses/${courseId}/students`);
      // 从enrollment数据中提取student信息
      const studentList = enrollments.map((enrollment: any) => ({
        ...enrollment.student,
        // 添加一些默认的扩展字段，确保UI兼容
        major: enrollment.student.major || '未设置',
        grade: enrollment.student.grade || '未设置',
        attendanceRate: 0,
        averageScore: 0,
        lastAttendance: '-',
        status: 'active'
      }));
      setStudents(studentList);
      message.success('学生列表加载成功');
    } catch (error: any) {
      message.error(error.message || '加载学生列表失败，请稍后重试');
      console.error('Failed to load students:', error);
    } finally {
      setLoading(false);
    }
  };

  // 添加单个学生
  const handleAddStudent = async (values: any) => {
    try {
      const response = await request.post(`/courses/${courseId}/students`, values);
      
      setAddModalVisible(false);
      form.resetFields();
      message.success('学生添加成功');
      
      // 重新加载学生列表
      await loadStudents();
    } catch (error) {
      message.error('添加学生失败，请稍后重试');
      console.error('Failed to add student:', error);
    }
  };

  // 批量导入学生
  const handleImportStudents = async (values: any) => {
    setLoading(true);
    try {
      const { file, courseBinding } = values;
      
      // 解析文件内容（这里简化处理，实际应该解析Excel/CSV文件）
      const studentsToImport = [
        {
          studentId: '2021004',
          firstName: '赵',
          lastName: '六',
          email: 'zhaoliu@university.edu',
          phone: '13800138004',
          major: '软件工程',
          grade: '2021级'
        },
        {
          studentId: '2021005',
          firstName: '钱',
          lastName: '七',
          email: 'qianqi@university.edu',
          phone: '13800138005',
          major: '计算机科学与技术',
          grade: '2021级'
        }
      ];
      
      await request.post(`/courses/${courseId}/import-students`, {
        students: studentsToImport
      });
      
      // 重新加载学生列表
      await loadStudents();
      
      setImportModalVisible(false);
      importForm.resetFields();
      message.success(`成功导入 ${studentsToImport.length} 名学生`);
    } catch (error: any) {
      message.error(error.message || '导入学生失败，请稍后重试');
      console.error('Failed to import students:', error);
    } finally {
      setLoading(false);
    }
  };

  // 移除学生
  const handleRemoveStudent = async (studentId: string) => {
    try {
      await request.delete(`/courses/${courseId}/students/${studentId}`);
      // 重新加载学生列表
      await loadStudents();
      message.success('学生移除成功');
    } catch (error: any) {
      message.error(error.message || '移除学生失败，请稍后重试');
      console.error('Failed to remove student:', error);
    }
  };

  // 查看学生详情
  const handleViewStudent = (student: User) => {
    setSelectedStudent(student);
    setDetailModalVisible(true);
  };

  // 发起签到 - 使用统一服务
  const handleStartAttendance = async () => {
    try {
      await attendanceService.startCheckIn({
        courseId,
        checkInMethod: CheckInMethod.VERIFICATION_CODE,
        duration: 30,
        description: '学生管理页面发起的验证码签到'
      });
    } catch (error) {
      // 错误已在service中处理
    }
  };

  // 筛选学生
  const filteredStudents = students.filter(student => 
    `${student.firstName}${student.lastName}`.includes(searchText) ||
    (student.studentId || '').includes(searchText) ||
    (student.major || '').includes(searchText)
  );

  return (
    <div>
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>学生管理 ({students.length}人)</span>
            <Space>
              <Input.Search
                placeholder="搜索学生姓名/学号/专业"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 250 }}
                allowClear
              />
              <Button 
                type="primary" 
                icon={<CheckCircleOutlined />}
                onClick={handleStartAttendance}
              >
                🚀 发起签到
              </Button>
              <Button 
                type="primary" 
                icon={<TeamOutlined />}
                onClick={() => setImportModalVisible(true)}
              >
                批量导入
              </Button>
              <Button 
                type="primary" 
                icon={<UserOutlined />}
                onClick={() => setAddModalVisible(true)}
              >
                添加学生
              </Button>
            </Space>
          </div>
        }
      >
        {/* 统计信息 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Statistic
              title="总学生数"
              value={students.length}
              prefix={<TeamOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="平均出勤率"
              value={students.length > 0 ? (students.reduce((sum, s) => sum + (s as any).attendanceRate, 0) / students.length).toFixed(1) : 0}
              suffix="%"
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="平均成绩"
              value={students.length > 0 ? (students.reduce((sum, s) => sum + (s as any).averageScore, 0) / students.length).toFixed(1) : 0}
              precision={1}
              prefix={<TrophyOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="活跃学生"
              value={students.filter(s => (s as any).status === 'active').length}
              prefix={<UserOutlined />}
            />
          </Col>
        </Row>

        {/* 学生列表 */}
        <List
          loading={loading}
          dataSource={filteredStudents}
          pagination={{
            current: 1,
            pageSize: 10,
            total: filteredStudents.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 名学生`
          }}
          renderItem={(student) => (
            <List.Item
              actions={[
                <Button type="link" onClick={() => handleViewStudent(student)}>
                  查看详情
                </Button>,
                <Button type="link">
                  发送消息
                </Button>,
                <Button 
                  type="link" 
                  danger 
                  onClick={() => {
                    Modal.confirm({
                      title: '确认移除学生',
                      content: `确定要从课程中移除学生 ${student.firstName}${student.lastName} 吗？`,
                      onOk: () => handleRemoveStudent(student.id),
                    });
                  }}
                >
                  移除
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar 
                    src={(student as any).avatar} 
                    icon={<UserOutlined />}
                    size={50}
                  />
                }
                title={
                  <Space>
                    <span style={{ fontSize: 16, fontWeight: 'bold' }}>
                      {student.firstName}{student.lastName}
                    </span>
                    <Tag color="blue">{(student as any).studentId}</Tag>
                    {(student as any).status === 'active' ? (
                      <Tag color="success">正常</Tag>
                    ) : (
                      <Tag color="warning">异常</Tag>
                    )}
                  </Space>
                }
                description={
                  <div>
                    <div style={{ marginBottom: 8 }}>
                      <Space>
                        <Text type="secondary">专业：</Text>
                        <Text>{(student as any).major}</Text>
                        <Text type="secondary">年级：</Text>
                        <Text>{(student as any).grade}</Text>
                        <Text type="secondary">联系方式：</Text>
                        <Text>{student.email}</Text>
                      </Space>
                    </div>
                    <div>
                      <Space>
                        <Text type="secondary">出勤率：</Text>
                        <Progress 
                          percent={(student as any).attendanceRate} 
                          size="small" 
                          style={{ width: 100 }}
                          status={(student as any).attendanceRate >= 90 ? 'success' : (student as any).attendanceRate >= 70 ? 'normal' : 'exception'}
                        />
                        <Text type="secondary">平均分：</Text>
                        <Text strong style={{ color: (student as any).averageScore >= 80 ? '#52c41a' : (student as any).averageScore >= 60 ? '#1890ff' : '#ff4d4f' }}>
                          {(student as any).averageScore}
                        </Text>
                        <Text type="secondary">最后签到：</Text>
                        <Text>{(student as any).lastAttendance}</Text>
                      </Space>
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      {/* 添加学生对话框 */}
      <Modal
        title="添加学生"
        open={addModalVisible}
        onCancel={() => {
          setAddModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddStudent}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="studentId"
                label="学号"
                rules={[{ required: true, message: '请输入学号' }]}
              >
                <Input placeholder="请输入学号" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="firstName"
                label="姓"
                rules={[{ required: true, message: '请输入姓' }]}
              >
                <Input placeholder="姓" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="lastName"
                label="名"
                rules={[{ required: true, message: '请输入名' }]}
              >
                <Input placeholder="名" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="邮箱"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input placeholder="student@university.edu" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="手机号"
                rules={[{ required: true, message: '请输入手机号' }]}
              >
                <Input placeholder="手机号" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="major"
                label="专业"
                rules={[{ required: true, message: '请输入专业' }]}
              >
                <Input placeholder="如：计算机科学与技术" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="grade"
                label="年级"
                rules={[{ required: true, message: '请输入年级' }]}
              >
                <Select placeholder="选择年级">
                  <Select.Option value="2021级">2021级</Select.Option>
                  <Select.Option value="2022级">2022级</Select.Option>
                  <Select.Option value="2023级">2023级</Select.Option>
                  <Select.Option value="2024级">2024级</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                添加学生
              </Button>
              <Button onClick={() => {
                setAddModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量导入对话框 */}
      <Modal
        title="批量导入学生"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          importForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={importForm}
          layout="vertical"
          onFinish={handleImportStudents}
        >
          <Form.Item
            name="file"
            label="选择文件"
            rules={[{ required: true, message: '请选择导入文件' }]}
          >
            <div>
              <Button icon={<FileOutlined />} style={{ marginBottom: 16 }}>
                选择Excel/CSV文件
              </Button>
              <div style={{ marginBottom: 16, padding: 12, background: '#f0f8ff', borderRadius: 4 }}>
                <Text strong>文件格式要求：</Text>
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  <li>支持 .xlsx, .xls, .csv 格式</li>
                  <li>第一行为标题行：学号、姓名、邮箱、专业、年级、手机号</li>
                  <li>学号和姓名为必填项</li>
                  <li>单次最多导入500名学生</li>
                </ul>
              </div>
            </div>
          </Form.Item>

          <Form.Item name="courseBinding" valuePropName="checked">
            <Switch /> 
            <span style={{ marginLeft: 8 }}>自动绑定到当前课程</span>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                开始导入
              </Button>
              <Button onClick={() => {
                setImportModalVisible(false);
                importForm.resetFields();
              }}>
                取消
              </Button>
              <Button type="link" onClick={() => {
                // 下载模板文件
                message.info('模板下载功能开发中...');
              }}>
                下载模板
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 学生详情对话框 */}
      <Modal
        title="学生详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {selectedStudent && (
          <div>
            <Row gutter={24}>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <Avatar 
                    size={80} 
                    src={(selectedStudent as any).avatar} 
                    icon={<UserOutlined />} 
                  />
                  <div style={{ marginTop: 12 }}>
                    <Text strong style={{ fontSize: 18 }}>
                      {selectedStudent.firstName}{selectedStudent.lastName}
                    </Text>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Tag color="blue">{(selectedStudent as any).studentId}</Tag>
                  </div>
                </div>
              </Col>
              
              <Col span={18}>
                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ marginBottom: 16 }}>
                      <Text type="secondary">基本信息</Text>
                      <div style={{ marginTop: 8 }}>
                        <div><Text strong>专业：</Text>{(selectedStudent as any).major}</div>
                        <div><Text strong>年级：</Text>{(selectedStudent as any).grade}</div>
                        <div><Text strong>邮箱：</Text>{selectedStudent.email}</div>
                        <div><Text strong>手机：</Text>{(selectedStudent as any).phone}</div>
                      </div>
                    </div>
                  </Col>
                  
                  <Col span={12}>
                    <div style={{ marginBottom: 16 }}>
                      <Text type="secondary">学习数据</Text>
                      <div style={{ marginTop: 8 }}>
                        <div>
                          <Text strong>出勤率：</Text>
                          <Progress 
                            percent={(selectedStudent as any).attendanceRate} 
                            size="small" 
                            style={{ width: 120, marginLeft: 8 }}
                          />
                        </div>
                        <div><Text strong>平均成绩：</Text>{(selectedStudent as any).averageScore}</div>
                        <div><Text strong>最后签到：</Text>{(selectedStudent as any).lastAttendance}</div>
                        <div><Text strong>状态：</Text>
                          <Tag color={(selectedStudent as any).status === 'active' ? 'success' : 'warning'}>
                            {(selectedStudent as any).status === 'active' ? '正常' : '异常'}
                          </Tag>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};


// 作业管理
const CourseAssignments: React.FC<{ courseId: string }> = ({ courseId }) => {
  return (
    <div>
      <AssignmentManagement courseId={courseId} />
    </div>
  );
};

// 座位图  
// @ts-ignore
const CourseDetailSeatMap: React.FC<{ course: Course }> = ({ course }) => {
  const navigate = useNavigate();
  const [sessionStarted, setSessionStarted] = useState(false);

  const handleStartSession = async () => {
    // 检查是否有教室数据（包容性检查）
    // @ts-ignore
    const hasClassroom = ((course as any).classroomBookings && (course as any).classroomBookings.length > 0) || course?.location;
    
    if (!hasClassroom) {
      message.error('课程未绑定教室，无法开始座位签到');
      return;
    }

    try {
      await attendanceService.startCheckIn({
        courseId: course.id,
        checkInMethod: CheckInMethod.SEAT_MAP,
        duration: 30,
        description: `${course.name} - 座位图签到`
      });
      setSessionStarted(true);
    } catch (error) {
      // 错误已在service中处理
    }
  };

  // 检查是否有教室数据（包容性检查）  
  // @ts-ignore
  const hasClassroom = ((course as any).classroomBookings && (course as any).classroomBookings.length > 0) || course?.location;
  
  if (!hasClassroom) {
    return (
      <Card title="座位图管理">
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <FileOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
          </div>
          <div>该课程尚未绑定教室，请先在课程设置中绑定教室</div>
          <Button 
            type="primary" 
            style={{ marginTop: 16 }}
            onClick={() => navigate(`/courses/${course.id}/settings`)}
          >
            前往绑定教室
          </Button>
        </div>
      </Card>
    );
  }

  // @ts-ignore
  const classroomId = (course as any).classroomBookings?.[0]?.classroom?.id || 'default-classroom';

  return (
    <div>
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>座位图管理</span>
            <Space>
              <Button 
                type="primary" 
                icon={<CalendarOutlined />}
                onClick={handleStartSession}
                disabled={sessionStarted}
              >
                {sessionStarted ? '🟢 签到进行中' : '🚀 开始座位签到'}
              </Button>
            </Space>
          </div>
        }
        style={{ marginBottom: 24 }}
      >
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Text strong>教室：</Text>
            {/* @ts-ignore */}
            <Text>{(course as any).classroomBookings?.[0]?.classroom?.name || course.location || '智慧教室'}</Text>
            {/* @ts-ignore */}
            <Text type="secondary">({(course as any).classroomBookings?.[0]?.classroom?.location || '教学楼'})</Text>
            {sessionStarted && (
              <Tag color="success" icon={<CheckCircleOutlined />}>
                签到进行中
              </Tag>
            )}
          </Space>
        </div>
      </Card>

      <SeatMap 
        classroomId={classroomId}
        courseId={course.id}
        sessionDate={new Date().toISOString().split('T')[0]}
        timeSlot="1"
        readonly={false}
      />
    </div>
  );
};

// PPT管理
const CoursePPT: React.FC<{ courseId: string }> = ({ courseId }) => {
  return (
    <div style={{ padding: '0 24px' }}>
      <PPTViewer courseId={courseId} />
    </div>
  );
};

// 课程设置
const CourseSettings: React.FC<{ course: Course }> = ({ course }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue(course);
  }, [course, form]);

  return (
    <Card title="课程设置">
      <Form form={form} layout="vertical">
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
        
        <Form.Item>
          <Button type="primary">保存设置</Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default CourseDetail;