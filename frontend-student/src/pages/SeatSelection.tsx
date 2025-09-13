import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, message, Spin, Alert } from 'antd';
import { useAuth } from "../contexts/AuthContext";
import StudentSeatSelector from "../components/classroom/StudentSeatSelector";
import { request } from "../services/api";
import './SeatSelection.css';

interface CourseInfo {
  id: string;
  name: string;
  courseCode: string;
  teacher: {
    firstName: string;
    lastName: string;
  };
}

interface AttendanceSessionInfo {
  id: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  sessionDate: string;
  timeSlot: string;
  courseId: string;
}

const SeatSelection: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const sessionId = undefined; // sessionId will be retrieved from API
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [session, setSession] = useState<AttendanceSessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId) {
      fetchCourseAndSession();
    }
  }, [courseId, sessionId]);

  const fetchCourseAndSession = async () => {
    setLoading(true);
    try {
      // 获取课程信息
      const courseResponse = await request.get(`/courses/${courseId}`);
      setCourse(courseResponse);

      // 如果有sessionId，获取会话信息
      if (sessionId) {
        const sessionResponse = await request.get(`/attendance/sessions/${sessionId}`);
        setSession(sessionResponse);
      } else {
        // 如果没有sessionId，查找当天的活跃会话
        const todayResponse = await request.get(`/attendance/sessions/today/${courseId}`);
        if (todayResponse) {
          setSession(todayResponse);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch course/session data:', error);
      message.error(error.message || '获取课程信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInSuccess = () => {
    message.success('签到成功！');
    // 签到成功后跳转到签到记录页面
    setTimeout(() => {
      navigate('/attendance');
    }, 1500);
  };

  const handleGoBack = () => {
    navigate('/courses');
  };

  if (loading) {
    return (
      <div className="seat-selection-container">
        <div className="loading-container">
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>加载中...</div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="seat-selection-container">
        <div className="error-container">
          <Alert
            message="课程未找到"
            description="请检查课程链接是否正确"
            type="error"
            showIcon
            action={
              <Button type="primary" onClick={handleGoBack}>
                返回课程列表
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="seat-selection-container">
        <div className="error-container">
          <Alert
            message="请先登录"
            description="您需要登录后才能进行座位选择"
            type="warning"
            showIcon
            action={
              <Button type="primary" onClick={() => navigate('/login')}>
                去登录
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const studentInfo = {
    id: user.id,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    studentId: user.studentId || user.id,
  };

  return (
    <div className="seat-selection-container">
      {/* 酷炫头部导航 */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '32px',
        borderRadius: '16px',
        color: 'white',
        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* 背景装饰 */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          animation: 'float 20s ease-in-out infinite',
        }}></div>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleGoBack}
            style={{
              color: 'white',
              fontSize: '16px',
              height: '40px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '20px',
              padding: '0 20px'
            }}
          >
            返回课程
          </Button>
          
          <div style={{ flex: 1, textAlign: 'center', margin: '0 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <div style={{
                fontSize: '48px',
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '16px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                🎯
              </div>
              <div>
                <h1 style={{ 
                  color: 'white', 
                  margin: 0, 
                  fontSize: '28px', 
                  fontWeight: 'bold',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}>
                  {course.name}
                </h1>
                <p style={{ 
                  color: 'rgba(255, 255, 255, 0.9)', 
                  fontSize: '16px',
                  margin: '8px 0 0 0'
                }}>
                  {course.courseCode} | 👨‍🏫 {course.teacher.firstName}{course.teacher.lastName}
                </p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'center' }}>
                  <div style={{ 
                    background: 'rgba(255, 255, 255, 0.2)', 
                    padding: '6px 14px', 
                    borderRadius: '16px', 
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    📍 智能选座
                  </div>
                  <div style={{ 
                    background: 'rgba(255, 255, 255, 0.2)', 
                    padding: '6px 14px', 
                    borderRadius: '16px', 
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    ⚡ 实时签到
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ width: '120px' }}></div>
        </div>
      </div>

      {/* 座位选择组件 */}
      <div className="seat-selection-content">
        <StudentSeatSelector
          courseId={courseId!}
          sessionId={session?.id}
          studentInfo={studentInfo}
          onCheckInSuccess={handleCheckInSuccess}
        />
      </div>
    </div>
  );
};

export default SeatSelection;