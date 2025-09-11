import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Table,
  Modal,
  Form,
  Select,
  DatePicker,
  Tag,
  Space,
  message,
  Tooltip,
  Progress,
  Tabs,
  Statistic,
  Typography,
  QRCode,
  Alert,
  List,
  Avatar,
  Input,
  Switch,
  Divider
} from 'antd';
import {
  QrcodeOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  StopOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  PlusOutlined,
  BarChartOutlined,
  TeamOutlined,
  DownloadOutlined,
  ScanOutlined,
  NumberOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { request } from '../../services/api';
import attendanceService, { CheckInMethod } from '../../services/attendanceService';

const { Option } = Select;
const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { TextArea } = Input;

interface CheckInSession {
  id: string;
  courseId: string;
  sessionNumber: number;
  sessionDate: string;
  status: 'scheduled' | 'active' | 'closed';
  checkInMethod: CheckInMethod;
  duration: number;
  verificationCode?: string;
  qrCodeUrl?: string;
  location?: any;
  attendanceRecords: AttendanceRecord[];
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  sessionId: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  checkInTime?: string;
  checkInMethod?: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string;
    avatar?: string;
  };
}

interface Course {
  id: string;
  name: string;
  courseCode: string;
}

interface CheckInManagementProps {
  courseId?: string;
  courseName?: string;
}

