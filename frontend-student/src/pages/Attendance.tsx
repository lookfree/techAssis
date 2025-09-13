import React, { useState, useEffect } from "react";
import { unstable_Toast as Toast } from "@ant-design/mobile";
import { useNavigate } from "react-router-dom";
import {
  Attendance as AttendanceType,
  AttendanceStatus,
  AttendanceMethod,
  Course,
} from "../types";
import { request } from "../services/api";
import "./Attendance.css";

// Placeholder components
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={`card ${className || ""}`}
    style={{
      padding: "16px",
      margin: "8px 0",
      backgroundColor: "#fff",
      borderRadius: "8px",
      border: "1px solid #f0f0f0",
    }}
  >
    {children}
  </div>
);

const Button: React.FC<{
  children: React.ReactNode;
  size?: string;
  fill?: string;
  color?: string;
  onClick?: () => void;
  disabled?: boolean;
  block?: boolean;
  loading?: boolean;
}> = ({ children, size, fill, color, onClick, disabled, block, loading }) => (
  <button
    className={`btn ${size || ""} ${fill || ""} ${color || ""} ${block ? "block" : ""}`}
    style={{
      padding: size === "small" ? "6px 12px" : "10px 16px",
      backgroundColor:
        color === "primary"
          ? "#1677ff"
          : color === "danger"
            ? "#ff4d4f"
            : fill === "outline"
              ? "transparent"
              : "#f5f5f5",
      color:
        color === "primary"
          ? "#fff"
          : color === "danger"
            ? "#fff"
            : fill === "outline"
              ? "#1677ff"
              : "#000",
      border: fill === "outline" ? "1px solid #d9d9d9" : "none",
      borderRadius: "6px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.6 : 1,
      width: block ? "100%" : "auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
    }}
    onClick={onClick}
    disabled={disabled || loading}
  >
    {loading ? "Loading..." : children}
  </button>
);

const Space: React.FC<{
  children: React.ReactNode;
  direction?: "vertical" | "horizontal";
  style?: React.CSSProperties;
}> = ({ children, direction = "horizontal", style }) => (
  <div
    className={`space ${direction}`}
    style={{
      display: "flex",
      flexDirection: direction === "vertical" ? "column" : "row",
      gap: "8px",
      ...style,
    }}
  >
    {children}
  </div>
);

const Tag: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color,
}) => (
  <span
    className={`tag ${color || ""}`}
    style={{
      padding: "2px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      backgroundColor:
        color === "primary"
          ? "#e6f7ff"
          : color === "success"
            ? "#f6ffed"
            : color === "warning"
              ? "#fff7e6"
              : color === "danger"
                ? "#fff2f0"
                : color === "default"
                  ? "#f5f5f5"
                  : "#f5f5f5",
      color:
        color === "primary"
          ? "#1677ff"
          : color === "success"
            ? "#52c41a"
            : color === "warning"
              ? "#faad14"
              : color === "danger"
                ? "#ff4d4f"
                : "#666",
      border: `1px solid ${color === "primary" ? "#91d5ff" : color === "success" ? "#b7eb8f" : color === "warning" ? "#ffd591" : color === "danger" ? "#ffadd2" : "#d9d9d9"}`,
    }}
  >
    {children}
  </span>
);

const List: React.FC<{ children: React.ReactNode }> & {
  Item: React.FC<{
    children: React.ReactNode;
    prefix?: React.ReactNode;
    description?: React.ReactNode;
    extra?: React.ReactNode;
  }>;
} = ({ children }) => (
  <div
    className="list"
    style={{ backgroundColor: "#fff", borderRadius: "8px" }}
  >
    {children}
  </div>
);

List.Item = ({ children, prefix, description, extra }) => (
  <div
    className="list-item"
    style={{
      padding: "12px 16px",
      borderBottom: "1px solid #f0f0f0",
      display: "flex",
      alignItems: "center",
    }}
  >
    {prefix && (
      <div className="list-item-prefix" style={{ marginRight: "12px" }}>
        {prefix}
      </div>
    )}
    <div className="list-item-content" style={{ flex: 1 }}>
      <div>{children}</div>
      {description && (
        <div
          className="list-item-description"
          style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}
        >
          {description}
        </div>
      )}
    </div>
    {extra && (
      <div className="list-item-extra" style={{ marginLeft: "12px" }}>
        {extra}
      </div>
    )}
  </div>
);

