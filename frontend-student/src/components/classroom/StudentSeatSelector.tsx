import React, { useState, useEffect } from 'react';
import { Card, Button, message, Modal, Avatar, Tag, Row, Col, Statistic, Alert, Form, Input } from 'antd';
import { 
  UserOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  StopOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { io, Socket } from 'socket.io-client';
import { request } from '../../services/api';
import './StudentSeatSelector.less';

export interface SeatData {
  id: string;
  classroomId: string;
  seatNumber: string;
  studentId?: string;
  sessionDate: Date;
  sessionNumber: string;
  status: 'available' | 'occupied' | 'reserved' | 'unavailable';
  selectedAt?: Date;
  attendanceConfirmed: boolean;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string;
  };
  row: number;
  column: number;
}

export interface ClassroomData {
  id: string;
  name: string;
  location?: string;
  capacity: number;
  rows: number;
  seatsPerRow: number;
  layoutConfig?: {
    aisles?: number[];
    unavailableSeats?: string[];
    specialSeats?: {
      wheelchair?: string[];
      reserved?: string[];
      vip?: string[];
      observer?: string[];
      frontPriority?: string[];
    };
    spacing?: {
      horizontal?: number;
      vertical?: number;
    };
  };
  seatMapEnabled: boolean;
  freeSeatingEnabled: boolean;
}

export interface SeatMapData {
  classroom: ClassroomData;
  seats: SeatData[];
  sessionDate: string;
  sessionNumber: string;
}

interface StudentSeatSelectorProps {
  courseId: string;
  sessionId?: string;
  studentInfo: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string;
  };
  onCheckInSuccess?: () => void;
}