const CheckInManagement: React.FC<CheckInManagementProps> = ({ courseId, courseName }) => {
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<CheckInSession[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeSession, setActiveSession] = useState<CheckInSession | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [sessionDetailVisible, setSessionDetailVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CheckInSession | null>(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('sessions');
  const [todaySession, setTodaySession] = useState<CheckInSession | null>(null);

  useEffect(() => {
    loadSessions();
    loadCourses();
    loadTodaySession();
  }, [courseId]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      if (courseId) {
        const response = await request.get(`/attendance/sessions/${courseId}`);
        setSessions(response);
      }
    } catch (error) {
      message.error('加载签到会话失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const response = await request.get('/courses/teacher');
      setCourses(response.courses || response);
    } catch (error) {
      console.error('加载课程列表失败:', error);
    }
  };

  const loadTodaySession = async () => {
    try {
      if (courseId) {
        const response = await request.get(`/attendance/sessions/today/${courseId}`);
        setTodaySession(response);
      }
    } catch (error) {
      // 今日无签到会话，正常情况
      setTodaySession(null);
    }
  };

  const startCheckIn = async (values: any) => {
    try {
      if (!courseId) return;
      
      await attendanceService.startCheckIn({
        courseId,
        checkInMethod: values.checkInMethod || CheckInMethod.VERIFICATION_CODE,
        duration: values.duration || 30,
        description: values.description
      });
      
      setCreateModalVisible(false);
      form.resetFields();
      loadSessions();
      loadTodaySession();
    } catch (error) {
      // 错误已在service中处理
    }
  };

  const endCheckIn = async (sessionId: string) => {
    try {
      await attendanceService.endCheckIn(sessionId);
      loadSessions();
      loadTodaySession();
    } catch (error) {
      // 错误已在service中处理
    }
  };

  const updateAttendanceStatus = async (sessionId: string, studentId: string, status: string) => {
    try {
      await attendanceService.updateAttendanceRecord(sessionId, studentId, status);
      loadSessions();
      if (selectedSession) {
        const updatedSession = sessions.find(s => s.id === selectedSession.id);
        setSelectedSession(updatedSession || null);
      }
    } catch (error) {
      // 错误已在service中处理
    }
  };

  const batchUpdateAttendance = async (attendanceIds: string[], status: string) => {
    try {
      await request.post('/attendance/batch-update', {
        attendanceIds,
        status,
        notes: `批量设置为${getStatusText(status)}`
      });
      message.success('批量更新成功');
      loadSessions();
    } catch (error) {
      message.error('批量更新失败');
    }
  };

  const manualCheckIn = async (sessionId: string, studentId: string, status: string) => {
    try {
      // 从sessionId解析出课程ID和节次
      const sessionParts = sessionId.replace('session-', '').split('-');
      const sessionNumber = parseInt(sessionParts[3]);

      await request.post('/attendance/manual-checkin', {
        courseId,
        studentId,
        sessionNumber,
        status,
        notes: '教师手动签到'
      });
      
      message.success('手动签到成功');
      loadSessions();
    } catch (error) {
      message.error('手动签到失败');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      present: 'green',
      late: 'orange',
      absent: 'red',
      excused: 'blue'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: { [key: string]: string } = {
      present: '出勤',
      late: '迟到',
      absent: '缺勤',
      excused: '请假'
    };
    return texts[status] || status;
  };

  const getMethodText = (method: CheckInMethod) => {
    return attendanceService.getMethodIcon(method) + ' ' + {
      [CheckInMethod.QR_CODE]: '二维码签到',
      [CheckInMethod.VERIFICATION_CODE]: '验证码签到',
      [CheckInMethod.SEAT_MAP]: '座位图签到',
      [CheckInMethod.MANUAL]: '手动签到'
    }[method] || method;
  };

  const getMethodIcon = (method: CheckInMethod) => {
    const icons: { [key in CheckInMethod]: React.ReactNode } = {
      [CheckInMethod.QR_CODE]: <QrcodeOutlined />,
      [CheckInMethod.VERIFICATION_CODE]: <NumberOutlined />,
      [CheckInMethod.SEAT_MAP]: <EnvironmentOutlined />,
      [CheckInMethod.MANUAL]: <UserOutlined />
    };
    return icons[method] || <UserOutlined />;
  };

  const sessionColumns = [
    {
      title: '节次',
      dataIndex: 'sessionNumber',
      key: 'sessionNumber',
      width: 80,
      render: (num: number) => `第${num}次`,
    },
    {
      title: '日期时间',
      dataIndex: 'sessionDate',
      key: 'sessionDate',
      render: (date: string) => (
        <div>
          <div>{dayjs(date).format('YYYY-MM-DD')}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {dayjs(date).format('HH:mm')}
          </div>
        </div>
      ),
    },
    {
      title: '签到方式',
      dataIndex: 'checkInMethod',
      key: 'checkInMethod',
      width: 120,
      render: (method: CheckInMethod) => (
        <Space>
          {getMethodIcon(method)}
          {getMethodText(method)}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig: { [key: string]: { color: string; text: string; icon: React.ReactNode } } = {
          scheduled: { color: 'default', text: '未开始', icon: <CalendarOutlined /> },
          active: { color: 'blue', text: '进行中', icon: <PlayCircleOutlined /> },
          closed: { color: 'green', text: '已结束', icon: <StopOutlined /> }
        };
        const config = statusConfig[status] || { color: 'default', text: status, icon: <CalendarOutlined /> };
        return (
          <Space>
            {config.icon}
            <Tag color={config.color}>{config.text}</Tag>
          </Space>
        );
      },
    },
    {
      title: '出勤统计',
      key: 'attendance',
      render: (_: any, record: CheckInSession) => {
        const present = record.attendanceRecords?.filter(r => r.status === 'present').length || 0;
        const late = record.attendanceRecords?.filter(r => r.status === 'late').length || 0;
        const absent = record.attendanceRecords?.filter(r => r.status === 'absent').length || 0;
        const total = record.attendanceRecords?.length || 0;
        const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
        
        return (
          <div>
            <div style={{ fontSize: '12px' }}>
              出勤: {present} | 迟到: {late} | 缺勤: {absent}
            </div>
            <Progress percent={rate} size="small" status={rate >= 80 ? 'success' : 'exception'} />
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: any, record: CheckInSession) => (
        <Space size="small">
          <Button
            type="text"
            icon={<BarChartOutlined />}
            onClick={() => {
              setSelectedSession(record);
              setSessionDetailVisible(true);
            }}
          >
            详情
          </Button>
          
          {record.status === 'active' && (
            <Button
              type="text"
              danger
              icon={<StopOutlined />}
              onClick={() => endCheckIn(record.id)}
            >
              结束
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const calculateSessionStats = (session: CheckInSession) => {
    if (!session.attendanceRecords) return { present: 0, late: 0, absent: 0, excused: 0, total: 0, rate: 0 };
    
    const present = session.attendanceRecords.filter(r => r.status === 'present').length;
    const late = session.attendanceRecords.filter(r => r.status === 'late').length;
    const absent = session.attendanceRecords.filter(r => r.status === 'absent').length;
    const excused = session.attendanceRecords.filter(r => r.status === 'excused').length;
    const total = session.attendanceRecords.length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    
    return { present, late, absent, excused, total, rate };
  };

  return (
    <div className="space-y-6">
      {/* 头部操作区 */}
      <Card>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Title level={3} style={{ margin: 0 }}>
                签到管理 {courseName && `- ${courseName}`}
              </Title>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalVisible(true)}
              >
                发起签到
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  loadSessions();
                  loadTodaySession();
                }}
                loading={loading}
              >
                刷新
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 今日签到状态 */}
      {todaySession && (
        <Card title="今日签到状态">
          <Row gutter={16}>
            <Col span={8}>
              <Alert
                message={
                  <Space>
                    <PlayCircleOutlined />
                    <span>第{todaySession.sessionNumber}次课 - {getMethodText(todaySession.checkInMethod)}</span>
                  </Space>
                }
                description={`签到时间: ${dayjs(todaySession.sessionDate).format('HH:mm')}`}
                type={todaySession.status === 'active' ? 'info' : 'success'}
                showIcon
              />
            </Col>
            <Col span={16}>
              <Row gutter={16}>
                {(() => {
                  const stats = calculateSessionStats(todaySession);
                  return (
                    <>
                      <Col span={6}>
                        <Statistic title="出勤" value={stats.present} prefix={<CheckCircleOutlined />} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="迟到" value={stats.late} prefix={<ClockCircleOutlined />} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="缺勤" value={stats.absent} prefix={<ExclamationCircleOutlined />} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="出勤率" value={stats.rate} suffix="%" />
                      </Col>
                    </>
                  );
                })()}
              </Row>
            </Col>
          </Row>
        </Card>
      )}

      {/* 主要内容区 */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
          <TabPane tab="签到会话" key="sessions">
            <Table
              columns={sessionColumns}
              dataSource={sessions}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 发起签到模态框 */}
      <Modal
        title="发起签到"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={startCheckIn}
        >
          <Form.Item
            name="checkInMethod"
            label="签到方式"
            rules={[{ required: true, message: '请选择签到方式' }]}
          >
            <Select placeholder="选择签到方式">
              <Option value={CheckInMethod.VERIFICATION_CODE}>
                <Space>
                  <NumberOutlined />
                  🔢 验证码签到
                </Space>
              </Option>
              <Option value={CheckInMethod.QR_CODE}>
                <Space>
                  <QrcodeOutlined />
                  📱 二维码签到
                </Space>
              </Option>
              <Option value={CheckInMethod.SEAT_MAP}>
                <Space>
                  <EnvironmentOutlined />
                  🪑 座位图签到
                </Space>
              </Option>
              <Option value={CheckInMethod.MANUAL}>
                <Space>
                  <UserOutlined />
                  ✋ 手动签到
                </Space>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="duration"
            label="签到时长（分钟）"
            rules={[{ required: true, message: '请输入签到时长' }]}
          >
            <Select placeholder="选择签到时长">
              <Option value={15}>15分钟</Option>
              <Option value={30}>30分钟</Option>
              <Option value={45}>45分钟</Option>
              <Option value={60}>60分钟</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                开始签到
              </Button>
              <Button onClick={() => {
                setCreateModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 签到详情模态框 */}
      <Modal
        title={selectedSession ? `第${selectedSession.sessionNumber}次课 - 签到详情` : '签到详情'}
        open={sessionDetailVisible}
        onCancel={() => {
          setSessionDetailVisible(false);
          setSelectedSession(null);
        }}
        footer={null}
        width={800}
      >
        {selectedSession && (() => {
          const stats = calculateSessionStats(selectedSession);
          return (
            <div>
              {/* 统计概览 */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="出勤"
                      value={stats.present}
                      prefix={<CheckCircleOutlined />}
                      valueStyle={{ color: '#3f8600' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="迟到"
                      value={stats.late}
                      prefix={<ClockCircleOutlined />}
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="缺勤"
                      value={stats.absent}
                      prefix={<ExclamationCircleOutlined />}
                      valueStyle={{ color: '#cf1322' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="出勤率"
                      value={stats.rate}
                      suffix="%"
                      prefix={<BarChartOutlined />}
                      valueStyle={{ color: stats.rate >= 80 ? '#3f8600' : '#cf1322' }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* 签到信息 */}
              <Card title="签到信息" style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Text strong>签到方式: </Text>
                    <Space>
                      {getMethodIcon(selectedSession.checkInMethod)}
                      {getMethodText(selectedSession.checkInMethod)}
                    </Space>
                  </Col>
                  <Col span={8}>
                    <Text strong>开始时间: </Text>
                    {dayjs(selectedSession.sessionDate).format('YYYY-MM-DD HH:mm')}
                  </Col>
                  <Col span={8}>
                    <Text strong>签到时长: </Text>
                    {selectedSession.duration}分钟
                  </Col>
                </Row>
                {selectedSession.verificationCode && (
                  <Row style={{ marginTop: 8 }}>
                    <Col span={24}>
                      <Text strong>验证码: </Text>
                      <Tag color="blue" style={{ fontSize: '16px', padding: '4px 8px' }}>
                        {selectedSession.verificationCode}
                      </Tag>
                    </Col>
                  </Row>
                )}
              </Card>

              {/* 学生签到列表 */}
              <Card title="学生签到列表">
                <List
                  dataSource={selectedSession.attendanceRecords || []}
                  renderItem={(record: AttendanceRecord) => (
                    <List.Item
                      actions={[
                        <Select
                          key="status"
                          value={record.status}
                          onChange={(value) => updateAttendanceStatus(selectedSession.id, record.studentId, value)}
                          style={{ width: 100 }}
                          size="small"
                        >
                          <Option value="present">出勤</Option>
                          <Option value="late">迟到</Option>
                          <Option value="absent">缺勤</Option>
                          <Option value="excused">请假</Option>
                        </Select>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<Avatar icon={<UserOutlined />} />}
                        title={`${record.student.firstName}${record.student.lastName}`}
                        description={
                          <Space>
                            <span>学号: {record.student.studentId}</span>
                            {record.checkInTime && (
                              <span>签到时间: {dayjs(record.checkInTime).format('HH:mm:ss')}</span>
                            )}
                          </Space>
                        }
                      />
                      <div>
                        <Tag color={getStatusColor(record.status)}>
                          {getStatusText(record.status)}
                        </Tag>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default CheckInManagement;