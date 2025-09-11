import React, { useState, useEffect, useCallback } from 'react';
import { Button, message, Tooltip, Avatar, Typography, Modal, Select, Input } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  QuestionCircleOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  StopOutlined
} from '@ant-design/icons';
import { useSocket } from '../../contexts/SocketContext';
import { SeatMapData, SeatMap as SeatMapType, SeatStatus } from '../../types';
import { request } from '../../services/api';
import attendanceService, { CheckInMethod } from '../../services/attendanceService';

const { Text } = Typography;

interface SeatMapProps {
  classroomId: string;
  courseId: string;
  sessionDate: string;
  timeSlot?: string;
  readonly?: boolean;
  onSeatSelect?: (seatId: string, studentId?: string) => void;
}

interface SeatComponentProps {
  seat: SeatMapType;
  onClick?: () => void;
  readonly?: boolean;
}

// 🚀 CYBER PUNK 座位样式
const cyberStyles = {
  container: {
    fontFamily: "'Rajdhani', 'Microsoft YaHei', sans-serif",
    background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #0f0f23 100%)',
    minHeight: '100vh',
    padding: '24px',
    position: 'relative' as const,
    overflow: 'hidden' as const,
    color: '#ffffff',
  },
  dashboard: {
    background: 'linear-gradient(145deg, rgba(0,255,65,0.1) 0%, rgba(0,128,255,0.1) 50%, rgba(255,0,128,0.1) 100%)',
    border: '2px solid rgba(0,255,65,0.3)',
    borderRadius: '20px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 20px 40px rgba(0,255,65,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
    position: 'relative' as const,
  },
  dashboardHeader: {
    textAlign: 'center' as const,
    marginBottom: '20px',
  },
  dashboardTitle: {
    fontSize: '28px',
    fontWeight: '900' as const,
    color: '#00ff41',
    textShadow: '0 0 20px rgba(0,255,65,0.8)',
    marginBottom: '8px',
  },
  dashboardSubtitle: {
    fontSize: '16px',
    color: '#0080ff',
    textShadow: '0 0 10px rgba(0,128,255,0.6)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginTop: '20px',
  },
  statCard: {
    background: 'linear-gradient(145deg, rgba(0,0,0,0.6), rgba(30,30,30,0.8))',
    border: '1px solid rgba(0,255,65,0.4)',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center' as const,
    position: 'relative' as const,
    transition: 'all 0.3s ease',
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: 'bold' as const,
    color: '#00ff41',
    textShadow: '0 0 10px rgba(0,255,65,0.6)',
  },
  statLabel: {
    fontSize: '12px',
    color: '#ffffff',
    opacity: 0.8,
    marginTop: '4px',
  },
  controlPanel: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    justifyContent: 'center',
  },
  cyberButton: {
    background: 'linear-gradient(145deg, rgba(0,255,65,0.2), rgba(0,128,255,0.2))',
    border: '2px solid rgba(0,255,65,0.5)',
    borderRadius: '8px',
    color: '#00ff41',
    fontWeight: 'bold' as const,
    textShadow: '0 0 10px rgba(0,255,65,0.6)',
    boxShadow: '0 4px 15px rgba(0,255,65,0.3)',
    transition: 'all 0.3s ease',
  },
  podium: {
    background: 'linear-gradient(145deg, rgba(255,215,0,0.2), rgba(255,140,0,0.3))',
    border: '2px solid rgba(255,215,0,0.6)',
    borderRadius: '15px',
    padding: '16px',
    textAlign: 'center' as const,
    marginBottom: '20px',
    color: '#ffd700',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    textShadow: '0 0 15px rgba(255,215,0,0.8)',
  },
  seatGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    alignItems: 'center',
  },
  seatRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  rowLabel: {
    width: '30px',
    textAlign: 'center' as const,
    color: '#00ff41',
    fontWeight: 'bold' as const,
    fontSize: '14px',
  },
  seats: {
    display: 'flex',
    gap: '8px',
  },
  seat: {
    width: '60px',
    height: '60px',
    border: '2px solid rgba(0,255,65,0.5)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: 'linear-gradient(145deg, rgba(0,0,0,0.7), rgba(30,30,30,0.9))',
  },
  seatAvailable: {
    borderColor: 'rgba(0,255,65,0.5)',
    background: 'linear-gradient(145deg, rgba(0,255,65,0.1), rgba(0,200,50,0.2))',
    boxShadow: '0 4px 15px rgba(0,255,65,0.3)',
  },
  seatOccupied: {
    borderColor: 'rgba(0,128,255,0.7)',
    background: 'linear-gradient(145deg, rgba(0,128,255,0.2), rgba(0,100,200,0.3))',
    boxShadow: '0 4px 15px rgba(0,128,255,0.4)',
  },
  seatReserved: {
    borderColor: 'rgba(255,165,0,0.7)',
    background: 'linear-gradient(145deg, rgba(255,165,0,0.2), rgba(255,140,0,0.3))',
    boxShadow: '0 4px 15px rgba(255,165,0,0.4)',
  },
  seatUnavailable: {
    borderColor: 'rgba(255,0,0,0.5)',
    background: 'linear-gradient(145deg, rgba(255,0,0,0.1), rgba(200,0,0,0.2))',
    cursor: 'not-allowed',
  },
  seatNumber: {
    fontSize: '10px',
    color: '#ffffff',
    fontWeight: 'bold' as const,
  },
  confirmedBadge: {
    position: 'absolute' as const,
    top: '-5px',
    right: '-5px',
    backgroundColor: '#00ff41',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    color: '#000000',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #0f0f23 100%)',
    color: '#00ff41',
  },
};