const StudentSeatSelector: React.FC<StudentSeatSelectorProps> = ({
  courseId,
  sessionId,
  studentInfo,
  onCheckInSuccess,
}) => {
  const [seatMapData, setSeatMapData] = useState<SeatMapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<SeatData | null>(null);
  const [myCurrentSeat, setMyCurrentSeat] = useState<SeatData | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'pending' | 'active' | 'ended'>('pending');
  const [onlineCount, setOnlineCount] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [studentForm] = Form.useForm();

  useEffect(() => {
    if (sessionId) {
      loadSeatMap();
      initializeSocket();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [sessionId]);

  useEffect(() => {
    // 检查是否已有选座
    if (seatMapData) {
      const mySeat = seatMapData.seats.find(seat => 
        seat.studentId === studentInfo.id && seat.status === 'occupied'
      );
      setMyCurrentSeat(mySeat || null);
    }
  }, [seatMapData, studentInfo.id]);

  const loadSeatMap = async () => {
    if (!sessionId) return;
    
    setLoading(true);
    try {
      const data: SeatMapData = await request.get(`/classrooms/session/${sessionId}/seat-map`);
      setSeatMapData(data);
    } catch (error: any) {
      console.error('Failed to load seat map:', error);
      message.error(error.message || '获取座位图失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const initializeSocket = () => {
    const newSocket = io('/classrooms', {
      query: {
        userId: studentInfo.id,
      },
      auth: {
        token: localStorage.getItem('access_token'),
      },
    });

    newSocket.on('connect', () => {
      console.log('Connected to classroom socket');
      
      if (seatMapData) {
        newSocket.emit('join_classroom', {
          classroomId: seatMapData.classroom.id,
          sessionDate: seatMapData.sessionDate,
          timeSlot: seatMapData.sessionNumber,
        });
      }
    });

    newSocket.on('seat_map_initial', (data: SeatMapData) => {
      setSeatMapData(data);
    });

    newSocket.on('seat_map_update', (update: any) => {
      setSeatMapData(prevData => {
        if (!prevData) return prevData;
        
        const updatedSeats = prevData.seats.map(seat => {
          if (seat.seatNumber === update.seatId) {
            return {
              ...seat,
              status: update.status,
              studentId: update.studentId,
              attendanceConfirmed: update.attendanceConfirmed,
              selectedAt: update.status === 'occupied' ? new Date() : undefined,
            };
          }
          return seat;
        });

        return {
          ...prevData,
          seats: updatedSeats,
        };
      });
    });

    newSocket.on('online_count_update', (data: { count: number }) => {
      setOnlineCount(data.count);
    });

    newSocket.on('class_started', () => {
      setSessionStatus('active');
      message.info('课程已开始，请尽快选座签到');
    });

    newSocket.on('class_ended', () => {
      setSessionStatus('ended');
      message.info('课程已结束');
    });

    newSocket.on('attendance_confirmed', (data: any) => {
      if (data.studentId === studentInfo.id) {
        message.success('签到成功！');
        if (onCheckInSuccess) {
          onCheckInSuccess();
        }
      }
    });

    setSocket(newSocket);
  };

  const handleSeatClick = (seat: SeatData) => {
    if (seat.status === 'occupied' || seat.status === 'unavailable' || seat.status === 'reserved') {
      return;
    }

    if (myCurrentSeat) {
      message.warning('您已选择座位，如需更换请先取消当前座位');
      return;
    }

    setSelectedSeat(seat);
    studentForm.resetFields();
    setIsModalVisible(true);
  };

  const confirmSeatSelection = async () => {
    if (!selectedSeat || !sessionId) return;

    try {
      await studentForm.validateFields();
    } catch (error) {
      return;
    }

    setConfirmLoading(true);
    try {
      const formData = studentForm.getFieldsValue();
      await request.post(`/classrooms/session/${sessionId}/select-seat`, {
        seatNumber: selectedSeat.seatNumber,
        studentId: formData.studentId,
        name: formData.name,
      });

      // 广播座位更新
      if (socket && seatMapData) {
        socket.emit('select_seat', {
          classroomId: seatMapData.classroom.id,
          sessionDate: seatMapData.sessionDate,
          timeSlot: seatMapData.sessionNumber,
          seatId: selectedSeat.seatNumber,
          studentId: studentInfo.id,
          status: 'occupied',
          attendanceConfirmed: true,
        });
      }

      message.success('选座成功，签到完成！');
      setMyCurrentSeat(selectedSeat);
      setIsModalVisible(false);
      setSelectedSeat(null);
      studentForm.resetFields();

      // 刷新座位图
      await loadSeatMap();

      if (onCheckInSuccess) {
        onCheckInSuccess();
      }
    } catch (error: any) {
      console.error('Failed to select seat:', error);
      message.error(error.message || '选座失败，请重试');
    } finally {
      setConfirmLoading(false);
    }
  };

  const cancelCurrentSeat = async () => {
    if (!myCurrentSeat || !sessionId) return;

    Modal.confirm({
      title: '确认取消座位',
      content: `确定要取消座位 ${myCurrentSeat.seatNumber} 吗？取消后需要重新选座。`,
      okText: '确认取消',
      cancelText: '保持当前座位',
      onOk: async () => {
        try {
          await request.post(`/classrooms/session/${sessionId}/cancel-seat`, {
            seatNumber: myCurrentSeat.seatNumber,
            studentId: studentInfo.id,
          });

          // 广播座位更新
          if (socket && seatMapData) {
            socket.emit('select_seat', {
              classroomId: seatMapData.classroom.id,
              sessionDate: seatMapData.sessionDate,
              timeSlot: seatMapData.sessionNumber,
              seatId: myCurrentSeat.seatNumber,
              studentId: null,
              status: 'available',
              attendanceConfirmed: false,
            });
          }

          message.success('已取消座位选择');
          setMyCurrentSeat(null);
          await loadSeatMap();
        } catch (error: any) {
          console.error('Failed to cancel seat:', error);
          message.error(error.message || '取消座位失败，请重试');
        }
      },
    });
  };

  const getSeatColor = (seat: SeatData): string => {
    if (seat.studentId === studentInfo.id) {
      return '#52c41a'; // 我的座位 - 绿色
    }
    
    switch (seat.status) {
      case 'available':
        return '#f0f0f0';
      case 'occupied':
        return '#ff7a45'; // 已被他人占用 - 橙红色
      case 'reserved':
        return '#1890ff';
      case 'unavailable':
        return '#ff4d4f';
      default:
        return '#f0f0f0';
    }
  };

  const getSeatIcon = (seat: SeatData) => {
    if (seat.studentId === studentInfo.id) {
      return <CheckCircleOutlined />;
    }
    
    switch (seat.status) {
      case 'occupied':
        return <UserOutlined />;
      case 'reserved':
        return <ClockCircleOutlined />;
      case 'unavailable':
        return <StopOutlined />;
      default:
        return null;
    }
  };

  const renderSeat = (seat: SeatData) => {
    const isMyCurrentSeat = seat.studentId === studentInfo.id;
    const isClickable = seat.status === 'available' && !myCurrentSeat && sessionStatus === 'active';
    const isAisle = seatMapData?.classroom.layoutConfig?.aisles?.includes(seat.column);
    
    return (
      <div key={seat.id} className="seat-container">
        <div
          className={`seat ${seat.status} ${isMyCurrentSeat ? 'my-seat' : ''} ${isClickable ? 'clickable' : ''}`}
          style={{
            backgroundColor: getSeatColor(seat),
            marginRight: isAisle ? '20px' : '4px',
          }}
          onClick={() => isClickable && handleSeatClick(seat)}
          title={
            isMyCurrentSeat 
              ? '我的座位'
              : seat.status === 'occupied' && seat.student
                ? `${seat.student.firstName}${seat.student.lastName} (${seat.student.studentId})`
                : seat.seatNumber
          }
        >
          <div className="seat-number">{seat.seatNumber}</div>
          <div className="seat-icon">{getSeatIcon(seat)}</div>
          {isMyCurrentSeat && (
            <div className="seat-student">我</div>
          )}
        </div>
      </div>
    );
  };

  const renderSeatGrid = () => {
    if (!seatMapData) return null;

    const { classroom, seats } = seatMapData;
    const seatMatrix: (SeatData | null)[][] = [];

    // 初始化座位矩阵
    for (let row = 0; row < classroom.rows; row++) {
      seatMatrix[row] = new Array(classroom.seatsPerRow).fill(null);
    }

    // 填充座位数据
    seats.forEach(seat => {
      if (seat.row > 0 && seat.column > 0 && seat.row <= classroom.rows && seat.column <= classroom.seatsPerRow) {
        seatMatrix[seat.row - 1][seat.column - 1] = seat;
      }
    });

    return (
      <div className="seat-grid">
        <div className="podium">
          <div className="podium-label">讲台</div>
        </div>
        {seatMatrix.map((row, rowIndex) => (
          <div key={rowIndex} className="seat-row">
            <div className="row-label">{String.fromCharCode(65 + rowIndex)}</div>
            <div className="seats">
              {row.map((seat, colIndex) => {
                if (!seat) {
                  return <div key={colIndex} className="empty-seat" />;
                }
                return renderSeat(seat);
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const getStats = () => {
    if (!seatMapData) {
      return { total: 0, occupied: 0, available: 0 };
    }

    const stats = seatMapData.seats.reduce(
      (acc, seat) => {
        acc.total++;
        if (seat.status === 'occupied') {
          acc.occupied++;
        } else if (seat.status === 'available') {
          acc.available++;
        }
        return acc;
      },
      { total: 0, occupied: 0, available: 0 }
    );

    return stats;
  };

  if (!sessionId) {
    return (
      <Card>
        <Alert
          message="签到未开启"
          description="老师还未开启座位签到，请等待课程开始。"
          type="info"
          showIcon
        />
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <div>加载座位图中...</div>
        </div>
      </Card>
    );
  }

  if (!seatMapData) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <div>无法获取座位图数据</div>
          <Button 
            type="primary" 
            icon={<ReloadOutlined />} 
            onClick={loadSeatMap}
            style={{ marginTop: 16 }}
          >
            重新加载
          </Button>
        </div>
      </Card>
    );
  }

  const stats = getStats();

  return (
    <div className="student-seat-selector">
      {/* 状态信息栏 */}
      <Card className="status-info" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="课堂状态" value={sessionStatus === 'active' ? '进行中' : sessionStatus === 'ended' ? '已结束' : '准备中'} />
          </Col>
          <Col span={6}>
            <Statistic title="可选座位" value={stats.available} valueStyle={{ color: '#52c41a' }} />
          </Col>
          <Col span={6}>
            <Statistic title="已占用" value={stats.occupied} valueStyle={{ color: '#ff7a45' }} />
          </Col>
          <Col span={6}>
            <Statistic title="在线人数" value={onlineCount} valueStyle={{ color: '#1890ff' }} />
          </Col>
        </Row>

        {myCurrentSeat && (
          <Alert
            message={`您已选择座位: ${myCurrentSeat.seatNumber}`}
            description="签到成功！如需更换座位，请点击下方取消按钮。"
            type="success"
            showIcon
            style={{ marginTop: 16 }}
            action={
              <Button size="small" danger onClick={cancelCurrentSeat}>
                取消座位
              </Button>
            }
          />
        )}

        {!myCurrentSeat && sessionStatus === 'active' && (
          <Alert
            message="请选择座位完成签到"
            description="点击可选座位（灰色）完成签到，座位一旦确认将无法更改。"
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}

        {sessionStatus === 'ended' && (
          <Alert
            message="课程已结束"
            description="签到时间已截止。"
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}

        <div style={{ marginTop: 16 }}>
          <Tag color="default">可选</Tag>
          <Tag color="success">我的座位</Tag>
          <Tag color="warning">已占用</Tag>
          <Tag color="blue">预留</Tag>
          <Tag color="error">不可用</Tag>
        </div>
      </Card>

      {/* 座位图 */}
      <Card 
        title={`${seatMapData.classroom.name} - 选择座位`}
        extra={
          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadSeatMap}
          >
            刷新
          </Button>
        }
      >
        {renderSeatGrid()}
      </Card>

      {/* 选座确认对话框 */}
      <Modal
        title="🚀 座位选择与签到"
        open={isModalVisible}
        onOk={confirmSeatSelection}
        onCancel={() => {
          setIsModalVisible(false);
          studentForm.resetFields();
        }}
        confirmLoading={confirmLoading}
        okText="🎯 确认选座签到"
        cancelText="❌ 取消"
        width={500}
      >
        {selectedSeat && (
          <div style={{ padding: '20px 0' }}>
            <div style={{ textAlign: 'center', marginBottom: 30 }}>
              <Avatar 
                size={80} 
                icon={<UserOutlined />}
                style={{
                  background: 'linear-gradient(145deg, #1890ff, #52c41a)',
                  border: '2px solid #1890ff'
                }}
              />
              <div style={{ fontSize: 20, fontWeight: 'bold', margin: '16px 0 8px', color: '#1890ff' }}>
                座位 {selectedSeat.seatNumber}
              </div>
              <div style={{ color: '#666', marginBottom: 20 }}>
                请填写您的学号和姓名完成签到
              </div>
            </div>
            
            <Form
              form={studentForm}
              layout="vertical"
              requiredMark={false}
            >
              <Form.Item
                name="studentId"
                label="学号"
                rules={[
                  { required: true, message: '请输入学号' },
                  { pattern: /^[A-Za-z0-9]+$/, message: '学号只能包含字母和数字' },
                  { min: 6, max: 20, message: '学号长度应在6-20位之间' }
                ]}
              >
                <Input 
                  placeholder="请输入您的学号" 
                  size="large"
                  autoFocus
                />
              </Form.Item>
              
              <Form.Item
                name="name"
                label="姓名"
                rules={[
                  { required: true, message: '请输入姓名' },
                  { min: 2, max: 10, message: '姓名长度应在2-10位之间' },
                  { pattern: /^[\u4e00-\u9fa5a-zA-Z\s]+$/, message: '姓名只能包含中文、英文字母' }
                ]}
              >
                <Input 
                  placeholder="请输入您的真实姓名" 
                  size="large"
                />
              </Form.Item>
            </Form>
            
            <Alert
              message="签到须知"
              description="请确保填写的学号和姓名信息准确无误，提交后将完成课堂签到。"
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StudentSeatSelector;