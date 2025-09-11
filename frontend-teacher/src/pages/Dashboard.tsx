import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Progress, List, Avatar, Button, Space, Typography, Spin, Empty } from 'antd';
import {
  BookOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  NotificationOutlined,
} from '@ant-design/icons';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { request } from '../services/api';
import { DashboardStats, Course, Notification, UserRole } from '../types';

interface CourseListResponse {
  courses: Course[];
  total: number;
}

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCourses, setRecentCourses] = useState<Course[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [attendanceChart, setAttendanceChart] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // 并行请求各种数据
      const coursesEndpoint = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.DEPARTMENT_ADMIN 
        ? '/courses?limit=5'
        : '/courses/my-courses?limit=5';
      
      const [statsRes, coursesRes, notificationsRes, chartRes] = await Promise.all([
        request.get<DashboardStats>('/analytics/dashboard'),
        request.get<CourseListResponse>(coursesEndpoint),
        request.get<Notification[]>('/notifications?limit=5&unread=true'),
        request.get('/analytics/attendance-trend?days=7'),
      ]);

      setStats(statsRes);
      setRecentCourses(Array.isArray(coursesRes) ? coursesRes : (coursesRes?.courses || []));
      setNotifications(notificationsRes || []);
      setAttendanceChart(chartRes || []);
    } catch (error) {
      console.error('加载仪表盘数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 模拟数据 - 实际项目中应该从API获取
  const mockStats: DashboardStats = {
    totalCourses: 6,
    totalStudents: 156,
    todayAttendance: 142,
    pendingAssignments: 3,
    recentAttendanceRate: 91.2,
    unreadNotifications: 5,
  };

  const mockAttendanceData = [
    { date: '2024-01-01', rate: 85 },
    { date: '2024-01-02', rate: 88 },
    { date: '2024-01-03', rate: 92 },
    { date: '2024-01-04', rate: 89 },
    { date: '2024-01-05', rate: 94 },
    { date: '2024-01-06', rate: 91 },
    { date: '2024-01-07', rate: 93 },
  ];

  const mockRecentCourses: Course[] = [
    {
      id: '1',
      courseCode: 'CS101',
      name: '计算机科学基础',
      description: '介绍计算机科学的基本概念',
      credits: 3,
      semester: 'spring' as any,
      academicYear: '2024',
      status: 'active' as any,
      teacherId: user?.id || '',
      attendanceEnabled: true,
      assignmentEnabled: true,
      enrollmentCount: 45,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      courseCode: 'MATH201',
      name: '高等数学',
      description: '微积分和线性代数',
      credits: 4,
      semester: 'spring' as any,
      academicYear: '2024',
      status: 'active' as any,
      teacherId: user?.id || '',
      attendanceEnabled: true,
      assignmentEnabled: true,
      enrollmentCount: 38,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const currentStats = stats || mockStats;
  const currentCourses = recentCourses.length ? recentCourses : mockRecentCourses;
  const currentAttendanceData = attendanceChart.length ? attendanceChart : mockAttendanceData;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      {/* 欢迎信息 */}
      <div style={{ marginBottom: 12, maxWidth: '64rem' }}>
        <Title level={2} style={{ marginTop: 0, paddingTop: 0, marginBottom: 12 }}>
          欢迎回来，{user?.firstName} {user?.lastName} 老师！
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          今天是 {new Date().toLocaleDateString('zh-CN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[20, 20]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} md={6} lg={6} xl={6}>
          <Card>
            <Statistic
              title="我的课程"
              value={currentStats.totalCourses}
              prefix={<BookOutlined className="text-blue-500" />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={6} xl={6}>
          <Card>
            <Statistic
              title="学生总数"
              value={currentStats.totalStudents}
              prefix={<UserOutlined className="text-green-500" />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={6} xl={6}>
          <Card>
            <Statistic
              title="今日签到"
              value={currentStats.todayAttendance}
              prefix={<CheckCircleOutlined className="text-orange-500" />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={6} xl={6}>
          <Card>
            <Statistic
              title="待批作业"
              value={currentStats.pendingAssignments}
              prefix={<ClockCircleOutlined className="text-red-500" />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        {/* 出勤率趋势 */}
        <Col xs={24} lg={16}>
          <Card 
            title="出勤率趋势"
            extra={
              <Space>
                <RiseOutlined />
                <Text strong className="text-green-500">
                  {currentStats.recentAttendanceRate}%
                </Text>
              </Space>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={currentAttendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value: any) => [`${value}%`, '出勤率']}
                  labelFormatter={(label) => `日期: ${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#1890ff" 
                  fill="#1890ff" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* 出勤率概览 */}
        <Col xs={24} lg={8}>
          <Card title="出勤率概览" className="h-full">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <Text>整体出勤率</Text>
                  <Text strong>{currentStats.recentAttendanceRate}%</Text>
                </div>
                <Progress 
                  percent={currentStats.recentAttendanceRate} 
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <Text>按时到达率</Text>
                  <Text strong>87.3%</Text>
                </div>
                <Progress percent={87.3} strokeColor="#52c41a" />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <Text>请假率</Text>
                  <Text strong>4.2%</Text>
                </div>
                <Progress percent={4.2} strokeColor="#faad14" />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <Text>旷课率</Text>
                  <Text strong>4.6%</Text>
                </div>
                <Progress percent={4.6} strokeColor="#f5222d" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]} className="mt-6">
        {/* 最近课程 */}
        <Col xs={24} lg={12}>
          <Card 
            title="最近课程"
            extra={<Button type="link" onClick={() => window.location.href = '/courses'}>查看全部</Button>}
          >
            <List
              itemLayout="horizontal"
              dataSource={currentCourses}
              renderItem={(course) => (
                <List.Item
                  actions={[
                    <Button type="link" key="view">查看</Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<BookOutlined />} style={{ backgroundColor: '#1890ff' }} />}
                    title={
                      <Space>
                        <Text strong>{course.name}</Text>
                        <Text className="text-sm text-gray-500">({course.courseCode})</Text>
                      </Space>
                    }
                    description={
                      <Space size="large">
                        <Text className="text-sm">学生: {course.enrollmentCount}人</Text>
                        <Text className="text-sm">学分: {course.credits}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 最新通知 */}
        <Col xs={24} lg={12}>
          <Card 
            title="最新通知"
            extra={<Button type="link" onClick={() => window.location.href = '/notifications'}>查看全部</Button>}
          >
            {notifications.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={notifications}
                renderItem={(notification) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<NotificationOutlined />} style={{ backgroundColor: '#faad14' }} />}
                      title={notification.title}
                      description={
                        <div>
                          <Text className="text-sm text-gray-600">
                            {notification.content.substring(0, 50)}...
                          </Text>
                          <br />
                          <Text className="text-xs text-gray-400">
                            {new Date(notification.createdAt).toLocaleString()}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无新通知"
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;