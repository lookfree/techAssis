import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Progress, 
  Table, 
  DatePicker,
  Select,
  Button,
  Space,
  Tag,
  Tooltip,
  message,
  Modal,
  List,
  Avatar,
  Tabs,
  Switch,
  Alert,
  Form,
  Input
} from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  UserOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  ExclamationCircleOutlined,
  DownloadOutlined,
  ReloadOutlined,
  CalendarOutlined,
  BarChartOutlined,
  TeamOutlined,
  QrcodeOutlined,
  EnvironmentOutlined,
  SettingOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { request } from '../../services/api';
import attendanceService, { CheckInMethod } from '../../services/attendanceService';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

interface AttendanceStats {
  totalSessions: number;
  totalStudents: number;
  attendanceRate: number;
  statusStats: {
    status: string;
    count: number;
    percentage: number;
  }[];
  sessionStats: {
    sessionDate: string;
    sessionNumber: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    total: number;
  }[];
  studentAttendanceRates: {
    student: {
      id: string;
      firstName: string;
      lastName: string;
      studentId: string;
    };
    totalSessions: number;
    presentCount: number;
    attendanceRate: number;
  }[];
  trends: {
    date: string;
    status: string;
    count: number;
  }[];
}

interface AttendanceChartProps {
  courseId: string;
  courseName?: string;
}

interface AttendanceSession {
  id: string;
  courseId: string;
  sessionNumber: number;
  sessionDate: string;
  status: 'active' | 'closed' | 'scheduled';
  checkInMethod: 'qr' | 'code' | 'geo' | 'manual';
  location?: string;
  checkInCode?: string;
  qrCodeUrl?: string;
  attendanceRecords: AttendanceRecord[];
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  sessionId: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  checkInTime?: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string;
  };
}

type StudentAttendanceRate = AttendanceStats['studentAttendanceRates'][0];

