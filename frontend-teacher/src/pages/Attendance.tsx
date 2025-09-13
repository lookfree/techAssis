import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Table, 
  Space, 
  Select, 
  DatePicker, 
  Modal, 
  Tabs, 
  Statistic, 
  Progress,
  Tag,
  Avatar,
  message,
  Row,
  Col,
  Typography,
  Input,
  Form,
  Spin
} from 'antd';
import {
  UserOutlined,
  QrcodeOutlined,
  NumberOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  DownloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import SeatMap from '../components/SeatMap';
import AttendanceChart from '../components/AttendanceChart';
import CheckInManagement from '../components/CheckInManagement';
import { Course, Attendance as AttendanceType, AttendanceStatus, AttendanceMethod, Classroom } from '../types';
import { request } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import attendanceService, { CheckInMethod } from '../services/attendanceService';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

interface AttendanceSession {
  id: string;
  courseId: string;
  courseName: string;
  sessionDate: string;
  timeSlot: string;
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  attendanceRate: number;
  method: AttendanceMethod;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

const Attendance: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceType[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [createSessionVisible, setCreateSessionVisible] = useState(false);
  const [seatMapVisible, setSeatMapVisible] = useState(false);
  const [qrCodeVisible, setQrCodeVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('sessions');
  const { emitEvent, addEventListener } = useSocket();

  const [form] = Form.useForm();

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadAttendanceSessions();
    }
  }, [selectedCourse]);

  // 监听实时签到更新
  useEffect(() => {
    const cleanup = addEventListener('attendance_update', (data) => {
      if (data.courseId === selectedCourse) {
        message.success(`${data.studentName} 已签到`);
        loadAttendanceRecords(selectedSession?.id);
        loadAttendanceSessions(); // 刷新会话统计
      }
    });

    return cleanup;
  }, [selectedCourse, selectedSession, addEventListener]);

  const loadCourses = async () => {
    try {
      const response = await request.get('/courses');
      setCourses(response.data || []);
      if (response.data?.length > 0) {
        setSelectedCourse(response.data[0].id);
      }
    } catch (error) {
      message.error('加载课程失败');
    }
  };

  const loadAttendanceSessions = async () => {
    try {
      setLoading(true);
      const response = await request.get(`/attendance/sessions`, {
        params: { courseId: selectedCourse }
      });
      setAttendanceSessions(response.data || []);
    } catch (error) {
      message.error('加载签到记录失败');
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceRecords = async (sessionId?: string) => {
    if (!sessionId) return;
    
    try {
      const response = await request.get(`/attendance/records`, {
        params: { sessionId }
      });
      setAttendanceRecords(response.data || []);
    } catch (error) {
      message.error('加载签到详情失败');
    }
  };

  // 发起签到（使用统一服务）
  const handleCreateSession = async (values: any) => {
    try {
      if (!selectedCourse) return;

      // 将AttendanceMethod转换为CheckInMethod
      const methodMap: { [key in AttendanceMethod]: CheckInMethod } = {
        [AttendanceMethod.CODE]: CheckInMethod.VERIFICATION_CODE,
        [AttendanceMethod.QR_CODE]: CheckInMethod.QR_CODE,
        [AttendanceMethod.SEAT_MAP]: CheckInMethod.SEAT_MAP,
        [AttendanceMethod.MANUAL]: CheckInMethod.MANUAL,
        [AttendanceMethod.GEOFENCE]: CheckInMethod.VERIFICATION_CODE, // 暂时映射到验证码
        [AttendanceMethod.FACIAL_RECOGNITION]: CheckInMethod.VERIFICATION_CODE, // 暂时映射到验证码
      };

      const checkInMethod = methodMap[values.method as AttendanceMethod] || CheckInMethod.VERIFICATION_CODE;
      
      await attendanceService.startCheckIn({
        courseId: selectedCourse,
        checkInMethod,
        duration: values.duration || 30,
        sessionDate: values.sessionDate.format('YYYY-MM-DD'),
        description: `${courses.find(c => c.id === selectedCourse)?.name} - ${values.timeSlot}时段签到`
      });
      
      setCreateSessionVisible(false);
      form.resetFields();
      loadAttendanceSessions();
      
      // 如果是座位图签到，自动切换到座位图 tab
      if (values.method === AttendanceMethod.SEAT_MAP) {
        setActiveTab('seatmap');
      }
    } catch (error) {
      // 错误已在service中处理
    }
  };

  // 开始签到
  const handleStartAttendance = (session: AttendanceSession) => {
    setSelectedSession(session);
    
    switch (session.method) {
      case AttendanceMethod.SEAT_MAP:
        setSeatMapVisible(true);
        break;
      case AttendanceMethod.QR_CODE:
        setQrCodeVisible(true);
        break;
      case AttendanceMethod.CODE:
        // 生成验证码并显示
        generateVerificationCode(session);
        break;
      default:
        setActiveTab('records');
        loadAttendanceRecords(session.id);
    }
  };

  // 生成验证码
  const generateVerificationCode = async (session: AttendanceSession) => {
    try {
      const response = await request.post(`/attendance/generate-code`, {
        sessionId: session.id,
      });
      
      Modal.info({
        title: '签到验证码',
        content: (
          <div className="text-center py-4">
            <div className="text-4xl font-bold text-blue-500 mb-4">
              {response.code}
            </div>
            <Text>请将此验证码告知学生，有效期5分钟</Text>
          </div>
        ),
        width: 400,
      });
    } catch (error) {
      message.error('生成验证码失败');
    }
  };

  // 结束签到
  const handleEndAttendance = async (sessionId: string) => {
    try {
      await request.put(`/attendance/sessions/${sessionId}/end`);
      message.success('签到已结束');
      loadAttendanceSessions();
    } catch (error) {
      message.error('结束签到失败');
    }
  };

  // 导出签到数据
  const handleExportAttendance = async () => {
    try {
      const response = await request.get('/attendance/export', {
        params: { courseId: selectedCourse },
        responseType: 'blob',
      });
      
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-${selectedCourse}-${dayjs().format('YYYYMMDD')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success('签到数据导出成功');
    } catch (error) {
      message.error('导出签到数据失败');
    }
  };

  // 签到会话表格列定义
  const sessionColumns: ColumnsType<AttendanceSession> = [
    {
      title: '日期',
      dataIndex: 'sessionDate',
      key: 'sessionDate',
      render: (date) => dayjs(date).format('MM-DD'),
      width: 80,
    },
    {
      title: '时间段',
      dataIndex: 'timeSlot',
      key: 'timeSlot',
      width: 100,
    },
    {
      title: '签到方式',
      dataIndex: 'method',
      key: 'method',
      render: (method: AttendanceMethod) => {
        const methodMap = {
          [AttendanceMethod.MANUAL]: { label: '手动', icon: <UserOutlined />, color: 'default' },
          [AttendanceMethod.CODE]: { label: '验证码', icon: <NumberOutlined />, color: 'blue' },
          [AttendanceMethod.QR_CODE]: { label: '二维码', icon: <QrcodeOutlined />, color: 'green' },
          [AttendanceMethod.SEAT_MAP]: { label: '座位图', icon: <EnvironmentOutlined />, color: 'purple' },
          [AttendanceMethod.GEOFENCE]: { label: '地理围栏', icon: <EnvironmentOutlined />, color: 'orange' },
          [AttendanceMethod.FACIAL_RECOGNITION]: { label: '人脸识别', icon: <UserOutlined />, color: 'cyan' },
        };
        const config = methodMap[method] || methodMap[AttendanceMethod.MANUAL];
        return (
          <Tag icon={config.icon} color={config.color}>
            {config.label}
          </Tag>
        );
      },
      width: 120,
    },
    {
      title: '出勤率',
      key: 'attendanceRate',
      render: (_, record) => (
        <div className="flex items-center">
          <Progress
            percent={Math.round(record.attendanceRate)}
            size="small"
            className="flex-1 mr-2"
            strokeColor={record.attendanceRate >= 80 ? '#52c41a' : '#faad14'}
          />
          <Text className="text-sm">{Math.round(record.attendanceRate)}%</Text>
        </div>
      ),
      width: 150,
    },
    {
      title: '统计',
      key: 'stats',
      render: (_, record) => (
        <Space size="small">
          <Tag color="green">{record.presentCount}</Tag>
          <Tag color="orange">{record.lateCount}</Tag>
          <Tag color="red">{record.absentCount}</Tag>
        </Space>
      ),
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          active: { label: '进行中', color: 'processing' },
          completed: { label: '已完成', color: 'success' },
          cancelled: { label: '已取消', color: 'error' },
        };
        const config = statusMap[status as keyof typeof statusMap] || statusMap.completed;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
      width: 100,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'active' && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleStartAttendance(record)}
              >
                查看
              </Button>
              <Button
                size="small"
                onClick={() => handleEndAttendance(record.id)}
              >
                结束
              </Button>
            </>
          )}
          {record.status === 'completed' && (
            <Button
              type="link"
              size="small"
              onClick={() => {
                setSelectedSession(record);
                setActiveTab('records');
                loadAttendanceRecords(record.id);
              }}
            >
              查看详情
            </Button>
          )}
        </Space>
      ),
      width: 150,
      fixed: 'right',
    },
  ];

  // 签到记录表格列定义
  const recordColumns: ColumnsType<AttendanceType> = [
    {
      title: '学生',
      key: 'student',
      render: (_, record) => (
        <div className="flex items-center">
          <Avatar
            size="small"
            src={record.student?.avatar}
            className="mr-2"
          >
            {record.student?.firstName?.[0]}
          </Avatar>
          <div>
            <div className="font-medium">
              {record.student?.firstName} {record.student?.lastName}
            </div>
            <div className="text-sm text-gray-500">
              {record.student?.studentId}
            </div>
          </div>
        </div>
      ),
      width: 150,
    },
    {
      title: '签到状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: AttendanceStatus) => {
        const statusMap = {
          [AttendanceStatus.PRESENT]: { label: '正常', color: 'success', icon: <CheckCircleOutlined /> },
          [AttendanceStatus.LATE]: { label: '迟到', color: 'warning', icon: <ClockCircleOutlined /> },
          [AttendanceStatus.ABSENT]: { label: '缺勤', color: 'error', icon: <ExclamationCircleOutlined /> },
          [AttendanceStatus.EXCUSED]: { label: '请假', color: 'default', icon: <ExclamationCircleOutlined /> },
          [AttendanceStatus.LEAVE_EARLY]: { label: '早退', color: 'warning', icon: <ClockCircleOutlined /> },
        };
        const config = statusMap[status];
        return (
          <Tag icon={config.icon} color={config.color}>
            {config.label}
          </Tag>
        );
      },
      width: 100,
    },
    {
      title: '签到时间',
      dataIndex: 'checkInTime',
      key: 'checkInTime',
      render: (time) => time ? dayjs(time).format('HH:mm:ss') : '-',
      width: 100,
    },
    {
      title: '座位',
      dataIndex: 'seatId',
      key: 'seatId',
      render: (seatId) => seatId || '-',
      width: 80,
    },
    {
      title: '迟到时长',
      dataIndex: 'lateMinutes',
      key: 'lateMinutes',
      render: (minutes) => minutes ? `${minutes}分钟` : '-',
      width: 100,
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes) => notes || '-',
      ellipsis: true,
    },
  ];

  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 12 }}>
        <Title level={2}>📋 考勤管理</Title>
        <Text type="secondary">统一管理课程签到、查看学生考勤统计</Text>
      </div>

      {/* 课程选择和操作栏 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Space>
            <Select
              style={{ width: 200 }}
              placeholder="选择课程"
              value={selectedCourse}
              onChange={setSelectedCourse}
              options={courses.map(course => ({
                label: `${course.name} (${course.courseCode})`,
                value: course.id,
              }))}
            />
            <Button icon={<ReloadOutlined />} onClick={loadAttendanceSessions}>
              刷新
            </Button>
          </Space>
        </Col>
        <Col>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateSessionVisible(true)}
              disabled={!selectedCourse}
              size="large"
              style={{ 
                height: '48px', 
                fontSize: '18px', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '24px',
                fontWeight: 'bold',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s ease',
                padding: '0 32px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
              }}
            >
              🚀 发起智能签到
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportAttendance}
              disabled={!selectedCourse}
            >
              导出数据
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 主要内容区域 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} size="large">
        <TabPane tab="📋 签到记录" key="sessions">
          <Table
            columns={sessionColumns}
            dataSource={attendanceSessions}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1000 }}
          />
        </TabPane>
        
        <TabPane tab="👥 学生考勤" key="records">
          {selectedSession && (
            <Card className="mb-4" size="small">
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="总人数"
                    value={selectedSession.totalStudents}
                    prefix={<UserOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="出勤人数"
                    value={selectedSession.presentCount}
                    valueStyle={{ color: '#3f8600' }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="迟到人数"
                    value={selectedSession.lateCount}
                    valueStyle={{ color: '#cf1322' }}
                    prefix={<ClockCircleOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="出勤率"
                    value={selectedSession.attendanceRate}
                    precision={1}
                    suffix="%"
                    valueStyle={{ color: selectedSession.attendanceRate >= 80 ? '#3f8600' : '#cf1322' }}
                  />
                </Col>
              </Row>
            </Card>
          )}
          
          <Table
            columns={recordColumns}
            dataSource={attendanceRecords}
            rowKey="id"
            pagination={{ pageSize: 20 }}
            scroll={{ x: 800 }}
          />
        </TabPane>
        
        <TabPane tab="📊 统计分析" key="analytics">
          {selectedCourse && (
            <AttendanceChart 
              courseId={selectedCourse}
              courseName={courses.find(c => c.id === selectedCourse)?.name}
            />
          )}
        </TabPane>
        
        <TabPane tab="🪑 座位签到" key="seatmap">
          {selectedCourse && (
            <SeatMap 
              classroomId="classroom-1"
              courseId={selectedCourse}
              sessionDate={dayjs().format('YYYY-MM-DD')}
            />
          )}
        </TabPane>
      </Tabs>

      {/* 发起签到模态框 */}
      <Modal
        title="🚀 发起签到"
        open={createSessionVisible}
        onCancel={() => setCreateSessionVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateSession}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sessionDate"
                label="签到日期"
                rules={[{ required: true, message: '请选择签到日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="timeSlot"
                label="时间段"
                rules={[{ required: true, message: '请输入时间段' }]}
              >
                <Select
                  options={[
                    { label: '08:00-09:40', value: '08:00-09:40' },
                    { label: '10:00-11:40', value: '10:00-11:40' },
                    { label: '14:00-15:40', value: '14:00-15:40' },
                    { label: '16:00-17:40', value: '16:00-17:40' },
                    { label: '19:00-20:40', value: '19:00-20:40' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="method"
            label="签到方式"
            rules={[{ required: true, message: '请选择签到方式' }]}
          >
            <Select
              options={[
                { label: '验证码签到', value: AttendanceMethod.CODE },
                { label: '二维码签到', value: AttendanceMethod.QR_CODE },
                { label: '座位图签到', value: AttendanceMethod.SEAT_MAP },
                { label: '手动签到', value: AttendanceMethod.MANUAL },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="classroomId"
            label="教室"
            rules={[{ required: true, message: '请选择教室' }]}
          >
            <Select
              placeholder="选择教室"
              options={[
                { label: 'A101 - 阶梯教室', value: 'classroom1' },
                { label: 'B201 - 普通教室', value: 'classroom2' },
                { label: 'C301 - 实验室', value: 'classroom3' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 座位图模态框 */}
      <Modal
        title="座位图签到"
        open={seatMapVisible}
        onCancel={() => setSeatMapVisible(false)}
        footer={null}
        width="90%"
        style={{ top: 20 }}
      >
        {selectedSession && (
          <SeatMap
            classroomId="classroom1" // 这里应该从selectedSession获取
            courseId={selectedSession.courseId}
            sessionDate={selectedSession.sessionDate}
            timeSlot={selectedSession.timeSlot}
            readonly={false}
          />
        )}
      </Modal>
    </div>
  );
};

export default Attendance;
