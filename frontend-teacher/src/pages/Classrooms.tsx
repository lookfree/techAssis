import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Card, 
  Table, 
  Modal, 
  Form, 
  Input, 
  Select, 
  InputNumber,
  Switch,
  Space,
  Typography,
  Tag,
  message,
  Tooltip,
  Row,
  Col,
  Divider 
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  SettingOutlined,
  TableOutlined
} from '@ant-design/icons';
import { request } from '../services/api';
import { Classroom, ClassroomType } from '../types';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Classrooms: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [layoutModalVisible, setLayoutModalVisible] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [form] = Form.useForm();
  const [layoutForm] = Form.useForm();

  useEffect(() => {
    loadClassrooms();
  }, []);

  const loadClassrooms = async () => {
    setLoading(true);
    try {
      const response = await request.get<Classroom[]>('/classrooms');
      setClassrooms(Array.isArray(response) ? response : []);
    } catch (error) {
      message.error('加载教室列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingClassroom(null);
    form.resetFields();
    form.setFieldsValue({
      type: ClassroomType.REGULAR,
      capacity: 50,
      rows: 6,
      seatsPerRow: 8,
      seatMapEnabled: true,
      freeSeatingEnabled: true,
    });
    setModalVisible(true);
  };

  const handleEdit = (classroom: Classroom) => {
    setEditingClassroom(classroom);
    form.setFieldsValue(classroom);
    setModalVisible(true);
  };

  const handleDelete = (classroom: Classroom) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除教室"${classroom.name}"吗？`,
      onOk: async () => {
        try {
          await request.delete(`/classrooms/${classroom.id}`);
          message.success('删除成功');
          loadClassrooms();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingClassroom) {
        await request.put(`/classrooms/${editingClassroom.id}`, values);
        message.success('更新成功');
      } else {
        await request.post('/classrooms', values);
        message.success('创建成功');
      }

      setModalVisible(false);
      loadClassrooms();
    } catch (error) {
      message.error(editingClassroom ? '更新失败' : '创建失败');
    }
  };

  const handleConfigLayout = (classroom: Classroom) => {
    setSelectedClassroom(classroom);
    layoutForm.setFieldsValue({
      rows: classroom.rows,
      seatsPerRow: classroom.seatsPerRow,
      unavailableSeats: classroom.layoutConfig?.unavailableSeats?.join(', ') || '',
    });
    setLayoutModalVisible(true);
  };

  const handleLayoutSubmit = async () => {
    try {
      const values = await layoutForm.validateFields();
      const layoutConfig = {
        unavailableSeats: values.unavailableSeats 
          ? values.unavailableSeats.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [],
      };

      await request.put(`/classrooms/${selectedClassroom?.id}`, {
        rows: values.rows,
        seatsPerRow: values.seatsPerRow,
        layoutConfig,
        capacity: values.rows * values.seatsPerRow,
      });

      message.success('座位布局更新成功');
      setLayoutModalVisible(false);
      loadClassrooms();
    } catch (error) {
      message.error('更新座位布局失败');
    }
  };

  const getClassroomTypeText = (type: ClassroomType) => {
    switch (type) {
      case ClassroomType.LECTURE_HALL:
        return '阶梯教室';
      case ClassroomType.REGULAR:
        return '普通教室';
      case ClassroomType.LAB:
        return '实验室';
      case ClassroomType.SEMINAR:
        return '研讨室';
      default:
        return type;
    }
  };

  const getClassroomTypeColor = (type: ClassroomType) => {
    switch (type) {
      case ClassroomType.LECTURE_HALL:
        return 'blue';
      case ClassroomType.REGULAR:
        return 'green';
      case ClassroomType.LAB:
        return 'orange';
      case ClassroomType.SEMINAR:
        return 'purple';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: '教室名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Space>
          <EnvironmentOutlined />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
      render: (text: string) => text || '-',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: ClassroomType) => (
        <Tag color={getClassroomTypeColor(type)}>
          {getClassroomTypeText(type)}
        </Tag>
      ),
    },
    {
      title: '容量',
      dataIndex: 'capacity',
      key: 'capacity',
      render: (capacity: number) => (
        <Space>
          <TeamOutlined />
          <Text>{capacity} 人</Text>
        </Space>
      ),
    },
    {
      title: '座位布局',
      key: 'layout',
      render: (_: any, record: Classroom) => (
        <Text type="secondary">
          {record.rows} 排 × {record.seatsPerRow} 列
        </Text>
      ),
    },
    {
      title: '绑定课程',
      dataIndex: 'course',
      key: 'course',
      render: (course: any) => course ? (
        <Tag color="blue">{course.name}</Tag>
      ) : (
        <Text type="secondary">未绑定</Text>
      ),
    },
    {
      title: '功能状态',
      key: 'features',
      render: (_: any, record: Classroom) => (
        <Space>
          {record.seatMapEnabled && (
            <Tooltip title="已启用座位图">
              <Tag color="success">座位图</Tag>
            </Tooltip>
          )}
          {record.freeSeatingEnabled && (
            <Tooltip title="允许自由选座">
              <Tag color="processing">自由选座</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Classroom) => (
        <Space>
          <Tooltip title="配置座位布局">
            <Button 
              type="link" 
              icon={<TableOutlined />}
              onClick={() => handleConfigLayout(record)}
            >
              座位布局
            </Button>
          </Tooltip>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button 
            type="link" 
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>教室管理</Title>
          <Text type="secondary">管理所有教室和座位布局</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          创建教室
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={classrooms}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 个教室`,
          }}
        />
      </Card>

      {/* 创建/编辑教室模态框 */}
      <Modal
        title={editingClassroom ? '编辑教室' : '创建教室'}
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
                label="教室名称"
                rules={[{ required: true, message: '请输入教室名称' }]}
              >
                <Input placeholder="如：教学楼A101" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="location"
                label="位置"
              >
                <Input placeholder="如：教学楼A栋1楼" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="教室类型"
                rules={[{ required: true, message: '请选择教室类型' }]}
              >
                <Select placeholder="请选择教室类型">
                  <Option value={ClassroomType.LECTURE_HALL}>阶梯教室</Option>
                  <Option value={ClassroomType.REGULAR}>普通教室</Option>
                  <Option value={ClassroomType.LAB}>实验室</Option>
                  <Option value={ClassroomType.SEMINAR}>研讨室</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="capacity"
                label="教室容量"
                rules={[{ required: true, message: '请输入教室容量' }]}
              >
                <InputNumber 
                  min={1} 
                  max={500} 
                  placeholder="最大容纳人数" 
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="rows"
                label="座位排数"
                rules={[{ required: true, message: '请输入座位排数' }]}
              >
                <InputNumber 
                  min={1} 
                  max={20} 
                  placeholder="教室座位排数" 
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="seatsPerRow"
                label="每排座位数"
                rules={[{ required: true, message: '请输入每排座位数' }]}
              >
                <InputNumber 
                  min={1} 
                  max={30} 
                  placeholder="每排座位数量" 
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="教室描述"
          >
            <TextArea rows={3} placeholder="教室的详细描述信息" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="seatMapEnabled"
                label="启用座位图"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="freeSeatingEnabled"
                label="允许自由选座"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 座位布局配置模态框 */}
      <Modal
        title="配置座位布局"
        open={layoutModalVisible}
        onCancel={() => setLayoutModalVisible(false)}
        onOk={handleLayoutSubmit}
        width={500}
        destroyOnClose
      >
        <Form
          form={layoutForm}
          layout="vertical"
          style={{ marginTop: 20 }}
        >
          <div style={{ 
            marginBottom: 20, 
            padding: 15, 
            background: '#f5f5f5', 
            borderRadius: 8 
          }}>
            <Text strong>教室：{selectedClassroom?.name}</Text>
            <br />
            <Text type="secondary">当前容量：{selectedClassroom?.capacity} 人</Text>
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="rows"
                label="座位排数"
                rules={[{ required: true, message: '请输入座位排数' }]}
              >
                <InputNumber 
                  min={1} 
                  max={20} 
                  placeholder="座位排数" 
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="seatsPerRow"
                label="每排座位数"
                rules={[{ required: true, message: '请输入每排座位数' }]}
              >
                <InputNumber 
                  min={1} 
                  max={30} 
                  placeholder="每排座位数" 
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="unavailableSeats"
            label="不可用座位"
            extra="输入座位编号，用英文逗号分隔，如：A1, A2, B5"
          >
            <TextArea 
              rows={3} 
              placeholder="如：A1, A2, B5（表示这些座位不可用）" 
            />
          </Form.Item>

          <div style={{ color: '#666', fontSize: 12 }}>
            <p>座位编号规则：</p>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li>排号用字母表示：A, B, C...</li>
              <li>座位号用数字表示：1, 2, 3...</li>
              <li>完整座位编号：A1表示第1排第1个座位</li>
            </ul>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Classrooms;