const AttendanceChart: React.FC<AttendanceChartProps> = ({ courseId, courseName }) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('excel');
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [activeTab, setActiveTab] = useState('stats');
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [createSessionModalVisible, setCreateSessionModalVisible] = useState(false);

  useEffect(() => {
    loadAttendanceStats();
    loadAttendanceSessions();
  }, [courseId, dateRange]);

  const loadAttendanceStats = async () => {
    try {
      setLoading(true);
      const response = await request.get(`/attendance/stats/${courseId}`);
      setStats(response);
    } catch (error) {
      message.error('加载考勤统计失败');
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceSessions = async () => {
    try {
      const response = await request.get(`/attendance/sessions/${courseId}`);
      setSessions(response);
    } catch (error) {
      message.error('加载考勤记录失败');
    }
  };

  const createAttendanceSession = async (values: any) => {
    try {
      await request.post('/attendance/sessions', {
        ...values,
        courseId,
        sessionDate: values.sessionDate.toISOString()
      });
      message.success('考勤课次创建成功');
      setCreateSessionModalVisible(false);
      loadAttendanceSessions();
    } catch (error) {
      message.error('创建考勤课次失败');
    }
  };

  const updateAttendanceRecord = async (sessionId: string, studentId: string, status: string) => {
    try {
      await request.patch(`/attendance/records/${sessionId}/${studentId}`, { status });
      message.success('考勤状态更新成功');
      loadAttendanceSessions();
    } catch (error) {
      message.error('更新考勤状态失败');
    }
  };

  const startAttendanceSession = async (sessionId: string) => {
    try {
      await request.patch(`/attendance/sessions/${sessionId}/start`);
      message.success('考勤已开始');
      loadAttendanceSessions();
    } catch (error) {
      message.error('开始考勤失败');
    }
  };

  const endAttendanceSession = async (sessionId: string) => {
    try {
      await request.patch(`/attendance/sessions/${sessionId}/end`);
      message.success('考勤已结束');
      loadAttendanceSessions();
    } catch (error) {
      message.error('结束考勤失败');
    }
  };

  const handleExport = async () => {
    try {
      const params: any = {
        format: exportFormat,
        includeStats: true
      };

      if (dateRange) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      const response = await request.get(`/attendance/export/${courseId}`, {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download', 
        `attendance-${courseId}-${dayjs().format('YYYYMMDD')}.${exportFormat === 'excel' ? 'xlsx' : 'csv'}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success('考勤数据导出成功');
    } catch (error) {
      message.error('导出考勤数据失败');
    }
  };

  if (!stats) {
    return <Card loading={loading} />;
  }

  // 准备图表数据
  const pieChartData = stats.statusStats.map(item => ({
    name: getStatusText(item.status),
    value: item.count,
    percentage: item.percentage
  }));

  const trendData = processTrendData(stats.trends);
  
  const sessionChartData = stats.sessionStats.slice(0, 10).map(session => ({
    session: `第${session.sessionNumber}节`,
    date: dayjs(session.sessionDate).format('MM-DD'),
    出勤: session.present,
    迟到: session.late,
    缺勤: session.absent,
    请假: session.excused,
    出勤率: Math.round((session.present + session.late) / session.total * 100)
  }));

  // 学生出勤率表格列
  const studentColumns: any[] = [
    {
      title: '学号',
      dataIndex: ['student', 'studentId'],
      key: 'studentId',
      width: 120,
    },
    {
      title: '姓名',
      key: 'name',
      render: (_: any, record: StudentAttendanceRate) => 
        `${record.student.firstName}${record.student.lastName}`,
      width: 100,
    },
    {
      title: '总课次',
      dataIndex: 'totalSessions',
      key: 'totalSessions',
      width: 80,
    },
    {
      title: '出勤次数',
      dataIndex: 'presentCount',
      key: 'presentCount',
      width: 80,
    },
    {
      title: '出勤率',
      key: 'attendanceRate',
      render: (_: any, record: StudentAttendanceRate) => (
        <div>
          <Progress 
            percent={record.attendanceRate} 
            size="small"
            status={getProgressStatus(record.attendanceRate)}
          />
          <span className="ml-2">{record.attendanceRate}%</span>
        </div>
      ),
      sorter: (a: StudentAttendanceRate, b: StudentAttendanceRate) => a.attendanceRate - b.attendanceRate,
      width: 150,
    },
    {
      title: '状态',
      key: 'status',
      render: (_: any, record: StudentAttendanceRate) => {
        const rate = record.attendanceRate;
        if (rate >= 90) return <Tag color="green">优秀</Tag>;
        if (rate >= 80) return <Tag color="blue">良好</Tag>;
        if (rate >= 70) return <Tag color="orange">一般</Tag>;
        return <Tag color="red">较差</Tag>;
      },
      width: 80,
    }
  ];

  const COLORS = ['#52c41a', '#faad14', '#ff4d4f', '#1890ff'];

  const sessionColumns = [
    {
      title: '课次',
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig: { [key: string]: { color: string; text: string } } = {
          scheduled: { color: 'default', text: '未开始' },
          active: { color: 'blue', text: '进行中' },
          closed: { color: 'green', text: '已结束' }
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '签到方式',
      dataIndex: 'checkInMethod',
      key: 'checkInMethod',
      width: 100,
      render: (method: string) => {
        const methodConfig: { [key: string]: { icon: React.ReactNode; text: string } } = {
          qr: { icon: <QrcodeOutlined />, text: '二维码' },
          code: { icon: <CalendarOutlined />, text: '签到码' },
          geo: { icon: <EnvironmentOutlined />, text: '位置' },
          manual: { icon: <UserOutlined />, text: '手动' }
        };
        const config = methodConfig[method] || { icon: <UserOutlined />, text: method };
        return (
          <Space>
            {config.icon}
            {config.text}
          </Space>
        );
      },
    },
    {
      title: '出勤统计',
      key: 'attendance',
      render: (_: any, record: AttendanceSession) => {
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
      render: (_: any, record: AttendanceSession) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedSession(record);
              setSessionModalVisible(true);
            }}
          >
            查看
          </Button>
          
          {record.status === 'scheduled' && (
            <Button
              type="text"
              icon={<CalendarOutlined />}
              onClick={() => startAttendanceSession(record.id)}
            >
              开始
            </Button>
          )}
          
          {record.status === 'active' && (
            <Button
              type="text"
              icon={<CheckCircleOutlined />}
              onClick={() => endAttendanceSession(record.id)}
            >
              结束
            </Button>
          )}
          
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              // TODO: 实现编辑功能
              message.info('编辑功能开发中');
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 头部操作区 */}
      <Card>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <h3 className="m-0">考勤统计分析 - {courseName}</h3>
            </Space>
          </Col>
          <Col>
            <Space>
              <RangePicker
                value={dateRange}
                onChange={(dates: any) => setDateRange(dates)}
                format="YYYY-MM-DD"
                placeholder={['开始日期', '结束日期']}
              />
              <Select
                value={exportFormat}
                onChange={setExportFormat}
                style={{ width: 100 }}
              >
                <Option value="excel">Excel</Option>
                <Option value="csv">CSV</Option>
              </Select>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExport}
              >
                导出
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  loadAttendanceStats();
                  loadAttendanceSessions();
                }}
                loading={loading}
              >
                刷新
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 主要内容区 */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
          <TabPane tab="统计分析" key="stats">
            {/* 统计概览 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总课次"
              value={stats.totalSessions}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="选课学生"
              value={stats.totalStudents}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="整体出勤率"
              value={stats.attendanceRate}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ 
                color: stats.attendanceRate >= 80 ? '#3f8600' : '#cf1322' 
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Progress
              type="circle"
              percent={stats.attendanceRate}
              status={stats.attendanceRate >= 80 ? 'success' : 'exception'}
              format={percent => `${percent}%`}
            />
          </Card>
        </Col>
      </Row>

            {/* 图表区域 */}
            <Row gutter={16}>
        {/* 出勤状态分布 */}
        <Col span={12}>
          <Card title="出勤状态分布" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* 最近课次出勤情况 */}
        <Col span={12}>
          <Card title="最近课次出勤情况" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sessionChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="出勤" stackId="a" fill="#52c41a" />
                <Bar dataKey="迟到" stackId="a" fill="#faad14" />
                <Bar dataKey="缺勤" stackId="a" fill="#ff4d4f" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

            {/* 出勤趋势 */}
            <Card title="出勤趋势" loading={loading}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            <Line type="monotone" dataKey="出勤" stroke="#52c41a" strokeWidth={2} />
            <Line type="monotone" dataKey="迟到" stroke="#faad14" strokeWidth={2} />
            <Line type="monotone" dataKey="缺勤" stroke="#ff4d4f" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

            {/* 学生出勤率排行 */}
            <Card title="学生出勤率排行" loading={loading}>
        <Table
          columns={studentColumns}
          dataSource={stats.studentAttendanceRates}
          rowKey={record => record.student.id}
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>
          </TabPane>

          <TabPane tab="考勤管理" key="management">
            {/* 操作按钮 */}
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
              <Col>
                <Space>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateSessionModalVisible(true)}
                  >
                    发起签到
                  </Button>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button
                    icon={<BarChartOutlined />}
                    onClick={() => setActiveTab('stats')}
                  >
                    查看统计
                  </Button>
                </Space>
              </Col>
            </Row>

            {/* 考勤课次列表 */}
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
        open={createSessionModalVisible}
        onCancel={() => setCreateSessionModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          layout="vertical"
          onFinish={async (values) => {
            try {
              await attendanceService.startCheckIn({
                courseId,
                checkInMethod: values.method,
                duration: values.duration || 30,
                description: values.description
              });
              setCreateSessionModalVisible(false);
              loadAttendanceSessions();
              loadAttendanceStats();
            } catch (error) {
              // 错误已在service中处理
            }
          }}
        >
          <Form.Item
            name="method"
            label="签到方式"
            rules={[{ required: true, message: '请选择签到方式' }]}
          >
            <Select placeholder="选择签到方式">
              <Option value={CheckInMethod.VERIFICATION_CODE}>
                🔢 验证码签到
              </Option>
              <Option value={CheckInMethod.QR_CODE}>
                📱 二维码签到  
              </Option>
              <Option value={CheckInMethod.SEAT_MAP}>
                🪑 座位图签到
              </Option>
              <Option value={CheckInMethod.MANUAL}>
                ✋ 手动签到
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="duration"
            label="签到时长（分钟）"
            initialValue={30}
          >
            <Select>
              <Option value={15}>15分钟</Option>
              <Option value={30}>30分钟</Option>
              <Option value={45}>45分钟</Option>
              <Option value={60}>60分钟</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="备注说明"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="可选：添加本次签到的说明信息"
            />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setCreateSessionModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                🚀 立即发起签到
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 考勤详情模态框 */}
      <Modal
        title={`第${selectedSession?.sessionNumber}次课 - 考勤详情`}
        open={sessionModalVisible}
        onCancel={() => {
          setSessionModalVisible(false);
          setSelectedSession(null);
        }}
        footer={null}
        width={800}
      >
        {selectedSession && (
          <div>
            {/* 课次信息 */}
            <Card title="课次信息" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="课次"
                    value={selectedSession.sessionNumber}
                    prefix={<CalendarOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="日期"
                    value={dayjs(selectedSession.sessionDate).format('MM-DD HH:mm')}
                    prefix={<ClockCircleOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <div>
                    <div style={{ fontSize: '14px', color: '#666' }}>状态</div>
                    <Tag color={selectedSession.status === 'active' ? 'blue' : selectedSession.status === 'closed' ? 'green' : 'default'}>
                      {selectedSession.status === 'active' ? '进行中' : selectedSession.status === 'closed' ? '已结束' : '未开始'}
                    </Tag>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* 学生考勤列表 */}
            <Card title="学生考勤记录">
              <List
                dataSource={selectedSession.attendanceRecords || []}
                renderItem={(record: AttendanceRecord) => (
                  <List.Item
                    actions={[
                      <Select
                        key="status"
                        value={record.status}
                        onChange={(value) => updateAttendanceRecord(selectedSession.id, record.studentId, value)}
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
                      description={`学号: ${record.student.studentId} ${record.checkInTime ? `| 签到时间: ${dayjs(record.checkInTime).format('HH:mm')}` : ''}`}
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
        )}
      </Modal>
    </div>
  );
};

// 工具函数
function getStatusText(status: string): string {
  const statusMap: { [key: string]: string } = {
    present: '出勤',
    late: '迟到',
    absent: '缺勤',
    excused: '请假'
  };
  return statusMap[status as keyof typeof statusMap] || status;
}

function getStatusColor(status: string): string {
  const statusMap: { [key: string]: string } = {
    present: 'green',
    late: 'orange', 
    absent: 'red',
    excused: 'blue'
  };
  return statusMap[status as keyof typeof statusMap] || 'default';
}

function getProgressStatus(rate: number): 'success' | 'exception' | 'normal' {
  if (rate >= 90) return 'success';
  if (rate >= 70) return 'normal';
  return 'exception';
}

function processTrendData(trends: any[]) {
  const grouped = trends.reduce((acc, trend) => {
    if (!acc[trend.date]) {
      acc[trend.date] = { date: trend.date, 出勤: 0, 迟到: 0, 缺勤: 0 };
    }
    acc[trend.date][getStatusText(trend.status)] = trend.count;
    return acc;
  }, {});

  return Object.values(grouped).sort((a: any, b: any) => 
    dayjs(a.date).unix() - dayjs(b.date).unix()
  );
}

export default AttendanceChart;