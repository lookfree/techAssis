import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, Form, Input, message, Typography, Space } from 'antd';
import { UserOutlined, CheckOutlined } from '@ant-design/icons';
import { request } from '../../services/api';

const { Text, Title } = Typography;

interface Seat {
  id: string;
  classroomId: string;
  seatId: string;
  studentId?: string;
  sessionDate: Date;
  timeSlot: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'UNAVAILABLE';
  selectedAt?: Date;
  attendanceConfirmed: boolean;
  student?: any;
  row: number;
  seatNumber: number;
}

interface Classroom {
  id: string;
  name: string;
  location?: string;
  type: string;
  capacity: number;
  rows: number;
  seatsPerRow: number;
  layoutConfig?: any;
}

interface SeatMapProps {
  courseId: string;
  sessionId?: string;
}

const SeatMap: React.FC<SeatMapProps> = ({ courseId, sessionId }) => {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadSeatMap();
  }, [courseId]);

  const loadSeatMap = async () => {
    setLoading(true);
    try {
      // 这里需要根据课程ID获取对应的教室和座位图
      const response = await request.get(`/courses/${courseId}/seat-map`);
      setSeats(response.seats || []);
      setClassroom(response.classroom);
    } catch (error) {
      message.error('加载座位图失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSeatClick = (seat: Seat) => {
    if (seat.status === 'OCCUPIED' || seat.status === 'UNAVAILABLE') {
      return;
    }

    setSelectedSeat(seat);
    setModalVisible(true);
  };

  const handleConfirmSeat = async () => {
    try {
      const values = await form.validateFields();
      
      if (!sessionId || !selectedSeat) {
        message.error('缺少必要参数');
        return;
      }

      await request.post(`/classrooms/sessions/${sessionId}/select-seat`, {
        seatId: selectedSeat.seatId,
        studentId: values.studentId,
        name: values.name,
        verificationPhoto: values.verificationPhoto,
      });

      message.success('签到成功！');
      setModalVisible(false);
      loadSeatMap(); // 刷新座位图
    } catch (error) {
      message.error('签到失败，请重试');
    }
  };

  const getSeatColor = (seat: Seat) => {
    switch (seat.status) {
      case 'AVAILABLE':
        return '#52c41a'; // 绿色 - 可选择
      case 'OCCUPIED':
        return '#ff4d4f'; // 红色 - 已占用
      case 'RESERVED':
        return '#faad14'; // 橙色 - 预留
      case 'UNAVAILABLE':
        return '#d9d9d9'; // 灰色 - 不可用
      default:
        return '#d9d9d9';
    }
  };

  const getSeatText = (seat: Seat) => {
    if (seat.status === 'OCCUPIED' && seat.student) {
      return seat.student.firstName || '已占用';
    }
    return seat.seatId;
  };

  const renderSeat = (seat: Seat) => (
    <div
      key={seat.id}
      onClick={() => handleSeatClick(seat)}
      style={{
        width: 60,
        height: 50,
        margin: 2,
        backgroundColor: getSeatColor(seat),
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: seat.status === 'AVAILABLE' ? 'pointer' : 'not-allowed',
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        position: 'relative',
        background: seat.status === 'AVAILABLE' ? 
          'linear-gradient(135deg, rgba(82,196,26,0.9) 0%, rgba(82,196,26,0.7) 100%)' : 
          getSeatColor(seat),
        backdropFilter: seat.status === 'AVAILABLE' ? 'blur(10px)' : 'none',
        border: seat.status === 'AVAILABLE' ? '1px solid rgba(255,255,255,0.3)' : 'none',
        transition: 'all 0.3s ease',
        transform: 'translateZ(0)',
      }}
      onMouseEnter={(e) => {
        if (seat.status === 'AVAILABLE') {
          e.currentTarget.style.transform = 'scale(1.05) translateZ(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(82,196,26,0.4)';
        }
      }}
      onMouseLeave={(e) => {
        if (seat.status === 'AVAILABLE') {
          e.currentTarget.style.transform = 'scale(1) translateZ(0)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        }
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div>{getSeatText(seat)}</div>
        {seat.status === 'OCCUPIED' && (
          <CheckOutlined style={{ fontSize: 10, marginTop: 2 }} />
        )}
        {seat.status === 'AVAILABLE' && (
          <UserOutlined style={{ fontSize: 10, marginTop: 2, opacity: 0.7 }} />
        )}
      </div>
    </div>
  );

  const renderClassroom = () => {
    if (!classroom || seats.length === 0) {
      return (
        <div style={{ 
          textAlign: 'center', 
          padding: 40,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}>
          <Text type="secondary">暂未开始上课或没有绑定教室</Text>
        </div>
      );
    }

    const seatsByRow: { [key: number]: Seat[] } = {};
    seats.forEach(seat => {
      if (!seatsByRow[seat.row]) {
        seatsByRow[seat.row] = [];
      }
      seatsByRow[seat.row].push(seat);
    });

    // 按座位号排序
    Object.keys(seatsByRow).forEach(row => {
      seatsByRow[parseInt(row)].sort((a, b) => a.seatNumber - b.seatNumber);
    });

    return (
      <div style={{ 
        padding: 20,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
        backdropFilter: 'blur(20px)',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.3)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* 讲台 */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: 30,
          padding: '10px 40px',
          background: 'linear-gradient(135deg, rgba(24,144,255,0.8) 0%, rgba(24,144,255,0.6) 100%)',
          backdropFilter: 'blur(10px)',
          borderRadius: 15,
          color: 'white',
          fontWeight: 'bold',
          border: '1px solid rgba(255,255,255,0.3)',
        }}>
          讲台
        </div>

        {/* 座位区域 */}
        <div>
          {Object.keys(seatsByRow).map(rowNum => (
            <div key={rowNum} style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              marginBottom: 8,
              alignItems: 'center'
            }}>
              <div style={{ 
                marginRight: 15, 
                color: '#666', 
                fontWeight: 'bold',
                minWidth: 30,
                textAlign: 'right'
              }}>
                第{rowNum}排
              </div>
              {seatsByRow[parseInt(rowNum)].map(renderSeat)}
            </div>
          ))}
        </div>

        {/* 图例 */}
        <div style={{ 
          marginTop: 30, 
          display: 'flex', 
          justifyContent: 'center',
          gap: 20,
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ 
              width: 20, 
              height: 20, 
              backgroundColor: '#52c41a', 
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.3)',
            }} />
            <Text style={{ color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
              可选择
            </Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 20, backgroundColor: '#ff4d4f', borderRadius: 4 }} />
            <Text style={{ color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
              已占用
            </Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 20, backgroundColor: '#d9d9d9', borderRadius: 4 }} />
            <Text style={{ color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
              不可用
            </Text>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <Title level={4} style={{ margin: 0, color: 'rgba(255,255,255,0.9)' }}>
              {classroom?.name || '教室座位图'}
            </Title>
            {classroom?.location && (
              <Text type="secondary" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {classroom.location}
              </Text>
            )}
          </Space>
        }
        loading={loading}
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
        headStyle={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.9)',
        }}
        bodyStyle={{ 
          background: 'transparent',
          padding: 0,
        }}
      >
        {renderClassroom()}
      </Card>

      <Modal
        title="选择座位签到"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleConfirmSeat}
        width={400}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 20 }}
        >
          <div style={{ 
            textAlign: 'center', 
            marginBottom: 20,
            padding: 15,
            background: '#f5f5f5',
            borderRadius: 8
          }}>
            <Text strong style={{ fontSize: 16 }}>
              座位: {selectedSeat?.seatId}
            </Text>
          </div>

          <Form.Item
            name="studentId"
            label="学号"
            rules={[{ required: true, message: '请输入学号' }]}
          >
            <Input placeholder="请输入您的学号" />
          </Form.Item>

          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入您的姓名" />
          </Form.Item>

          <div style={{ color: '#666', fontSize: 12 }}>
            <p>注意事项：</p>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li>请确保您的学号和姓名输入正确</li>
              <li>请坐在您选择的座位上</li>
              <li>签到成功后座位将被标记为已占用</li>
            </ul>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default SeatMap;