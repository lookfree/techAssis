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
      {/* 头部导航 */}
      <div className="seat-selection-header">
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={handleGoBack}
          className="back-button"
        >
          返回
        </Button>
        <div className="header-content">
          <h2 className="course-title">{course.name}</h2>
          <p className="course-info">
            {course.courseCode} | {course.teacher.firstName}{course.teacher.lastName}
          </p>
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