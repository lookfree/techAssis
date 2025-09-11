import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Table,
  Modal,
  Form,
  Input,
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
  Dropdown,
  Menu,
  Switch,
  Alert,
  List,
  Avatar,
  Rate
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SendOutlined,
  DownloadOutlined,
  BookOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TrophyOutlined,
  BarChartOutlined,
  RobotOutlined,
  FileTextOutlined,
  MoreOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { request } from '../../services/api';

dayjs.extend(relativeTime);

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface Assignment {
  id: string;
  title: string;
  description: string;
  courseId: string;
  dueDate: string;
  totalPoints: number;
  type: 'homework' | 'quiz' | 'project' | 'exam';
  status: 'draft' | 'published' | 'closed';
  createdAt: string;
  course: {
    id: string;
    name: string;
  };
  submissions: Submission[];
}

interface Submission {
  id: string;
  studentId: string;
  submittedAt: string;
  content: string;
  fileUrl?: string;
  status: 'submitted' | 'graded' | 'late';
  student: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string;
  };
  grades?: Grade[];
}

interface Grade {
  id: string;
  score: number;
  maxScore: number;
  feedback?: string;
  gradedAt: string;
}

interface Course {
  id: string;
  name: string;
  courseCode: string;
}

interface AssignmentManagementProps {
  courseId?: string;
  courseName?: string;
}

