import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Select, 
  DatePicker, 
  Table, 
  Progress,
  Typography,
  Space,
  Tag,
  Tabs,
  Button,
  Tooltip,
  List,
  Avatar,
  message
} from 'antd';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrophyOutlined,
  TeamOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  FallOutlined,
  UserOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import { request } from '../services/api';
import { Course, User, AnalyticsData } from '../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

interface AttendanceData {
  date: string;
  present: number;
  absent: number;
  late: number;
  total: number;
}

interface GradeDistribution {
  range: string;
  count: number;
  percentage: number;
}

interface CourseAnalytics {
  attendanceRate: number;
  averageGrade: number;
  assignmentCompletionRate: number;
  studentParticipation: number;
  trend: string;
}

const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs()
  ]);
  
  // 数据状态
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution[]>([]);
  const [courseAnalytics, setCourseAnalytics] = useState<CourseAnalytics[]>([]);
  const [topStudents, setTopStudents] = useState<User[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalStudents: 0,
    avgAttendanceRate: 0,
    avgGrade: 0,
    totalAssignments: 0
  });

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedCourse, dateRange]);

  const loadCourses = async () => {
    try {
      const response = await request.get<Course[]>('/courses/teacher');
      setCourses(response);
    } catch (error) {
      message.error('加载课程失败');
    }
  };

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const [startDate, endDate] = dateRange;
      const params = {
        courseId: selectedCourse === 'all' ? undefined : selectedCourse,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      const [
        attendanceRes,
        gradeRes,
        analyticsRes,
        studentsRes,
        statsRes
      ] = await Promise.all([
        request.get<AttendanceData[]>('/analytics/attendance', { params }),
        request.get<GradeDistribution[]>('/analytics/grade-distribution', { params }),
        request.get<CourseAnalytics[]>('/analytics/course-performance', { params }),
        request.get<User[]>('/analytics/top-students', { params }),
        request.get('/analytics/overview-stats', { params })
      ]);

      setAttendanceData(attendanceRes);
      setGradeDistribution(gradeRes);
      setCourseAnalytics(analyticsRes);
      setTopStudents(studentsRes);
      setOverallStats(statsRes);
    } catch (error) {
      message.error('加载分析数据失败');
    } finally {
      setLoading(false);
    }
  };

  const attendanceChartData = attendanceData.map(item => ({
    ...item,
    attendanceRate: ((item.present / item.total) * 100).toFixed(1)
  }));

  const pieChartColors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'];

  const renderOverviewStats = () => (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="学生总数"
            value={overallStats.totalStudents}
            prefix={<TeamOutlined />}
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="平均出勤率"
            value={overallStats.avgAttendanceRate}
            suffix="%"
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="平均成绩"
            value={overallStats.avgGrade}
            precision={1}
            prefix={<TrophyOutlined />}
            valueStyle={{ color: '#faad14' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="作业总数"
            value={overallStats.totalAssignments}
            prefix={<BookOutlined />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Card>
      </Col>
    </Row>
  );

  const renderAttendanceChart = () => (
    <Card 
      title={
        <Space>
          <LineChartOutlined />
          <span>出勤趋势分析</span>
        </Space>
      }
      style={{ marginBottom: 24 }}
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={attendanceChartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <RechartsTooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="present" 
            stroke="#52c41a" 
            name="出席"
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="absent" 
            stroke="#f5222d" 
            name="缺席"
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="late" 
            stroke="#faad14" 
            name="迟到"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );

  const renderGradeDistribution = () => (
    <Card 
      title={
        <Space>
          <PieChartOutlined />
          <span>成绩分布</span>
        </Space>
      }
      style={{ marginBottom: 24 }}
    >
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={gradeDistribution}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ range, percentage }) => `${range}: ${percentage}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
          >
            {gradeDistribution.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={pieChartColors[index % pieChartColors.length]} />
            ))}
          </Pie>
          <RechartsTooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );

  const renderCoursePerformance = () => (
    <Card 
      title={
        <Space>
          <BarChartOutlined />
          <span>课程表现分析</span>
        </Space>
      }
      style={{ marginBottom: 24 }}
    >
      <Table
        dataSource={courseAnalytics}
        pagination={false}
        columns={[
          {
            title: '课程',
            dataIndex: 'courseName',
            key: 'courseName',
          },
          {
            title: '出勤率',
            dataIndex: 'attendanceRate',
            key: 'attendanceRate',
            render: (rate: number) => (
              <Progress 
                percent={rate} 
                size="small" 
                status={rate >= 80 ? 'success' : rate >= 60 ? 'normal' : 'exception'}
              />
            ),
          },
          {
            title: '平均成绩',
            dataIndex: 'averageGrade',
            key: 'averageGrade',
            render: (grade: number) => (
              <span style={{ color: grade >= 80 ? '#52c41a' : grade >= 60 ? '#faad14' : '#f5222d' }}>
                {grade.toFixed(1)}
              </span>
            ),
          },
          {
            title: '作业完成率',
            dataIndex: 'assignmentCompletionRate',
            key: 'assignmentCompletionRate',
            render: (rate: number) => `${rate}%`,
          },
          {
            title: '趋势',
            dataIndex: 'trend',
            key: 'trend',
            render: (trend: string) => (
              <Tag 
                color={trend === 'up' ? 'green' : trend === 'down' ? 'red' : 'blue'}
                icon={trend === 'up' ? <RiseOutlined /> : trend === 'down' ? <FallOutlined /> : null}
              >
                {trend === 'up' ? '上升' : trend === 'down' ? '下降' : '稳定'}
              </Tag>
            ),
          },
        ]}
      />
    </Card>
  );

  const renderTopStudents = () => (
    <Card 
      title="优秀学生排行"
      style={{ marginBottom: 24 }}
      extra={<Button type="link">查看更多</Button>}
    >
      <List
        itemLayout="horizontal"
        dataSource={topStudents}
        renderItem={(student, index) => (
          <List.Item>
            <List.Item.Meta
              avatar={
                <Avatar 
                  src={student.avatar} 
                  icon={<UserOutlined />}
                  style={{ 
                    backgroundColor: index < 3 ? ['#faad14', '#d9d9d9', '#faad14'][index] : '#1890ff'
                  }}
                >
                  {index + 1}
                </Avatar>
              }
              title={
                <Space>
                  <span>{student.firstName} {student.lastName}</span>
                  {index < 3 && <TrophyOutlined style={{ color: '#faad14' }} />}
                </Space>
              }
              description={
                <Space>
                  <Text>学号：{student.studentId}</Text>
                  <Text>专业：{student.major}</Text>
                  <Text>出勤率：95%</Text>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>数据分析</Title>
          <Text type="secondary">查看教学数据和学生表现分析</Text>
        </div>
        
        <Space>
          <Select
            value={selectedCourse}
            onChange={setSelectedCourse}
            style={{ width: 200 }}
            placeholder="选择课程"
          >
            <Option value="all">全部课程</Option>
            {courses.map(course => (
              <Option key={course.id} value={course.id}>
                {course.name}
              </Option>
            ))}
          </Select>
          
          <RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
          />
        </Space>
      </div>

      <Tabs defaultActiveKey="overview" size="large">
        <TabPane tab="概览统计" key="overview">
          {renderOverviewStats()}
          
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={16}>
              {renderAttendanceChart()}
              {renderCoursePerformance()}
            </Col>
            <Col xs={24} lg={8}>
              {renderGradeDistribution()}
              {renderTopStudents()}
            </Col>
          </Row>
        </TabPane>
        
        <TabPane tab="出勤分析" key="attendance">
          {renderAttendanceChart()}
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <Card title="详细出勤数据">
                <Table
                  dataSource={attendanceData}
                  columns={[
                    { title: '日期', dataIndex: 'date', key: 'date' },
                    { title: '出席', dataIndex: 'present', key: 'present' },
                    { title: '缺席', dataIndex: 'absent', key: 'absent' },
                    { title: '迟到', dataIndex: 'late', key: 'late' },
                    { title: '总人数', dataIndex: 'total', key: 'total' },
                    {
                      title: '出勤率',
                      key: 'rate',
                      render: (record: AttendanceData) => 
                        `${((record.present / record.total) * 100).toFixed(1)}%`
                    },
                  ]}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>
        
        <TabPane tab="成绩分析" key="grades">
          {renderGradeDistribution()}
          <Card title="成绩统计详情">
            <Row gutter={[16, 16]}>
              {gradeDistribution.map((item, index) => (
                <Col key={index} xs={24} sm={12} lg={8}>
                  <Card size="small">
                    <Statistic
                      title={item.range}
                      value={item.count}
                      suffix="人"
                      valueStyle={{ color: pieChartColors[index % pieChartColors.length] }}
                    />
                    <Text type="secondary">{item.percentage}%</Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Analytics;