const Empty: React.FC<{ description: string; image?: string }> = ({
  description,
  image,
}) => (
  <div
    className="empty"
    style={{ textAlign: "center", padding: "40px 20px", color: "#999" }}
  >
    <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
    <div>{description}</div>
  </div>
);

const Tabs: React.FC<{
  children: React.ReactNode;
  activeKey: string;
  onChange: (key: string) => void;
}> & {
  Tab: React.FC<{ children: React.ReactNode; title: string; key: string }>;
} = ({ children, activeKey, onChange }) => {
  const tabs = React.Children.toArray(children) as React.ReactElement[];
  return (
    <div className="tabs">
      <div
        className="tabs-header"
        style={{
          display: "flex",
          borderBottom: "1px solid #f0f0f0",
          marginBottom: "16px",
        }}
      >
        {tabs.map((tab, index) => (
          <div
            key={tab.key || index}
            className={`tab-header ${tab.key === activeKey ? "active" : ""}`}
            style={{
              padding: "12px 16px",
              cursor: "pointer",
              borderBottom:
                tab.key === activeKey ? "2px solid #1677ff" : "none",
              color: tab.key === activeKey ? "#1677ff" : "#666",
            }}
            onClick={() => onChange(tab.key as string)}
          >
            {tab.props.title}
          </div>
        ))}
      </div>
      <div className="tabs-content">
        {tabs.find((tab) => tab.key === activeKey)?.props.children}
      </div>
    </div>
  );
};

Tabs.Tab = ({ children }) => <div>{children}</div>;

const Grid: React.FC<{
  children: React.ReactNode;
  columns: number;
  gap: number;
  className?: string;
}> & { Item: React.FC<{ children: React.ReactNode }> } = ({
  children,
  columns,
  gap,
  className,
}) => (
  <div
    className={`grid ${className || ""}`}
    style={{
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: `${gap}px`,
    }}
  >
    {children}
  </div>
);

Grid.Item = ({ children }) => <div className="grid-item">{children}</div>;

