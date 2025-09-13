import React, { useState, useEffect } from 'react';
import { Card, Button, message, Modal, Avatar, Tag, Row, Col, Alert, Form, Input } from 'antd';
import { 
  UserOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  StopOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { io, Socket } from 'socket.io-client';
import { request } from '../../services/api';

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
  attendanceId?: string;
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
  attendanceId,
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
  const [currentAttendanceId, setCurrentAttendanceId] = useState<string | undefined>(attendanceId);
  const [studentForm] = Form.useForm();

  useEffect(() => {
    if (sessionId) {
      loadSeatMap();
      initializeSocket();
      // If we don't have an attendance ID, try to fetch it
      if (!currentAttendanceId) {
        fetchAttendanceRecord();
      }
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    // 检查是否已有选座 - 使用学号进行匹配
    if (seatMapData && studentInfo.studentId) {
      const mySeat = seatMapData.seats.find(seat => 
        seat.studentId === studentInfo.studentId && (seat.status === 'occupied' || seat.attendanceConfirmed)
      );
      console.log('🔍 Checking for my current seat:', {
        studentId: studentInfo.studentId,
        foundSeat: mySeat,
        allSeats: seatMapData.seats.map(s => ({ 
          seatNumber: s.seatNumber, 
          studentId: s.studentId, 
          status: s.status,
          attendanceConfirmed: s.attendanceConfirmed 
        }))
      });
      
      // 直接设置找到的座位状态
      if (mySeat) {
        console.log('✅ Found my seat, updating myCurrentSeat to:', mySeat);
        setMyCurrentSeat(mySeat);
      } else {
        console.log('❌ No seat found for me');
        setMyCurrentSeat(null);
      }
    }
  }, [seatMapData, studentInfo.studentId]); // 移除 myCurrentSeat 依赖避免循环

  const fetchAttendanceRecord = async () => {
    if (!courseId || !studentInfo.id) return;
    
    try {
      // Try to get the attendance record for this course and student
      const attendanceData = await request.get(`/attendance/student/${studentInfo.id}/course/${courseId}/current`);
      if (attendanceData?.id) {
        setCurrentAttendanceId(attendanceData.id);
      }
    } catch (error: any) {
      console.log('No attendance record found, will be created on first check-in');
    }
  };

  const loadSeatMap = async () => {
    if (!sessionId) return;
    
    setLoading(true);
    try {
      const data: SeatMapData = await request.get(`/classrooms/sessions/${sessionId}/seat-map`);
      console.log('📊 Loaded seat map data:', data);
      
      setSeatMapData(data);
      
      // 立即检查是否有自己的座位 - 使用学号匹配
      const mySeat = data.seats.find(seat => 
        seat.studentId === studentInfo.studentId && (seat.status === 'occupied' || seat.attendanceConfirmed)
      );
      
      if (mySeat) {
        console.log('🎯 Found my seat immediately after loading:', mySeat);
        setMyCurrentSeat(mySeat);
      } else {
        console.log('❌ No seat found for student:', studentInfo.studentId);
        console.log('🔍 All seats:', data.seats.map(s => ({ 
          seatNumber: s.seatNumber, 
          studentId: s.studentId, 
          status: s.status,
          attendanceConfirmed: s.attendanceConfirmed 
        })));
        setMyCurrentSeat(null);
      }
      
    } catch (error: any) {
      console.error('Failed to load seat map:', error);
      message.error(error.message || '获取座位图失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const initializeSocket = () => {
    const newSocket = io('http://localhost:3000/classrooms', {
      query: {
        userId: studentInfo.id,
        userType: 'student'
      },
      auth: {
        token: localStorage.getItem('token') || localStorage.getItem('access_token'),
      },
    });

    newSocket.on('connect', () => {
      console.log('🟢 Student connected to classroom socket:', newSocket.id);
      
      // Always try to join if we have seat map data
      if (seatMapData) {
        const roomData = {
          classroomId: seatMapData.classroom.id,
          sessionDate: seatMapData.sessionDate,
          timeSlot: seatMapData.sessionNumber,
        };
        console.log('🏛️ Joining classroom room:', roomData);
        newSocket.emit('join_classroom', roomData);
      }
    });
    
    // Join room immediately if already connected
    if (newSocket.connected && seatMapData) {
      const roomData = {
        classroomId: seatMapData.classroom.id,
        sessionDate: seatMapData.sessionDate,
        timeSlot: seatMapData.sessionNumber,
      };
      console.log('🏛️ Immediately joining classroom room:', roomData);
      newSocket.emit('join_classroom', roomData);
    }

    newSocket.on('seat_map_initial', (data: SeatMapData) => {
      setSeatMapData(data);
    });

    newSocket.on('seat_map_update', (update: any) => {
      console.log('🪑 Received seat_map_update:', update);
      setSeatMapData(prevData => {
        if (!prevData) return prevData;
        
        const updatedSeats = prevData.seats.map(seat => {
          if (seat.seatNumber === update.seatId) {
            const updatedSeat = {
              ...seat,
              status: update.status,
              studentId: update.studentId,
              attendanceConfirmed: update.attendanceConfirmed || false,
              selectedAt: update.status === 'occupied' ? new Date() : undefined,
            };
            console.log(`🔄 Updated seat ${seat.seatNumber}:`, updatedSeat);
            return updatedSeat;
          }
          return seat;
        });

        const newData = {
          ...prevData,
          seats: updatedSeats,
        };
        
        // Update myCurrentSeat if it's the current student's seat - use studentId
        const myUpdatedSeat = updatedSeats.find(s => s.studentId === studentInfo.studentId);
        if (myUpdatedSeat) {
          console.log('👤 Found my updated seat:', myUpdatedSeat);
          setMyCurrentSeat(myUpdatedSeat);
        } else if (update.studentId === studentInfo.studentId && update.status === 'available') {
          // If this student's seat was released
          console.log('🔓 My seat was released');
          setMyCurrentSeat(null);
        }
        
        return newData;
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
      if (data.studentId === studentInfo.studentId) {
        message.success('签到成功！');
        if (onCheckInSuccess) {
          onCheckInSuccess();
        }
      }
    });

    setSocket(newSocket);
  };

  const handleSeatClick = (seat: SeatData) => {
    console.log('座位被点击了:', seat.seatNumber, seat.status, 'sessionStatus:', sessionStatus);
    
    if (seat.status === 'occupied' || seat.status === 'unavailable' || seat.status === 'reserved') {
      console.log('座位不可选择:', seat.status);
      if (seat.status === 'occupied' && seat.studentId === studentInfo.studentId) {
        message.info(`您已在座位 ${seat.seatNumber} 签到成功！无需重复签到。`);
      } else {
        message.info('此座位不可选择');
      }
      return;
    }

    if (sessionStatus === 'ended') {
      console.log('课程已结束:', sessionStatus);
      message.warning('课程已结束，无法选座');
      return;
    }

    if (myCurrentSeat) {
      message.warning(`您已在座位 ${myCurrentSeat.seatNumber} 完成签到，如需更换座位，请先取消当前座位。`);
      return;
    }

    console.log('设置选中座位并显示Modal:', seat.seatNumber);
    setSelectedSeat(seat);
    
    // 预填学生信息
    studentForm.setFieldsValue({
      studentId: studentInfo.studentId || '',
      name: `${studentInfo.firstName || ''}${studentInfo.lastName || ''}`.trim() || ''
    });
    
    setIsModalVisible(true);
    
    // 确保Modal显示后聚焦到第一个输入框
    setTimeout(() => {
      const firstInput = document.querySelector('.ant-modal input');
      if (firstInput) {
        (firstInput as HTMLInputElement).focus();
      }
    }, 100);
  };

  const confirmSeatSelection = async () => {
    console.log('confirmSeatSelection called', { selectedSeat, sessionId, attendanceId: currentAttendanceId });
    if (!selectedSeat || !sessionId) {
      message.error('请先选择座位');
      return;
    }

    try {
      const formData = await studentForm.validateFields();
      console.log('Form validation passed:', formData);
    } catch (error) {
      console.error('Form validation failed:', error);
      message.error('请填写完整的学号和姓名信息');
      return;
    }

    setConfirmLoading(true);
    try {
      const formData = studentForm.getFieldsValue();
      const payload: any = {
        seatNumber: selectedSeat.seatNumber,
        studentId: formData.studentId,
        name: formData.name,
      };
      
      // Only include attendanceId if we have it
      if (currentAttendanceId) {
        payload.attendanceId = currentAttendanceId;
      }
      
      console.log('Submitting seat selection:', {
        ...payload,
        sessionId
      });
      
      const response = await request.post(`/classrooms/sessions/${sessionId}/select-seat`, payload);
      console.log('✅ Seat selection API response:', response);

      // 广播座位更新
      if (socket && seatMapData) {
        const seatUpdateData = {
          classroomId: seatMapData.classroom.id,
          sessionDate: seatMapData.sessionDate,
          timeSlot: seatMapData.sessionNumber,
          seatId: selectedSeat.seatNumber,
          studentId: studentInfo.studentId,
          status: 'occupied',
          attendanceConfirmed: true,
        };
        console.log('📡 Broadcasting seat update:', seatUpdateData);
        socket.emit('select_seat', seatUpdateData);
      }

      // 立即更新本地状态
      const updatedSeat = {
        ...selectedSeat,
        status: 'occupied' as const,
        studentId: studentInfo.id,
        attendanceConfirmed: true,
        selectedAt: new Date(),
      };
      setMyCurrentSeat(updatedSeat);
      
      // 更新座位图数据
      setSeatMapData(prevData => {
        if (!prevData) return prevData;
        return {
          ...prevData,
          seats: prevData.seats.map(seat => 
            seat.seatNumber === selectedSeat.seatNumber ? updatedSeat : seat
          ),
        };
      });

      message.success('选座成功，签到完成！');
      setIsModalVisible(false);
      setSelectedSeat(null);
      studentForm.resetFields();

      console.log('🎯 Local seat selection completed, myCurrentSeat updated to:', updatedSeat);

      // 刷新座位图以确保与服务器同步
      setTimeout(() => {
        loadSeatMap();
      }, 1000);

      if (onCheckInSuccess) {
        onCheckInSuccess();
      }
    } catch (error: any) {
      console.error('Failed to select seat:', error);
      message.error(error.response?.data?.message || error.message || '选座失败，请重试');
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
          await request.post(`/classrooms/sessions/${sessionId}/cancel-seat`, {
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
    const isClickable = (seat.status === 'available' || seat.studentId === studentInfo.id) && (sessionStatus === 'active' || sessionStatus === 'pending');
    const isAisle = seatMapData?.classroom.layoutConfig?.aisles?.includes(seat.column);
    
    // 获取座位颜色和效果
    const getSeatStyle = () => {
      const isMobile = window.innerWidth <= 768;
      const baseStyle = {
        width: isMobile ? '40px' : '55px',
        height: isMobile ? '40px' : '55px',
        borderRadius: isMobile ? '8px' : '12px',
        border: '2px solid transparent',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        position: 'relative' as const,
        fontSize: isMobile ? '9px' : '11px',
        cursor: isClickable ? 'pointer' : 'default',
        backdropFilter: 'blur(10px)',
        marginRight: isAisle ? (isMobile ? '12px' : '20px') : (isMobile ? '2px' : '4px'),
        fontWeight: '600',
        color: 'white',
        textShadow: '0 0 8px rgba(255, 255, 255, 0.3)'
      };
      
      if (isMyCurrentSeat) {
        return {
          ...baseStyle,
          background: 'linear-gradient(145deg, #52c41a, #389e0d)',
          borderColor: '#52c41a',
          boxShadow: `
            0 8px 25px rgba(82, 196, 26, 0.4),
            0 0 20px rgba(82, 196, 26, 0.6),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          `,
          animation: 'mySeatPulse 2s ease-in-out infinite'
        };
      }
      
      switch (seat.status) {
        case 'available':
          return {
            ...baseStyle,
            background: isClickable 
              ? 'linear-gradient(145deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.1))'
              : 'linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            color: 'rgba(255, 255, 255, 0.8)',
            ...(isClickable && {
              ':hover': {
                transform: 'translateY(-8px) scale(1.1)',
                background: 'linear-gradient(145deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.2))',
                boxShadow: `
                  0 12px 30px rgba(102, 126, 234, 0.4),
                  0 0 20px rgba(102, 126, 234, 0.6)
                `,
                borderColor: 'rgba(102, 126, 234, 0.8)'
              }
            })
          };
        case 'occupied':
          return {
            ...baseStyle,
            background: 'linear-gradient(145deg, #ff7a45, #ff4d4f)',
            borderColor: '#ff4d4f',
            boxShadow: `
              0 4px 20px rgba(255, 77, 79, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.2)
            `
          };
        case 'reserved':
          return {
            ...baseStyle,
            background: 'linear-gradient(145deg, #1890ff, #096dd9)',
            borderColor: '#1890ff',
            boxShadow: `
              0 4px 20px rgba(24, 144, 255, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.2)
            `
          };
        case 'unavailable':
          return {
            ...baseStyle,
            background: 'linear-gradient(145deg, rgba(255, 77, 79, 0.6), rgba(217, 54, 62, 0.4))',
            borderColor: 'rgba(255, 77, 79, 0.6)',
            color: 'rgba(255, 255, 255, 0.5)',
            opacity: 0.5,
            filter: 'grayscale(50%)'
          };
        default:
          return baseStyle;
      }
    };
    
    return (
      <div key={seat.id} style={{ display: 'inline-block', margin: '4px' }}>
        <div
          style={getSeatStyle()}
          onClick={() => isClickable && handleSeatClick(seat)}
          title={
            isMyCurrentSeat 
              ? '👑 我的座位'
              : seat.status === 'occupied' && seat.student
                ? `👤 ${seat.student.firstName}${seat.student.lastName} (${seat.student.studentId})`
                : `📋 ${seat.seatNumber}`
          }
          onMouseEnter={(e) => {
            if (isClickable) {
              e.currentTarget.style.transform = 'translateY(-8px) scale(1.1)';
              e.currentTarget.style.background = 'linear-gradient(145deg, rgba(102, 126, 234, 0.4), rgba(118, 75, 162, 0.3))';
              e.currentTarget.style.boxShadow = `
                0 15px 35px rgba(102, 126, 234, 0.4),
                0 5px 15px rgba(102, 126, 234, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.2)
              `;
              e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.8)';
              
              // 添加悬停提示
              const tooltip = document.createElement('div');
              tooltip.innerHTML = '🎯 点击选座';
              tooltip.style.cssText = `
                position: absolute;
                top: -35px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(145deg, rgba(102, 126, 234, 0.9), rgba(118, 75, 162, 0.9));
                color: white;
                padding: 6px 12px;
                border-radius: 8px;
                font-size: 11px;
                font-weight: 600;
                white-space: nowrap;
                box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
                z-index: 1000;
                animation: tooltipGlow 1s ease-in-out infinite alternate;
                pointer-events: none;
              `;
              e.currentTarget.appendChild(tooltip);
            }
          }}
          onMouseLeave={(e) => {
            if (isClickable) {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.1))';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              
              // 移除悬停提示
              const tooltip = e.currentTarget.querySelector('div:last-child');
              if (tooltip && tooltip.innerHTML === '🎯 点击选座') {
                tooltip.remove();
              }
            }
          }}
        >
          <div style={{ 
            fontSize: '10px', 
            fontWeight: '700', 
            lineHeight: 1,
            marginBottom: '4px',
            fontFamily: 'monospace'
          }}>
            {seat.seatNumber}
          </div>
          <div style={{ 
            fontSize: '16px', 
            lineHeight: 1,
            filter: 'drop-shadow(0 0 3px rgba(255, 255, 255, 0.3))'
          }}>
            {getSeatIcon(seat)}
          </div>
          {isMyCurrentSeat && (
            <>
              <div style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '20px',
                height: '20px',
                background: 'linear-gradient(45deg, #ffd700, #ff8c00)',
                border: '2px solid white',
                borderRadius: '50%',
                boxShadow: '0 0 15px rgba(255, 215, 0, 0.6)',
                animation: 'crownGlow 2s ease-in-out infinite alternate',
                zIndex: 1
              }}></div>
              <div style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                fontSize: '12px',
                zIndex: 2,
                animation: 'crownBounce 2s ease-in-out infinite'
              }}>
                👑
              </div>
              <div style={{
                position: 'absolute',
                bottom: '-4px',
                right: '-4px',
                width: '18px',
                height: '18px',
                background: 'linear-gradient(45deg, #ffd700, #ff8c00)',
                border: '2px solid white',
                borderRadius: '50%',
                fontSize: '10px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
                animation: 'studentBadgeGlow 2s ease-in-out infinite alternate'
              }}>
                我
              </div>
            </>
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
      <div style={{ 
        padding: window.innerWidth <= 768 ? '10px' : '20px',
        overflowX: 'auto',
        overflowY: 'visible',
        width: '100%',
        minWidth: 'fit-content',
        position: 'relative',
        WebkitOverflowScrolling: 'touch',
        scrollBehavior: 'smooth'
      }}>
        {/* 酷炫讲台设计 */}
        <div style={{
          width: '100%',
          height: '80px',
          background: 'linear-gradient(145deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.2))',
          border: '2px solid rgba(102, 126, 234, 0.4)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '30px',
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(10px)',
        }}>
          {/* 讲台动态边框 */}
          <div style={{
            position: 'absolute',
            inset: '0',
            background: 'linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.5), rgba(118, 75, 162, 0.5), transparent)',
            animation: 'hologramSweep 4s infinite'
          }}></div>
          
          {/* 讲台文字 */}
          <div style={{
            fontSize: '24px',
            fontWeight: '900',
            color: '#ffffff',
            textShadow: `
              0 0 10px rgba(102, 126, 234, 0.8),
              0 0 20px rgba(102, 126, 234, 0.6),
              0 0 30px rgba(102, 126, 234, 0.4)
            `,
            zIndex: 1,
            position: 'relative',
            animation: 'textGlow 3s ease-in-out infinite alternate',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            📚 讲台 PODIUM
          </div>
        </div>
        
        {/* 座位矩阵 */}
        {seatMatrix.map((row, rowIndex) => (
          <div key={rowIndex} style={{ 
            display: 'flex',
            alignItems: 'center',
            marginBottom: '12px',
            perspective: '1000px'
          }}>
            {/* 行标签 */}
            <div style={{
              width: '40px',
              textAlign: 'center',
              fontWeight: '700',
              color: 'rgba(255, 255, 255, 0.8)',
              marginRight: '15px',
              fontSize: '16px',
              textShadow: '0 0 10px rgba(102, 126, 234, 0.3)',
              fontFamily: 'monospace'
            }}>
              {String.fromCharCode(65 + rowIndex)}
            </div>
            
            {/* 座位行 */}
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'nowrap'
            }}>
              {row.map((seat, colIndex) => {
                if (!seat) {
                  return (
                    <div 
                      key={colIndex} 
                      style={{
                        width: '55px',
                        height: '55px',
                        margin: '4px'
                      }}
                    />
                  );
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
        // 座位被占用的条件：状态是occupied 或者 已确认签到
        if (seat.status === 'occupied' || seat.attendanceConfirmed) {
          acc.occupied++;
        } else if (seat.status === 'available') {
          acc.available++;
        }
        return acc;
      },
      { total: 0, occupied: 0, available: 0 }
    );
    
    console.log('📊 Seat statistics:', stats);
    console.log('🪑 Seat details:', seatMapData.seats.map(s => ({
      seatNumber: s.seatNumber,
      status: s.status,
      studentId: s.studentId,
      attendanceConfirmed: s.attendanceConfirmed
    })));

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
    <div style={{ 
      minHeight: '100vh',
      height: 'auto',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3a 50%, #2d2d5f 100%)', 
      padding: '20px',
      paddingBottom: '40px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      {/* 酷炫状态信息栏 */}
      <Card 
        style={{ 
          marginBottom: 24,
          background: 'linear-gradient(145deg, #1e1e3f, #2a2a4f)',
          border: '1px solid rgba(102, 126, 234, 0.3)',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* 动态边框光效 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '200%',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.8), transparent)',
          animation: 'hologramScan 3s infinite'
        }}></div>
        
        <Row gutter={[16, 16]}>
          {/* 我的座位状态 - 优先显示 */}
          {myCurrentSeat ? (
            <Col xs={24} sm={12}>
              <div style={{ 
                textAlign: 'center', 
                color: 'white', 
                position: 'relative',
                background: 'linear-gradient(145deg, rgba(82, 196, 26, 0.2), rgba(0, 255, 136, 0.1))',
                border: '2px solid rgba(82, 196, 26, 0.6)',
                borderRadius: '16px',
                padding: '20px',
                backdropFilter: 'blur(15px)',
                boxShadow: '0 8px 32px rgba(82, 196, 26, 0.3)',
                animation: 'mySeatGlow 3s ease-in-out infinite alternate'
              }}>
                <div style={{ 
                  fontSize: '64px', 
                  marginBottom: '8px',
                  filter: 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.8))',
                  animation: 'crownBounce 2s ease-in-out infinite'
                }}>👑</div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 'bold', 
                  marginBottom: '8px',
                  color: '#ffd700',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  textShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
                }}>我的座位</div>
                <div style={{ 
                  fontSize: '32px', 
                  fontWeight: '900',
                  color: '#52c41a',
                  textShadow: '0 0 15px rgba(82, 196, 26, 0.8)',
                  marginBottom: '8px'
                }}>{myCurrentSeat.seatNumber}</div>
                <div style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  background: 'rgba(82, 196, 26, 0.3)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid rgba(82, 196, 26, 0.5)'
                }}>
                  ✅ 签到成功 · 座位已锁定
                </div>
              </div>
            </Col>
          ) : (
            <Col xs={12} sm={6}>
              <div style={{ 
                textAlign: 'center', 
                color: 'white', 
                position: 'relative',
                background: 'linear-gradient(145deg, rgba(255, 193, 7, 0.15), rgba(255, 170, 0, 0.1))',
                border: '2px solid rgba(255, 193, 7, 0.4)',
                borderRadius: '12px',
                padding: '16px',
                backdropFilter: 'blur(10px)',
                animation: 'warningPulse 2s infinite'
              }}>
                <div style={{ 
                  fontSize: '48px', 
                  marginBottom: '8px',
                  filter: 'drop-shadow(0 0 10px rgba(255, 193, 7, 0.6))'
                }}>🎯</div>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 'bold', 
                  marginBottom: '4px',
                  color: '#ffc107',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>选座签到</div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  color: '#ffc107',
                  textShadow: '0 0 10px rgba(255, 193, 7, 0.5)'
                }}>未完成</div>
              </div>
            </Col>
          )}
          
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center', color: 'white', position: 'relative' }}>
              <div style={{ 
                fontSize: '48px', 
                marginBottom: '8px',
                filter: 'drop-shadow(0 0 10px rgba(102, 126, 234, 0.6))',
                animation: 'iconGlow 2s ease-in-out infinite alternate'
              }}>
                {sessionStatus === 'active' ? '🟢' : sessionStatus === 'ended' ? '🔴' : '🟡'}
              </div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: 'bold', 
                marginBottom: '4px',
                color: 'rgba(255, 255, 255, 0.7)',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>课堂状态</div>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold',
                color: '#667eea',
                textShadow: '0 0 10px rgba(102, 126, 234, 0.3)'
              }}>
                {sessionStatus === 'active' ? '进行中' : sessionStatus === 'ended' ? '已结束' : '准备中'}
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center', color: 'white' }}>
              <div style={{ 
                fontSize: '48px', 
                marginBottom: '8px',
                filter: 'drop-shadow(0 0 10px rgba(82, 196, 26, 0.6))' 
              }}>✅</div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: 'bold', 
                marginBottom: '4px',
                color: 'rgba(255, 255, 255, 0.7)',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>可选座位</div>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#52c41a',
                textShadow: '0 0 10px rgba(82, 196, 26, 0.5)',
                animation: 'numberGlow 2s ease-in-out infinite alternate'
              }}>{stats.available}</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center', color: 'white' }}>
              <div style={{ 
                fontSize: '48px', 
                marginBottom: '8px',
                filter: 'drop-shadow(0 0 10px rgba(255, 122, 69, 0.6))' 
              }}>🔥</div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: 'bold', 
                marginBottom: '4px',
                color: 'rgba(255, 255, 255, 0.7)',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>已占用</div>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#ff7a45',
                textShadow: '0 0 10px rgba(255, 122, 69, 0.5)',
                animation: 'numberGlow 2s ease-in-out infinite alternate'
              }}>{stats.occupied}</div>
            </div>
          </Col>
        </Row>

        {myCurrentSeat && (
          <Alert
            message={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 'bold' }}>
                <div style={{ 
                  fontSize: '24px', 
                  animation: 'crownBounce 2s ease-in-out infinite',
                }}>
                  👑
                </div>
                <span>签到成功！您的座位: {myCurrentSeat.seatNumber}</span>
                <div style={{ 
                  fontSize: '20px', 
                  animation: 'iconGlow 2s ease-in-out infinite alternate',
                }}>
                  ✅
                </div>
              </div>
            }
            description={
              <div style={{ 
                fontSize: '14px', 
                color: 'rgba(255, 255, 255, 0.9)',
                marginTop: '8px'
              }}>
                <div style={{ marginBottom: '4px' }}>🎉 恭喜您完成本次课堂签到！</div>
                <div style={{ marginBottom: '4px' }}>📍 您的座位已锁定，其他同学无法选择</div>
                <div>⚠️ 如需更换座位，请点击右侧取消按钮</div>
              </div>
            }
            type="success"
            showIcon={false}
            style={{ 
              marginTop: 16,
              background: 'linear-gradient(145deg, rgba(82, 196, 26, 0.2), rgba(0, 255, 136, 0.1))',
              border: '2px solid rgba(82, 196, 26, 0.6)',
              borderRadius: '16px',
              color: 'white',
              backdropFilter: 'blur(15px)',
              boxShadow: '0 8px 32px rgba(82, 196, 26, 0.3)',
              animation: 'successGlow 3s ease-in-out infinite alternate'
            }}
            action={
              <Button 
                size="small" 
                danger 
                onClick={cancelCurrentSeat}
                style={{
                  background: 'linear-gradient(145deg, #ff4d4f, #d9363e)',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  height: '32px',
                  padding: '0 16px'
                }}
              >
                🔄 更换座位
              </Button>
            }
          />
        )}

        {!myCurrentSeat && sessionStatus === 'active' && (
          <Alert
            message="🎯 请选择座位完成签到"
            description="💡 点击可选座位（灰色）完成签到，将弹出学号姓名填写窗口。"
            type="warning"
            showIcon
            style={{ 
              marginTop: 16,
              background: 'linear-gradient(145deg, rgba(255, 193, 7, 0.1), rgba(255, 170, 0, 0.05))',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              borderRadius: '12px',
              color: 'white',
              backdropFilter: 'blur(10px)',
              animation: 'warningPulse 2s infinite'
            }}
          />
        )}

        {sessionStatus === 'ended' && (
          <Alert
            message="⏰ 课程已结束"
            description="📝 签到时间已截止。"
            type="info"
            showIcon
            style={{ 
              marginTop: 16,
              background: 'linear-gradient(145deg, rgba(24, 144, 255, 0.1), rgba(0, 212, 255, 0.05))',
              border: '1px solid rgba(24, 144, 255, 0.3)',
              borderRadius: '12px',
              color: 'white',
              backdropFilter: 'blur(10px)'
            }}
          />
        )}

        <div style={{ 
          marginTop: 16, 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '8px',
          justifyContent: 'center'
        }}>
          <Tag style={{
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.1))',
            color: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '4px 12px'
          }}>🟦 可选</Tag>
          <Tag style={{
            background: 'linear-gradient(145deg, rgba(82, 196, 26, 0.2), rgba(0, 255, 136, 0.15))',
            color: '#52c41a',
            border: '1px solid rgba(82, 196, 26, 0.3)',
            borderRadius: '8px',
            padding: '4px 12px'
          }}>👑 我的座位</Tag>
          <Tag style={{
            background: 'linear-gradient(145deg, rgba(255, 122, 69, 0.2), rgba(255, 77, 79, 0.15))',
            color: '#ff7a45',
            border: '1px solid rgba(255, 122, 69, 0.3)',
            borderRadius: '8px',
            padding: '4px 12px'
          }}>🔥 已占用</Tag>
          <Tag style={{
            background: 'linear-gradient(145deg, rgba(24, 144, 255, 0.2), rgba(0, 212, 255, 0.15))',
            color: '#1890ff',
            border: '1px solid rgba(24, 144, 255, 0.3)',
            borderRadius: '8px',
            padding: '4px 12px'
          }}>🔒 预留</Tag>
          <Tag style={{
            background: 'linear-gradient(145deg, rgba(255, 77, 79, 0.2), rgba(217, 54, 62, 0.15))',
            color: '#ff4d4f',
            border: '1px solid rgba(255, 77, 79, 0.3)',
            borderRadius: '8px',
            padding: '4px 12px'
          }}>❌ 不可用</Tag>
        </div>
      </Card>

      {/* 座位图 */}
      <Card 
        title={
          <div style={{ 
            color: 'white', 
            fontSize: '20px', 
            fontWeight: 'bold',
            textShadow: '0 0 10px rgba(102, 126, 234, 0.5)'
          }}>
            🏛️ {seatMapData.classroom.name} - 智能座位选择系统
          </div>
        }
        extra={
          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadSeatMap}
            style={{
              background: 'linear-gradient(145deg, #667eea, #764ba2)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 'bold',
              height: '36px',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
            }}
          >
            🔄 刷新
          </Button>
        }
        style={{
          background: 'linear-gradient(145deg, #1e1e3f, #2a2a4f)',
          border: '1px solid rgba(102, 126, 234, 0.3)',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)'
        }}
        styles={{
          header: {
            background: 'linear-gradient(145deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
            border: 'none',
            borderBottom: '1px solid rgba(102, 126, 234, 0.2)'
          },
          body: {
            background: 'transparent'
          }
        }}
      >
        <div style={{
          background: 'linear-gradient(145deg, #0f0f23, #1a1a3a)',
          padding: window.innerWidth <= 768 ? '15px' : '30px',
          borderRadius: '16px',
          border: '1px solid rgba(102, 126, 234, 0.2)',
          position: 'relative',
          overflow: 'visible',
          minHeight: window.innerWidth <= 768 ? '400px' : '600px'
        }}>
          {/* 科技感背景效果 */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 20% 20%, rgba(102, 126, 234, 0.03) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.03) 0%, transparent 50%),
              radial-gradient(circle at 40% 60%, rgba(52, 152, 219, 0.03) 0%, transparent 50%)
            `,
            pointerEvents: 'none'
          }}></div>
          
          {renderSeatGrid()}
        </div>
      </Card>

      {/* 选座确认对话框 */}
      <Modal
        title={null}
        open={isModalVisible}
        onOk={(e) => {
          console.log('Modal onOk triggered', e);
          confirmSeatSelection();
        }}
        onCancel={() => {
          console.log('Modal onCancel triggered');
          setIsModalVisible(false);
          studentForm.resetFields();
        }}
        confirmLoading={confirmLoading}
        okText="🎯 确认选座并签到"
        cancelText="❌ 取消"
        width={window.innerWidth <= 768 ? '95%' : 580}
        centered
        zIndex={10000}
        styles={{
          mask: {
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 9999
          },
          content: {
            background: 'linear-gradient(145deg, #1e1e3f, #2a2a4f)',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            overflow: 'hidden',
            padding: '0',
            zIndex: 10000
          },
          header: { display: 'none' },
          body: { padding: '0' },
          footer: {
            background: 'transparent',
            border: 'none',
            borderTop: '1px solid rgba(102, 126, 234, 0.2)',
            padding: '16px 24px'
          }
        }}
        footer={[
          <Button 
            key="cancel"
            onClick={() => {
              setIsModalVisible(false);
              studentForm.resetFields();
            }}
            style={{
              background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '10px',
              height: '40px',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
          >
            ❌ 取消
          </Button>,
          <Button 
            key="submit"
            type="primary"
            loading={confirmLoading}
            onClick={(e) => {
              console.log('确认选座按钮被点击', e);
              e.preventDefault();
              e.stopPropagation();
              confirmSeatSelection();
            }}
            style={{
              background: 'linear-gradient(145deg, #667eea, #764ba2)',
              border: 'none',
              borderRadius: '10px',
              height: '40px',
              fontWeight: '600',
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.3s ease',
              pointerEvents: 'auto',
              cursor: 'pointer'
            }}
          >
            🎯 确认选座并签到
          </Button>
        ]}
      >
        {selectedSeat && (
          <div style={{ position: 'relative' }}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              margin: '0',
              padding: '24px',
              color: 'white',
              textAlign: 'center',
              borderRadius: '20px 20px 0 0',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', position: 'relative', zIndex: 1 }}>
                🚀 智能座位签到系统
              </div>
              <div style={{ fontSize: '16px', opacity: 0.9, position: 'relative', zIndex: 1 }}>
                AI驱动的精准定位 & 智能识别
              </div>
            </div>
            
            <div style={{ padding: window.innerWidth <= 768 ? '20px 16px 16px' : '30px 24px 24px' }}>
              <div style={{ textAlign: 'center', marginBottom: window.innerWidth <= 768 ? 20 : 30 }}>
                <div style={{
                  position: 'relative',
                  display: 'inline-block',
                  marginBottom: '20px'
                }}>
                  <Avatar 
                    size={window.innerWidth <= 768 ? 80 : 120} 
                    icon={<UserOutlined />}
                    style={{
                      background: 'linear-gradient(145deg, #667eea, #764ba2)',
                      border: window.innerWidth <= 768 ? '3px solid #667eea' : '4px solid #667eea',
                      boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    background: 'linear-gradient(45deg, #ff6b6b, #ffa726)',
                    color: 'white',
                    borderRadius: '20px',
                    padding: '8px 12px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    zIndex: 3,
                    boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)'
                  }}>
                    {selectedSeat.seatNumber}
                  </div>
                </div>
                
                <div style={{ 
                  fontSize: window.innerWidth <= 768 ? 18 : 24, 
                  fontWeight: 'bold', 
                  margin: '0 0 12px',
                  color: 'white',
                  textShadow: '0 0 15px rgba(102, 126, 234, 0.6)'
                }}>
                  🎯 座位 {selectedSeat.seatNumber} 已锁定
                </div>
                
                <div style={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  fontSize: '16px',
                  background: 'linear-gradient(145deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.1))',
                  padding: '15px',
                  borderRadius: '12px',
                  marginBottom: 25,
                  border: '1px solid rgba(102, 126, 234, 0.3)',
                  backdropFilter: 'blur(10px)'
                }}>
                  ✨ 请填写您的学号和姓名完成智能签到
                </div>
              </div>
            
              <Form
                form={studentForm}
                layout="vertical"
                requiredMark={false}
              >
                <Form.Item
                  name="studentId"
                  label={<span style={{ color: '#667eea', fontWeight: 'bold', fontSize: '16px' }}>🎓 学号</span>}
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
                    prefix="🆔"
                    style={{
                      borderRadius: '12px',
                      border: '2px solid #e8f4f8',
                      fontSize: '16px',
                      padding: '12px',
                      background: 'linear-gradient(135deg, #f8fbff 0%, #f0f8ff 100%)',
                      transition: 'all 0.3s ease'
                    }}
                  />
                </Form.Item>
                
                <Form.Item
                  name="name"
                  label={<span style={{ color: '#667eea', fontWeight: 'bold', fontSize: '16px' }}>👤 姓名</span>}
                  rules={[
                    { required: true, message: '请输入姓名' },
                    { min: 2, max: 10, message: '姓名长度应在2-10位之间' },
                    { pattern: /^[\u4e00-\u9fa5a-zA-Z\s]+$/, message: '姓名只能包含中文、英文字母' }
                  ]}
                >
                  <Input 
                    placeholder="请输入您的真实姓名" 
                    size="large"
                    prefix="✏️"
                    style={{
                      borderRadius: '12px',
                      border: '2px solid #e8f4f8',
                      fontSize: '16px',
                      padding: '12px',
                      background: 'linear-gradient(135deg, #f8fbff 0%, #f0f8ff 100%)',
                      transition: 'all 0.3s ease'
                    }}
                  />
                </Form.Item>
              </Form>
              
              <Alert
                message="🎯 智能签到须知"
                description={
                  <div>
                    <div style={{ marginBottom: '8px' }}>✅ 请确保填写的学号和姓名信息准确无误</div>
                    <div style={{ marginBottom: '8px' }}>🔒 提交后将自动完成课堂签到，座位将被锁定</div>
                    <div>📊 签到数据将实时同步至教师端系统</div>
                  </div>
                }
                type="info"
                showIcon
                style={{ 
                  marginTop: 16,
                  background: 'linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%)',
                  border: '2px solid rgba(102, 126, 234, 0.2)',
                  borderRadius: '12px'
                }}
              />
            </div>
          </div>
        )}
      </Modal>
      
      {/* 动态CSS样式 */}
      <style>{`
        /* 强制显示滚动条 */
        body {
          overflow: auto !important;
        }
        
        /* 确保页面容器有滚动条 */
        #root {
          overflow: auto !important;
          height: auto !important;
        }
        
        @keyframes hologramScan {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        
        @keyframes hologramSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes iconGlow {
          0% { filter: drop-shadow(0 0 10px rgba(102, 126, 234, 0.6)); }
          100% { filter: drop-shadow(0 0 20px rgba(102, 126, 234, 0.9)); }
        }
        
        @keyframes numberGlow {
          0% { 
            text-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
            transform: scale(1);
          }
          100% { 
            text-shadow: 0 0 20px rgba(102, 126, 234, 0.8);
            transform: scale(1.05);
          }
        }
        
        @keyframes warningPulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(255, 193, 7, 0.3);
            border-color: rgba(255, 193, 7, 0.4);
          }
          50% {
            box-shadow: 0 0 40px rgba(255, 193, 7, 0.6);
            border-color: rgba(255, 193, 7, 0.8);
          }
        }
        
        @keyframes mySeatPulse {
          0%, 100% {
            box-shadow: 
              0 8px 25px rgba(82, 196, 26, 0.4),
              0 0 20px rgba(82, 196, 26, 0.6),
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }
          50% {
            box-shadow: 
              0 12px 35px rgba(82, 196, 26, 0.6),
              0 0 30px rgba(82, 196, 26, 0.8),
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }
        }
        
        @keyframes textGlow {
          0% {
            text-shadow: 
              0 0 10px rgba(102, 126, 234, 0.8),
              0 0 20px rgba(102, 126, 234, 0.6),
              0 0 30px rgba(102, 126, 234, 0.4);
          }
          100% {
            text-shadow: 
              0 0 15px rgba(118, 75, 162, 0.8),
              0 0 30px rgba(118, 75, 162, 0.6),
              0 0 45px rgba(118, 75, 162, 0.4);
          }
        }
        
        @keyframes crownGlow {
          0% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.6); }
          100% { 
            box-shadow: 
              0 0 25px rgba(255, 215, 0, 0.8),
              0 0 10px rgba(255, 215, 0, 1);
          }
        }
        
        @keyframes crownBounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-3px); }
          60% { transform: translateY(-2px); }
        }
        
        @keyframes studentBadgeGlow {
          0% {
            box-shadow: 
              0 4px 15px rgba(255, 215, 0, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.3);
          }
          100% {
            box-shadow: 
              0 6px 25px rgba(255, 215, 0, 0.6),
              0 0 10px rgba(255, 215, 0, 0.8),
              inset 0 1px 0 rgba(255, 255, 255, 0.3);
          }
        }
        
        @keyframes tooltipGlow {
          0% { box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3); }
          100% { box-shadow: 0 6px 30px rgba(102, 126, 234, 0.5); }
        }
        
        @keyframes seatBadgeGlow {
          0% {
            box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
            transform: scale(1);
          }
          100% {
            box-shadow: 0 6px 20px rgba(255, 107, 107, 0.5);
            transform: scale(1.05);
          }
        }
        
        @keyframes successGlow {
          0% {
            box-shadow: 0 8px 32px rgba(82, 196, 26, 0.3);
            border-color: rgba(82, 196, 26, 0.6);
          }
          100% {
            box-shadow: 0 12px 48px rgba(82, 196, 26, 0.5);
            border-color: rgba(82, 196, 26, 0.8);
          }
        }
        
        @keyframes mySeatGlow {
          0% {
            box-shadow: 
              0 8px 32px rgba(82, 196, 26, 0.3),
              0 0 20px rgba(255, 215, 0, 0.2);
            border-color: rgba(82, 196, 26, 0.6);
            transform: scale(1);
          }
          100% {
            box-shadow: 
              0 12px 48px rgba(82, 196, 26, 0.5),
              0 0 30px rgba(255, 215, 0, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
            border-color: rgba(82, 196, 26, 0.8);
            transform: scale(1.02);
          }
        }
      `}</style>
    </div>
  );
};

export default StudentSeatSelector;