const AssignmentManagement: React.FC<AssignmentManagementProps> = ({ courseId, courseName }) => {
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [gradeModalVisible, setGradeModalVisible] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [form] = Form.useForm();
  const [gradeForm] = Form.useForm();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('list');

  useEffect(() => {
    loadAssignments();
    loadCourses();
  }, [courseId]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (courseId) {
        params.courseId = courseId;
      }
      if (filterStatus && filterStatus !== 'all') {
        params.status = filterStatus;
      }
      
      const response = await request.get('/assignments', { params });
      setAssignments(response);
    } catch (error) {
      message.error('加载作业列表失败');
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

  const loadSubmissions = async (assignmentId: string) => {
    try {
      const response = await request.get(`/assignments/${assignmentId}/submissions`);
      setSubmissions(response);
    } catch (error) {
      message.error('加载提交列表失败');
    }
  };

  const handleCreateAssignment = async (values: any) => {
    try {
      const assignmentData = {
        ...values,
        dueDate: values.dueDate.toISOString(),
        courseId: values.courseId || courseId,
        totalPoints: values.totalPoints || 100,
        type: values.type || 'homework'
      };

      await request.post('/assignments', assignmentData);
      message.success('作业创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      loadAssignments();
    } catch (error) {
      message.error('创建作业失败');
    }
  };

  const handlePublishAssignment = async (id: string) => {
    try {
      await request.put(`/assignments/${id}/publish`);
      message.success('作业发布成功');
      loadAssignments();
    } catch (error) {
      message.error('发布作业失败');
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      await request.delete(`/assignments/${id}`);
      message.success('作业删除成功');
      loadAssignments();
    } catch (error) {
      message.error('删除作业失败');
    }
  };

  const handleGradeSubmission = async (values: any) => {
    if (!selectedSubmission) return;

    try {
      await request.post(`/assignments/${selectedAssignment?.id}/grade`, {
        studentId: selectedSubmission.studentId,
        score: values.score,
        feedback: values.feedback
      });

      message.success('批改完成');
      setGradeModalVisible(false);
      gradeForm.resetFields();
      loadSubmissions(selectedAssignment!.id);
    } catch (error) {
      message.error('批改失败');
    }
  };

  const handleAiGrade = async (assignmentId: string) => {
    try {
      await request.post(`/assignments/${assignmentId}/ai-grade`);
      message.success('AI批改已启动，请稍后查看结果');
      loadSubmissions(assignmentId);
    } catch (error) {
      message.error('AI批改启动失败');
    }
  };

  const handleExportGrades = async (assignmentId: string, format: string) => {
    try {
      const response = await request.get(`/assignments/${assignmentId}/export-grades`, {
        params: { format },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `grades-${assignmentId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success('成绩导出成功');
    } catch (error) {
      message.error('导出成绩失败');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      draft: 'default',
      published: 'blue',
      closed: 'red'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: { [key: string]: string } = {
      draft: '草稿',
      published: '已发布',
      closed: '已关闭'
    };
    return texts[status] || status;
  };

  const getTypeText = (type: string) => {
    const types: { [key: string]: string } = {
      homework: '作业',
      quiz: '测验',
      project: '项目',
      exam: '考试'
    };
    return types[type] || type;
  };

  const calculateStats = () => {
    if (!selectedAssignment || !submissions.length) {
      return { submittedCount: 0, gradedCount: 0, avgScore: 0, lateCount: 0 };
    }

    const submittedCount = submissions.length;
    const gradedCount = submissions.filter(s => s.grades && s.grades.length > 0).length;
    const lateCount = submissions.filter(s => s.status === 'late').length;
    const scores = submissions
      .filter(s => s.grades && s.grades.length > 0)
      .map(s => s.grades![0].score);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    return { submittedCount, gradedCount, avgScore, lateCount };
  };

  const assignmentColumns = [
    {
      title: '作业标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Assignment) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{title}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.course?.name || courseName}
          </div>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => (
        <Tag color="blue">{getTypeText(type)}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: '截止时间',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date: string) => (
        <div>
          <div>{dayjs(date).format('MM-DD HH:mm')}</div>
          <div style={{ fontSize: '12px', color: dayjs(date).isBefore(dayjs()) ? '#ff4d4f' : '#666' }}>
            {dayjs(date).isBefore(dayjs()) ? '已过期' : dayjs(date).fromNow()}
          </div>
        </div>
      ),
    },
    {
      title: '提交情况',
      key: 'submissions',
      width: 120,
      render: (_: any, record: Assignment) => {
        const total = record.submissions?.length || 0;
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold' }}>{total}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>份提交</div>
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: Assignment) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedAssignment(record);
                setActiveTab('submissions');
                loadSubmissions(record.id);
              }}
            />
          </Tooltip>
          
          {record.status === 'draft' && (
            <Tooltip title="发布作业">
              <Button
                type="text"
                icon={<SendOutlined />}
                onClick={() => handlePublishAssignment(record.id)}
              />
            </Tooltip>
          )}
          
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                // TODO: 实现编辑功能
                message.info('编辑功能开发中');
              }}
            />
          </Tooltip>
          
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: '确认删除',
                  content: '确定要删除这个作业吗？此操作不可撤销。',
                  onOk: () => handleDeleteAssignment(record.id),
                });
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const submissionColumns = [
    {
      title: '学生信息',
      key: 'student',
      render: (_: any, record: Submission) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>
            {record.student.firstName}{record.student.lastName}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.student.studentId}
          </div>
        </div>
      ),
    },
    {
      title: '提交时间',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (date: string) => (
        <div>
          <div>{dayjs(date).format('MM-DD HH:mm')}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {dayjs(date).fromNow()}
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig: { [key: string]: { color: string; text: string } } = {
          submitted: { color: 'blue', text: '已提交' },
          graded: { color: 'green', text: '已批改' },
          late: { color: 'orange', text: '迟交' }
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '成绩',
      key: 'grade',
      render: (_: any, record: Submission) => {
        if (record.grades && record.grades.length > 0) {
          const grade = record.grades[0];
          return (
            <div>
              <div style={{ fontWeight: 'bold' }}>
                {grade.score}/{grade.maxScore}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {Math.round((grade.score / grade.maxScore) * 100)}%
              </div>
            </div>
          );
        }
        return <Text type="secondary">未批改</Text>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Submission) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedSubmission(record);
              if (record.grades && record.grades.length > 0) {
                gradeForm.setFieldsValue({
                  score: record.grades[0].score,
                  feedback: record.grades[0].feedback
                });
              }
              setGradeModalVisible(true);
            }}
          >
            {record.grades && record.grades.length > 0 ? '重新批改' : '批改'}
          </Button>
          
          {record.fileUrl && (
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => {
                window.open(`http://localhost:3000${record.fileUrl}`, '_blank');
              }}
            >
              下载
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      {/* 头部操作区 */}
      <Card>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Title level={3} style={{ margin: 0 }}>
                作业管理 {courseName && `- ${courseName}`}
              </Title>
            </Space>
          </Col>
          <Col>
            <Space>
              <Select
                value={filterStatus}
                onChange={setFilterStatus}
                style={{ width: 120 }}
                placeholder="状态筛选"
              >
                <Option value="all">全部状态</Option>
                <Option value="draft">草稿</Option>
                <Option value="published">已发布</Option>
                <Option value="closed">已关闭</Option>
              </Select>
              
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalVisible(true)}
              >
                创建作业
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 主要内容区 */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          type="card"
        >
          <TabPane tab="作业列表" key="list">
            <Table
              columns={assignmentColumns}
              dataSource={assignments}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </TabPane>

          {selectedAssignment && (
            <TabPane tab={`${selectedAssignment.title} - 提交详情`} key="submissions">
              {/* 统计概览 */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="总提交数"
                      value={stats.submittedCount}
                      prefix={<FileTextOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="已批改"
                      value={stats.gradedCount}
                      prefix={<CheckCircleOutlined />}
                      suffix={`/ ${stats.submittedCount}`}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="平均分"
                      value={stats.avgScore}
                      precision={1}
                      prefix={<TrophyOutlined />}
                      suffix="分"
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="迟交数"
                      value={stats.lateCount}
                      prefix={<ClockCircleOutlined />}
                      valueStyle={{ color: '#cf1322' }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* 批量操作 */}
              <Space style={{ marginBottom: 16 }}>
                <Button
                  icon={<RobotOutlined />}
                  onClick={() => handleAiGrade(selectedAssignment.id)}
                >
                  AI智能批改
                </Button>
                
                <Dropdown
                  overlay={
                    <Menu>
                      <Menu.Item onClick={() => handleExportGrades(selectedAssignment.id, 'excel')}>
                        导出Excel
                      </Menu.Item>
                      <Menu.Item onClick={() => handleExportGrades(selectedAssignment.id, 'csv')}>
                        导出CSV
                      </Menu.Item>
                    </Menu>
                  }
                >
                  <Button icon={<DownloadOutlined />}>
                    导出成绩 <MoreOutlined />
                  </Button>
                </Dropdown>
              </Space>

              {/* 提交列表 */}
              <Table
                columns={submissionColumns}
                dataSource={submissions}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                size="small"
              />
            </TabPane>
          )}
        </Tabs>
      </Card>

      {/* 创建作业模态框 */}
      <Modal
        title="创建作业"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateAssignment}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="title"
                label="作业标题"
                rules={[{ required: true, message: '请输入作业标题' }]}
              >
                <Input placeholder="输入作业标题" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="作业类型"
                rules={[{ required: true, message: '请选择作业类型' }]}
              >
                <Select placeholder="选择作业类型">
                  <Option value="homework">作业</Option>
                  <Option value="quiz">测验</Option>
                  <Option value="project">项目</Option>
                  <Option value="exam">考试</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="totalPoints"
                label="总分"
                rules={[{ required: true, message: '请输入总分' }]}
              >
                <Input type="number" placeholder="100" />
              </Form.Item>
            </Col>
          </Row>

          {!courseId && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="courseId"
                  label="课程"
                  rules={[{ required: true, message: '请选择课程' }]}
                >
                  <Select placeholder="选择课程">
                    {courses.map(course => (
                      <Option key={course.id} value={course.id}>
                        {course.name} ({course.courseCode})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="dueDate"
                label="截止时间"
                rules={[{ required: true, message: '请选择截止时间' }]}
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: '100%' }}
                  placeholder="选择截止时间"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="description"
                label="作业描述"
                rules={[{ required: true, message: '请输入作业描述' }]}
              >
                <TextArea 
                  rows={6} 
                  placeholder="详细描述作业要求、提交格式等"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建作业
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

      {/* 批改作业模态框 */}
      <Modal
        title="批改作业"
        open={gradeModalVisible}
        onCancel={() => {
          setGradeModalVisible(false);
          gradeForm.resetFields();
          setSelectedSubmission(null);
        }}
        footer={null}
        width={600}
      >
        {selectedSubmission && (
          <div>
            {/* 学生信息 */}
            <Alert
              message={`学生：${selectedSubmission.student.firstName}${selectedSubmission.student.lastName} (${selectedSubmission.student.studentId})`}
              type="info"
              style={{ marginBottom: 16 }}
            />

            {/* 提交内容 */}
            <Card title="提交内容" style={{ marginBottom: 16 }}>
              <div>{selectedSubmission.content}</div>
              {selectedSubmission.fileUrl && (
                <div style={{ marginTop: 8 }}>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => {
                      window.open(`http://localhost:3000${selectedSubmission.fileUrl}`, '_blank');
                    }}
                  >
                    下载附件
                  </Button>
                </div>
              )}
            </Card>

            {/* 批改表单 */}
            <Form
              form={gradeForm}
              layout="vertical"
              onFinish={handleGradeSubmission}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="score"
                    label="得分"
                    rules={[
                      { required: true, message: '请输入得分' },
                      { type: 'number', min: 0, max: selectedAssignment?.totalPoints || 100, message: `得分应在0-${selectedAssignment?.totalPoints || 100}之间` }
                    ]}
                  >
                    <Input 
                      type="number" 
                      placeholder="输入得分"
                      suffix={`/ ${selectedAssignment?.totalPoints || 100}`}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <div style={{ marginTop: 30 }}>
                    <Text type="secondary">
                      总分：{selectedAssignment?.totalPoints || 100}分
                    </Text>
                  </div>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="feedback"
                    label="批改意见"
                  >
                    <TextArea 
                      rows={4} 
                      placeholder="输入批改意见和建议"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">
                    保存批改
                  </Button>
                  <Button onClick={() => {
                    setGradeModalVisible(false);
                    gradeForm.resetFields();
                    setSelectedSubmission(null);
                  }}>
                    取消
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AssignmentManagement;