const Modal: React.FC<{
  visible: boolean;
  title: string;
  content: React.ReactNode;
  actions: {
    key: string;
    text: string;
    primary?: boolean;
    onClick: () => void;
  }[];
}> = ({ visible, title, content, actions }) => {
  if (!visible) return null;
  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        className="modal"
        style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          minWidth: "300px",
          maxWidth: "90vw",
        }}
      >
        <div
          className="modal-header"
          style={{
            padding: "16px",
            borderBottom: "1px solid #f0f0f0",
            fontWeight: "bold",
          }}
        >
          {title}
        </div>
        <div className="modal-content" style={{ padding: "16px" }}>
          {content}
        </div>
        <div
          className="modal-footer"
          style={{
            padding: "16px",
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
          }}
        >
          {actions.map((action) => (
            <button
              key={action.key}
              style={{
                padding: "8px 16px",
                backgroundColor: action.primary ? "#1677ff" : "transparent",
                color: action.primary ? "#fff" : "#666",
                border: "1px solid #d9d9d9",
                borderRadius: "6px",
                cursor: "pointer",
              }}
              onClick={action.onClick}
            >
              {action.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const Input: React.FC<{
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ placeholder, value, onChange }) => (
  <input
    type="text"
    placeholder={placeholder}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #d9d9d9",
      borderRadius: "6px",
      fontSize: "14px",
    }}
  />
);

const PullToRefresh: React.FC<{
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
}> = ({ children, onRefresh }) => {
  return <div className="pull-to-refresh">{children}</div>;
};

// Icon placeholders
const ScanOutline = () => <span style={{ fontSize: "16px" }}>📷</span>;
const CheckCircleOutline = ({ fontSize }: { fontSize?: number }) => (
  <span style={{ fontSize: fontSize || 16 }}>✅</span>
);
const ClockCircleOutline = ({ fontSize }: { fontSize?: number }) => (
  <span style={{ fontSize: fontSize || 16 }}>⏰</span>
);
const TeamOutline = ({ fontSize }: { fontSize?: number }) => (
  <span style={{ fontSize: fontSize || 16 }}>👥</span>
);
const EnvironmentOutline = ({ fontSize }: { fontSize?: number }) => (
  <span style={{ fontSize: fontSize || 16 }}>📍</span>
);
const AppOutline = ({ fontSize }: { fontSize?: number }) => (
  <span style={{ fontSize: fontSize || 16 }}>📱</span>
);

const Attendance: React.FC = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceType[]>(
    [],
  );
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("checkin");
  const [studentSeats, setStudentSeats] = useState<{[courseId: string]: any}>({});
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [attendanceRes, coursesRes] = await Promise.all([
        request.get<AttendanceType[]>("/attendance/my-attendance"),
        request.get<Course[]>("/courses/student"),
      ]);
      setAttendanceRecords(attendanceRes);
      setCourses(coursesRes);
      
      // 检查每个课程的座位状态
      const seatStatus: {[courseId: string]: any} = {};
      for (const course of coursesRes) {
        // 检查所有启用签到的课程，不仅仅是活跃的
        if (course.attendanceEnabled) {
          try {
            // 获取今日的签到会话
            const sessionRes = await request.get(`/attendance/sessions/today/${course.id}`);
            if (sessionRes) {
              // 获取学生信息
              const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
              const studentId = userInfo.studentId || userInfo.username;
              
              console.log('Checking seat for student:', studentId, 'in session:', sessionRes.id);
              
              // 获取座位图数据
              const seatMapRes = await request.get(`/classrooms/sessions/${sessionRes.id}/seat-map`);
              if (seatMapRes && seatMapRes.seats) {
                // 查找学生的座位
                const mySeat = seatMapRes.seats.find((seat: any) => 
                  seat.studentId === studentId && 
                  (seat.status === 'occupied' || seat.attendanceConfirmed)
                );
                
                console.log('Found seat for student:', mySeat);
                
                if (mySeat) {
                  seatStatus[course.id] = {
                    seatNumber: mySeat.seatNumber,
                    confirmed: mySeat.attendanceConfirmed,
                    sessionId: sessionRes.id,
                    checkInTime: mySeat.updatedAt || new Date().toISOString()
                  };
                }
              }
            }
          } catch (error) {
            console.log('Failed to load session for course:', course.id, error);
          }
        }
      }
      setStudentSeats(seatStatus);
    } catch (error: any) {
      Toast.show(error.message || "加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    await loadData();
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return "success";
      case AttendanceStatus.LATE:
        return "warning";
      case AttendanceStatus.EXCUSED:
        return "default";
      case AttendanceStatus.ABSENT:
        return "danger";
      default:
        return "default";
    }
  };

  const getStatusText = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return "出席";
      case AttendanceStatus.LATE:
        return "迟到";
      case AttendanceStatus.EXCUSED:
        return "请假";
      case AttendanceStatus.ABSENT:
        return "缺席";
      case AttendanceStatus.LEAVE_EARLY:
        return "早退";
      default:
        return status;
    }
  };

  const getMethodText = (method: AttendanceMethod) => {
    switch (method) {
      case AttendanceMethod.QR_CODE:
        return "扫码签到";
      case AttendanceMethod.CODE:
        return "验证码签到";
      case AttendanceMethod.SEAT_MAP:
        return "选座签到";
      case AttendanceMethod.GEOFENCE:
        return "位置签到";
      case AttendanceMethod.FACIAL_RECOGNITION:
        return "人脸签到";
      default:
        return "手动签到";
    }
  };

  const handleSeatMapCheckin = (course: Course) => {
    navigate(`/seat-selection/${course.id}`);
  };



  const renderCheckinTab = () => (
    <div>
      {courses.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {courses
            .filter((course) => course.attendanceEnabled)
            .map((course) => (
              <div key={course.id} style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                overflow: 'hidden'
              }}>
                {/* 课程信息头部 */}
                <div style={{
                  padding: '20px',
                  borderBottom: '1px solid rgba(255,255,255,0.2)'
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                        borderRadius: '50%',
                        marginRight: '12px'
                      }}></div>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: 'white',
                        margin: 0,
                        textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                      }}>
                        {course.name}
                      </h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.2)'
                      }}>
                        {course.courseCode}
                      </span>
                      {course.location && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                          color: 'white',
                          border: '1px solid rgba(255,255,255,0.2)'
                        }}>
                          📍 {course.location}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: course.status === "active" 
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                      : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    {course.status === "active" ? "🟢 进行中" : "⏸️ 已结束"}
                  </div>
                </div>

                {/* 座位签到 */}
                <div style={{ padding: '20px' }}>
                  {studentSeats[course.id] ? (
                    // 已选座位显示
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '24px',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.4) 0%, rgba(34, 197, 94, 0.3) 100%)',
                        borderRadius: '20px',
                        border: '2px solid rgba(34, 197, 94, 0.6)',
                        backdropFilter: 'blur(10px)',
                        width: '100%',
                        maxWidth: '300px',
                        margin: '0 auto',
                        boxShadow: '0 10px 30px rgba(34, 197, 94, 0.3)'
                      }}
                    >
                      <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px',
                        fontSize: '36px',
                        boxShadow: '0 12px 30px rgba(34, 197, 94, 0.5)',
                        position: 'relative'
                      }}>
                        ✅
                        <div style={{
                          position: 'absolute',
                          top: '-5px',
                          right: '-5px',
                          width: '28px',
                          height: '28px',
                          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          boxShadow: '0 4px 12px rgba(251, 191, 36, 0.5)',
                          border: '2px solid white'
                        }}>
                          👑
                        </div>
                      </div>
                      <div style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: 'white',
                        textAlign: 'center',
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        marginBottom: '12px'
                      }}>
                        已签到成功
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: '20px',
                        border: '1px solid rgba(255,255,255,0.3)'
                      }}>
                        <span style={{
                          fontSize: '24px'
                        }}>🪑</span>
                        <span style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: 'white',
                          textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }}>
                          座位 {studentSeats[course.id].seatNumber}
                        </span>
                      </div>
                      <div style={{
                        marginTop: '12px',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.9)',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                      }}>
                        签到时间：{new Date(studentSeats[course.id].checkInTime).toLocaleTimeString('zh-CN')}
                      </div>
                    </div>
                  ) : (
                    // 未选座位显示
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '24px',
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(16, 185, 129, 0.2) 100%)',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        backdropFilter: 'blur(10px)',
                        width: '100%',
                        maxWidth: '300px',
                        margin: '0 auto'
                      }}
                      onClick={() => handleSeatMapCheckin(course)}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 15px 40px rgba(34, 197, 94, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                      }}
                    >
                      <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px',
                        fontSize: '36px',
                        boxShadow: '0 12px 30px rgba(34, 197, 94, 0.4)',
                        animation: 'pulse 2s infinite'
                      }}>
                        🪑
                      </div>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: 'white',
                        textAlign: 'center',
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        marginBottom: '8px'
                      }}>
                        座位签到
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: 'rgba(255,255,255,0.9)',
                        textAlign: 'center',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                      }}>
                        点击选择座位进行签到
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '40px',
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
          <div style={{
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '4px',
            textShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }}>
            暂无课程
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '14px',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}>
            请联系管理员添加课程
          </div>
        </div>
      )}
    </div>
  );

  const renderRecordsTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 头部标题 */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '20px',
        border: '1px solid rgba(255,255,255,0.3)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{
            width: '4px',
            height: '24px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
            borderRadius: '2px',
            marginRight: '12px'
          }}></div>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: 'white',
            margin: 0,
            textShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }}>
            签到记录
          </h2>
        </div>
        <p style={{
          color: 'rgba(255,255,255,0.8)',
          fontSize: '14px',
          margin: 0,
          marginLeft: '16px',
          textShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }}>
          查看历史签到记录
        </p>
      </div>

      {attendanceRecords.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {attendanceRecords.map((record) => (
            <div key={record.id} style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLElement).style.boxShadow = '0 25px 70px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.transform = 'translateY(0)';
              (e.target as HTMLElement).style.boxShadow = '0 20px 60px rgba(0,0,0,0.2)';
            }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
                  {/* 状态图标 */}
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 
                      record.status === AttendanceStatus.PRESENT ? 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)'
                      : record.status === AttendanceStatus.LATE ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                      : record.status === AttendanceStatus.EXCUSED ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
                    fontSize: '20px'
                  }}>
                    {record.status === AttendanceStatus.PRESENT ? '✓' :
                     record.status === AttendanceStatus.LATE ? '⏰' :
                     record.status === AttendanceStatus.EXCUSED ? '📋' : '✗'}
                  </div>

                  {/* 记录信息 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: 'white',
                      margin: '0 0 12px 0',
                      textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                    }}>
                      {record.course?.name || "未知课程"}
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '14px',
                        color: 'rgba(255,255,255,0.9)',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                      }}>
                        <span style={{ marginRight: '8px' }}>📅</span>
                        <span>{record.sessionDate?.toString()}</span>
                        <span style={{ margin: '0 8px', color: 'rgba(255,255,255,0.6)' }}>•</span>
                        <span>{record.timeSlot}</span>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '14px',
                        color: 'rgba(255,255,255,0.9)',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                      }}>
                        <span style={{ marginRight: '8px' }}>🔧</span>
                        <span>{getMethodText(record.method)}</span>
                        {record.checkInTime && (
                          <>
                            <span style={{ margin: '0 8px', color: 'rgba(255,255,255,0.6)' }}>•</span>
                            <span>{new Date(record.checkInTime).toLocaleTimeString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 状态徽章 */}
                <div style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'white',
                  background:
                    getStatusColor(record.status) === 'success' ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                    : getStatusColor(record.status) === 'warning' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : getStatusColor(record.status) === 'danger' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                    : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                }}>
                  {getStatusText(record.status)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '40px',
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
          <div style={{
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '4px',
            textShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }}>
            暂无签到记录
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '14px',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}>
            完成签到后会在这里显示
          </div>
        </div>
      )}
    </div>
  );

  const tabs = [
    { key: "checkin", title: "签到", content: renderCheckinTab() },
    { key: "records", title: "记录", content: renderRecordsTab() },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '0'
    }}>
      <PullToRefresh onRefresh={onRefresh}>
        <div style={{ padding: '20px' }}>
          {/* Glassmorphism头部 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              textAlign: 'center'
            }}>
              <h1 style={{
                fontSize: '28px',
                fontWeight: 'bold',
                margin: '0 0 8px 0',
                color: 'white',
                textShadow: '0 2px 10px rgba(0,0,0,0.3)'
              }}>
                📚 课程签到
              </h1>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.8)',
                margin: 0,
                textShadow: '0 1px 5px rgba(0,0,0,0.3)'
              }}>
                按时签到，记录学习足迹
              </p>
            </div>
          </div>

          {/* Glassmorphism统计卡片 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 15px 40px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '12px',
                  fontSize: '18px',
                  color: 'white'
                }}>
                  ✓
                </div>
                <div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: 'white',
                    textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                  }}>
                    {attendanceRecords.filter(r => r.status === AttendanceStatus.PRESENT).length}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.8)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                  }}>
                    成功签到
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 15px 40px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '12px',
                  fontSize: '18px'
                }}>
                  📊
                </div>
                <div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: 'white',
                    textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                  }}>
                    {attendanceRecords.length}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.8)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                  }}>
                    总签到数
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Glassmorphism标签页 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              padding: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 15px 40px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      background: activeTab === tab.key
                        ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                        : 'transparent',
                      color: activeTab === tab.key ? 'white' : 'rgba(255,255,255,0.8)',
                      textShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                      boxShadow: activeTab === tab.key ? '0 8px 25px rgba(0,0,0,0.2)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== tab.key) {
                        (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== tab.key) {
                        (e.target as HTMLButtonElement).style.background = 'transparent';
                      }
                    }}
                  >
                    {tab.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Glassmorphism内容区域 */}
          <div>
            {loading ? (
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                padding: '40px',
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                <div style={{
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                }}>
                  加载中...
                </div>
              </div>
            ) : (
              <div>
                {tabs.find((tab) => tab.key === activeTab)?.content}
              </div>
            )}
          </div>

          {/* 底部安全区域 */}
          <div style={{ height: '80px' }} />
        </div>
      </PullToRefresh>

    </div>
  );
};

export default Attendance;