// 单个座位组件
const Seat: React.FC<SeatComponentProps> = ({ seat, onClick, readonly }) => {
  const getStatusIcon = (status: SeatStatus) => {
    switch (status) {
      case SeatStatus.OCCUPIED:
        return <CheckCircleOutlined style={{ color: '#0080ff', fontSize: '12px' }} />;
      case SeatStatus.RESERVED:
        return <QuestionCircleOutlined style={{ color: '#ffa500', fontSize: '12px' }} />;
      case SeatStatus.UNAVAILABLE:
        return <CloseCircleOutlined style={{ color: '#ff0000', fontSize: '12px' }} />;
      default:
        return null;
    }
  };

  const getSeatStyle = (status: SeatStatus) => {
    switch (status) {
      case SeatStatus.AVAILABLE:
        return { ...cyberStyles.seat, ...cyberStyles.seatAvailable };
      case SeatStatus.OCCUPIED:
        return { ...cyberStyles.seat, ...cyberStyles.seatOccupied };
      case SeatStatus.RESERVED:
        return { ...cyberStyles.seat, ...cyberStyles.seatReserved };
      case SeatStatus.UNAVAILABLE:
        return { ...cyberStyles.seat, ...cyberStyles.seatUnavailable };
      default:
        return cyberStyles.seat;
    }
  };

  return (
    <Tooltip
      title={
        seat.student ? (
          <div style={{ color: '#ffffff' }}>
            <div>{seat.student.firstName} {seat.student.lastName}</div>
            <div>学号: {seat.student.studentId}</div>
            <div>座位: {seat.seatId}</div>
            <div>状态: {seat.status === SeatStatus.OCCUPIED ? '已签到' : '已选座'}</div>
            {seat.attendanceConfirmed && <div>已确认签到</div>}
          </div>
        ) : (
          <div style={{ color: '#ffffff' }}>
            <div>座位: {seat.seatId}</div>
            <div>状态: {
              seat.status === SeatStatus.AVAILABLE ? '空闲' :
              seat.status === SeatStatus.RESERVED ? '预留' :
              seat.status === SeatStatus.UNAVAILABLE ? '不可用' : '未知'
            }</div>
          </div>
        )
      }
    >
      <div
        style={getSeatStyle(seat.status)}
        onClick={!readonly && seat.status !== SeatStatus.UNAVAILABLE ? onClick : undefined}
      >
        <div style={cyberStyles.seatNumber}>{seat.seatId}</div>
        <div>
          {seat.student ? (
            <Avatar
              size={20}
              src={seat.student.avatar}
              style={{ backgroundColor: '#00ff41', color: '#000000' }}
            >
              {seat.student.firstName[0]}
            </Avatar>
          ) : (
            getStatusIcon(seat.status)
          )}
        </div>
        
        {/* 签到确认标识 */}
        {seat.attendanceConfirmed && (
          <div style={cyberStyles.confirmedBadge}>
            <CheckCircleOutlined />
          </div>
        )}
      </div>
    </Tooltip>
  );
};

const SeatMap: React.FC<SeatMapProps> = ({ 
  classroomId, 
  courseId, 
  sessionDate, 
  timeSlot,
  readonly = false,
  onSeatSelect 
}) => {
  const [seatMapData, setSeatMapData] = useState<SeatMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState<SeatMapType | null>(null);
  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [activeCheckIn, setActiveCheckIn] = useState<any>(null);
  const { socket, addEventListener } = useSocket();

  // 加载座位图数据 - 使用实际API数据，失败时使用mock数据
  const loadSeatMapData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 🚀 首先尝试从API加载实际数据
      try {
        const response = await request.get<SeatMapData>(`/classrooms/${classroomId}/seat-map`, {
          params: {
            courseId,
            sessionDate,
            timeSlot: timeSlot || '1'
          }
        });
        
        setSeatMapData(response);
        message.success('🚀 CYBER PUNK 3D座位图已加载 - 实际数据！');
        return;
        
      } catch (apiError) {
        console.warn('API加载失败，使用演示数据:', apiError);
      }
      
      // 🎭 API失败时使用炫酷的演示数据作为备用
      const mockClassroom = {
        id: classroomId,
        name: '🌟 量子教学中心 A101',
        location: '智慧教学楼 未来层',
        type: 'smart_classroom' as any,
        capacity: 56,
        rows: 8,
        seatsPerRow: 7,
        seatMapEnabled: true,
        freeSeatingEnabled: false,
        layoutConfig: {
          aisles: [2, 5],
          unavailableSeats: ['A1', 'H7']
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockSeats: any[] = [];
      const studentNames = [
        '张晨星', '李梦瑶', '王志远', '陈思琪', '刘浩然', '赵雨萱', 
        '孙子轩', '周语嫣', '吴天宇', '郑雅琪', '黄俊杰', '徐诗涵',
        '朱明轩', '林心怡', '何振宇', '谢语桐', '罗俊豪', '高雨涵'
      ];
      
      for (let row = 0; row < mockClassroom.rows; row++) {
        for (let col = 0; col < mockClassroom.seatsPerRow; col++) {
          const seatId = String.fromCharCode(65 + row) + (col + 1);
          const isOccupied = Math.random() > 0.4; // 60% 占用率
          
          if (!mockClassroom.layoutConfig.unavailableSeats.includes(seatId)) {
            const student = isOccupied ? {
              id: `student_${row}_${col}`,
              firstName: studentNames[Math.floor(Math.random() * studentNames.length)].charAt(0),
              lastName: studentNames[Math.floor(Math.random() * studentNames.length)].slice(1),
              studentId: `202${Math.floor(Math.random() * 10)}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${seatId}`,
              major: ['计算机科学', '软件工程', '人工智能', '数据科学'][Math.floor(Math.random() * 4)],
              grade: ['大一', '大二', '大三', '大四'][Math.floor(Math.random() * 4)]
            } : null;

            mockSeats.push({
              id: `${classroomId}-${seatId}`,
              classroomId: classroomId,
              seatId,
              sessionDate: new Date(sessionDate),
              status: isOccupied ? 'OCCUPIED' : 'AVAILABLE',
              student,
              studentId: student?.id,
              attendanceConfirmed: isOccupied ? Math.random() > 0.3 : false
            });
          }
        }
      }

      const mockSeatMapData: any = {
        classroom: mockClassroom,
        seats: mockSeats,
        attendanceSession: {
          courseId: courseId,
          sessionDate: sessionDate,
          timeSlot: timeSlot || '1'
        }
      };

      setSeatMapData(mockSeatMapData);
      message.success('🚀 CYBER PUNK 3D座位图已加载 - 演示模式！');
      
    } catch (error) {
      console.error('座位图加载失败:', error);
      message.error('🚫 座位图加载失败，请刷新重试');
    } finally {
      setLoading(false);
    }
  }, [classroomId, courseId, sessionDate, timeSlot]);

  // 加载当前活跃的签到会话
  const loadActiveCheckIn = useCallback(async () => {
    try {
      const session = await attendanceService.getTodayActiveSession(courseId);
      if (session && session.checkInMethod === CheckInMethod.SEAT_MAP) {
        setActiveCheckIn(session);
      } else {
        setActiveCheckIn(null);
      }
    } catch (error) {
      setActiveCheckIn(null);
    }
  }, [courseId]);

  useEffect(() => {
    loadSeatMapData();
    loadActiveCheckIn();
  }, [loadSeatMapData, loadActiveCheckIn]);

  // 监听实时座位图更新
  useEffect(() => {
    if (!socket) return;

    const cleanup = addEventListener('seat_map_update', (data) => {
      if (data.classroomId === classroomId && data.sessionDate === sessionDate) {
        setSeatMapData((prevData) => {
          if (!prevData) return prevData;
          
          const updatedSeats = prevData.seats.map((seat) => {
            if (seat.seatId === data.seatId) {
              return { ...seat, ...data };
            }
            return seat;
          });
          
          return {
            ...prevData,
            seats: updatedSeats,
          };
        });
      }
    });

    return cleanup;
  }, [socket, classroomId, sessionDate, addEventListener]);

  // 处理座位点击
  const handleSeatClick = (seat: SeatMapType) => {
    if (readonly) return;
    
    setSelectedSeat(seat);
    
    if (seat.status === SeatStatus.AVAILABLE) {
      setStudentModalVisible(true);
    } else if (seat.status === SeatStatus.OCCUPIED || seat.status === SeatStatus.RESERVED) {
      onSeatSelect?.(seat.seatId, seat.studentId);
    }
  };

  // 加载可用学生列表
  const loadAvailableStudents = useCallback(async () => {
    try {
      setLoadingStudents(true);
      const response = await request.get(`/courses/${courseId}/students/available`, {
        params: {
          sessionDate,
          timeSlot: timeSlot || '1'
        }
      });
      setAvailableStudents(response);
    } catch (error) {
      console.warn('加载学生列表失败，使用mock数据:', error);
      // 使用mock学生数据
      const mockStudents = [
        { id: '1', firstName: '张', lastName: '晨星', studentId: '20231001' },
        { id: '2', firstName: '李', lastName: '梦瑶', studentId: '20231002' },
        { id: '3', firstName: '王', lastName: '志远', studentId: '20231003' },
        { id: '4', firstName: '陈', lastName: '思琪', studentId: '20231004' },
        { id: '5', firstName: '刘', lastName: '浩然', studentId: '20231005' },
      ];
      setAvailableStudents(mockStudents);
    } finally {
      setLoadingStudents(false);
    }
  }, [courseId, sessionDate, timeSlot]);

  // 分配学生到座位
  const handleAssignStudent = async (studentId: string, seatId: string) => {
    try {
      await request.post(`/classrooms/${classroomId}/assign-seat`, {
        courseId,
        sessionDate,
        timeSlot: timeSlot || '1',
        seatId,
        studentId
      });
      
      message.success(`🚀 学生已成功分配到座位 ${seatId}`);
      setStudentModalVisible(false);
      setSelectedStudent('');
      loadSeatMapData(); // 重新加载数据
      
    } catch (error: any) {
      console.error('分配座位失败:', error);
      message.error(error.message || '分配座位失败，请重试');
    }
  };

  // 刷新座位图
  const handleRefresh = () => {
    loadSeatMapData();
    loadActiveCheckIn();
    message.success('🚀 座位图数据已刷新');
  };

  // 开始座位签到
  const handleStartCheckIn = async () => {
    try {
      setCheckInLoading(true);
      
      console.log('🚀 准备启动座位签到:', { 
        courseId, 
        checkInMethod: CheckInMethod.SEAT_MAP,
        baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api'
      });

      // 🔍 详细错误捕获
      const session = await attendanceService.startCheckIn({
        courseId,
        checkInMethod: CheckInMethod.SEAT_MAP,
        duration: 30
      });
      
      console.log('✅ 座位签到启动成功:', session);
      setActiveCheckIn(session);
      message.success('🪑 座位签到已开始，学生可以开始选座签到');
      
      // 重新加载座位图数据以显示最新状态
      loadSeatMapData();
      
    } catch (error: any) {
      console.error('🚫 座位签到启动失败 - 详细信息:', {
        message: error.message,
        response: error.response,
        request: error.request,
        config: error.config,
        stack: error.stack,
        name: error.name,
        code: error.code,
        errno: error.errno
      });
      
      // 显示更详细的错误信息
      if (error.response) {
        message.error(`服务器错误: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        message.error(`网络连接错误: ${error.message} - 请检查网络连接和后端服务`);
      } else {
        message.error(`请求配置错误: ${error.message}`);
      }
    } finally {
      setCheckInLoading(false);
    }
  };

  // 结束座位签到
  const handleEndCheckIn = async () => {
    if (!activeCheckIn) return;
    
    try {
      setCheckInLoading(true);
      await attendanceService.endCheckIn(activeCheckIn.id);
      setActiveCheckIn(null);
      message.success('座位签到已结束');
    } catch (error) {
      // 错误已在service中处理
    } finally {
      setCheckInLoading(false);
    }
  };

  // 生成座位网格
  const renderSeatGrid = () => {
    if (!seatMapData) return null;
    
    const { classroom, seats } = seatMapData;
    const seatGrid: Array<Array<SeatMapType | null>> = [];
    
    // 创建二维数组表示座位网格
    for (let row = 0; row < classroom.rows; row++) {
      seatGrid[row] = [];
      for (let col = 0; col < classroom.seatsPerRow; col++) {
        const seatId = String.fromCharCode(65 + row) + (col + 1);
        const seat = seats.find((s: any) => s.seatId === seatId);
        
        if (seat) {
          seatGrid[row][col] = seat;
        } else {
          seatGrid[row][col] = {
            id: `${classroomId}-${seatId}`,
            classroomId,
            seatId,
            sessionDate: new Date(sessionDate),
            status: classroom.layoutConfig?.unavailableSeats?.includes(seatId) 
              ? SeatStatus.UNAVAILABLE 
              : SeatStatus.AVAILABLE,
            attendanceConfirmed: false,
          };
        }
      }
    }
    
    return seatGrid.map((row, rowIndex) => (
      <div key={rowIndex} style={cyberStyles.seatRow}>
        <div style={cyberStyles.rowLabel}>
          {String.fromCharCode(65 + rowIndex)}
        </div>
        <div style={cyberStyles.seats}>
          {row.map((seat, colIndex) => {
            const isAisle = classroom.layoutConfig?.aisles?.includes(colIndex);
            
            return (
              <React.Fragment key={colIndex}>
                {seat && (
                  <Seat
                    seat={seat}
                    onClick={() => handleSeatClick(seat)}
                    readonly={readonly}
                  />
                )}
                {isAisle && <div style={{ width: '20px' }} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    ));
  };

  // 统计信息
  const getStats = () => {
    if (!seatMapData) return { total: 0, occupied: 0, available: 0, confirmed: 0 };
    
    const { seats } = seatMapData;
    const total = seats.length;
    const occupied = seats.filter((s: any) => s.status === SeatStatus.OCCUPIED).length;
    const available = seats.filter((s: any) => s.status === SeatStatus.AVAILABLE).length;
    const confirmed = seats.filter((s: any) => s.attendanceConfirmed).length;
    
    return { total, occupied, available, confirmed };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div style={cyberStyles.loading}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>🚀</div>
        <div style={{ fontSize: '18px' }}>加载 CYBER PUNK 3D座位图中...</div>
      </div>
    );
  }

  if (!seatMapData) {
    return (
      <div style={cyberStyles.container}>
        <div style={{ textAlign: 'center', padding: '100px 0', color: '#ff0000' }}>
          <div style={{ fontSize: '18px' }}>无法加载座位图数据</div>
        </div>
      </div>
    );
  }

  return (
    <div style={fullscreen ? { ...cyberStyles.container, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 } : cyberStyles.container}>
      {/* 全息统计面板 */}
      <div style={cyberStyles.dashboard}>
        <div style={cyberStyles.dashboardHeader}>
          <div style={cyberStyles.dashboardTitle}>🌟 {seatMapData.classroom.name}</div>
          <div style={cyberStyles.dashboardSubtitle}>🚀 CYBER PUNK 3D座位图 v2.0.1 - 已激活！</div>
        </div>
        
        <div style={cyberStyles.statsGrid}>
          <div style={cyberStyles.statCard}>
            <div style={cyberStyles.statNumber}>{stats.occupied}</div>
            <div style={cyberStyles.statLabel}>已签到</div>
          </div>
          
          <div style={cyberStyles.statCard}>
            <div style={cyberStyles.statNumber}>{stats.confirmed}</div>
            <div style={cyberStyles.statLabel}>已确认</div>
          </div>
          
          <div style={cyberStyles.statCard}>
            <div style={cyberStyles.statNumber}>{stats.available}</div>
            <div style={cyberStyles.statLabel}>空闲席位</div>
          </div>
          
          <div style={cyberStyles.statCard}>
            <div style={cyberStyles.statNumber}>{stats.total}</div>
            <div style={cyberStyles.statLabel}>总席位</div>
          </div>
        </div>
      </div>

      {/* 控制按钮组 */}
      <div style={cyberStyles.controlPanel}>
        <Button 
          style={cyberStyles.cyberButton}
          icon={<ReloadOutlined />} 
          onClick={handleRefresh}
        >
          刷新数据
        </Button>
        <Button
          style={cyberStyles.cyberButton}
          icon={<FullscreenOutlined />}
          onClick={() => setFullscreen(!fullscreen)}
        >
          {fullscreen ? '退出全屏' : '全屏模式'}
        </Button>
        {!readonly && (
          <>
            <Button 
              style={{
                ...cyberStyles.cyberButton,
                background: activeCheckIn 
                  ? 'linear-gradient(145deg, rgba(255,0,0,0.2), rgba(255,100,100,0.2))'
                  : 'linear-gradient(145deg, rgba(0,255,65,0.2), rgba(0,128,255,0.2))',
                borderColor: activeCheckIn ? 'rgba(255,0,0,0.5)' : 'rgba(0,255,65,0.5)',
                color: activeCheckIn ? '#ff4d4f' : '#00ff41'
              }}
              icon={activeCheckIn ? <StopOutlined /> : <PlayCircleOutlined />}
              loading={checkInLoading}
              onClick={activeCheckIn ? handleEndCheckIn : handleStartCheckIn}
            >
              {activeCheckIn ? '结束座位签到' : '🪑 开始座位签到'}
            </Button>
            <Button 
              style={cyberStyles.cyberButton}
              icon={<SettingOutlined />} 
              onClick={() => {}}
            >
              系统设置
            </Button>
          </>
        )}
      </div>

      {/* 3D座位网格 */}
      <div>
        {/* 讲台 */}
        <div style={cyberStyles.podium}>
          🎯 智能讲台 - CYBER PUNK MODE
        </div>
        
        {/* 座位网格 */}
        <div style={cyberStyles.seatGrid}>
          {renderSeatGrid()}
        </div>
      </div>

      {/* 学生选择模态框 */}
      <Modal
        title={
          <div style={{ color: '#00ff41', textShadow: '0 0 10px rgba(0,255,65,0.6)' }}>
            🔮 为座位 {selectedSeat?.seatId} 分配学生
          </div>
        }
        open={studentModalVisible}
        onCancel={() => {
          setStudentModalVisible(false);
          setSelectedStudent('');
        }}
        footer={[
          <Button 
            key="cancel" 
            style={{ 
              background: 'rgba(255,0,0,0.2)', 
              border: '1px solid rgba(255,0,0,0.5)',
              color: '#ff4d4f'
            }}
            onClick={() => {
              setStudentModalVisible(false);
              setSelectedStudent('');
            }}
          >
            取消
          </Button>,
          <Button 
            key="submit" 
            style={{
              background: 'linear-gradient(145deg, rgba(0,255,65,0.2), rgba(0,128,255,0.2))',
              border: '2px solid rgba(0,255,65,0.5)',
              color: '#00ff41'
            }}
            disabled={!selectedStudent}
            onClick={() => selectedSeat && handleAssignStudent(selectedStudent, selectedSeat.seatId)}
          >
            🚀 确认分配
          </Button>
        ]}
        width={500}
        style={{ 
          background: 'rgba(0,0,0,0.8)',
        }}
        bodyStyle={{ 
          background: 'linear-gradient(145deg, rgba(0,0,0,0.9), rgba(30,30,30,0.95))',
          color: '#ffffff'
        }}
      >
        <div style={{ padding: '16px 0' }}>
          <div style={{ marginBottom: '16px', color: '#0080ff', fontSize: '14px' }}>
            📍 选择要分配到座位 <span style={{ color: '#00ff41', fontWeight: 'bold' }}>{selectedSeat?.seatId}</span> 的学生：
          </div>
          
          <Select
            style={{ width: '100%' }}
            placeholder="🔍 搜索并选择学生"
            value={selectedStudent}
            onChange={setSelectedStudent}
            loading={loadingStudents}
            showSearch
            filterOption={(input, option) =>
              option?.label?.toLowerCase().includes(input.toLowerCase()) ?? false
            }
            options={availableStudents.map(student => ({
              value: student.id,
              label: `${student.firstName}${student.lastName} (${student.studentId})`,
            }))}
            onDropdownVisibleChange={(open) => {
              if (open && availableStudents.length === 0) {
                loadAvailableStudents();
              }
            }}
            dropdownStyle={{
              background: 'rgba(0,0,0,0.95)',
              border: '1px solid rgba(0,255,65,0.3)'
            }}
          />
          
          {selectedStudent && (
            <div style={{ 
              marginTop: '12px', 
              padding: '8px', 
              background: 'rgba(0,255,65,0.1)', 
              border: '1px solid rgba(0,255,65,0.3)',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#00ff41'
            }}>
              ✅ 已选择学生，点击确认分配按钮完成操作
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default SeatMap;