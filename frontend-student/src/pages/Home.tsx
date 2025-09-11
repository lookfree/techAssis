import React, { useState, useEffect } from "react";
// Mobile components - using placeholder components
import { unstable_Toast as Toast } from "@ant-design/mobile";
import {
  Badge,
  Button,
  List,
  Avatar,
  PullToRefresh,
  BellOutline,
} from "../components/PlaceholderComponents";
import { useAuth } from "../contexts/AuthContext";
import { usePWA } from "../contexts/PWAContext";
import { useSocket } from "../contexts/SocketContext";
import { Course, Notification, AttendanceStatus } from "../types";
import { request } from "../services/api";
import dayjs from "dayjs";

// Temporary placeholders for missing components
const Card: any = ({ children, className }: any) => (
  <div className={`bg-white rounded-lg p-4 shadow-sm ${className || ""}`}>
    {children}
  </div>
);
const Grid: any = ({ columns, gap, children }: any) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: `${gap}px`,
    }}
  >
    {children}
  </div>
);
Grid.Item = ({ children }: any) => <div>{children}</div>;
const Space: any = ({ children }: any) => (
  <div className="space-x-2">{children}</div>
);
const Divider: any = () => <hr className="my-2" />;
const InfiniteScroll: any = ({ children }: any) => <div>{children}</div>;
// Icon placeholders
const BookOutline = () => <span>📚</span>;
const UserCheckOutline = () => <span>✅</span>;
const EditOutline = () => <span>📝</span>;
const ClockCircleOutline = () => <span>⏰</span>;
const CheckCircleOutline = () => <span>✔️</span>;
const ExclamationCircleOutline = () => <span>❗</span>;

interface QuickStats {
  totalCourses: number;
  todayAttendance: number;
  pendingAssignments: number;
  unreadNotifications: number;
}

interface TodaySchedule {
  id: string;
  courseName: string;
  courseCode: string;
  timeSlot: string;
  location: string;
  attendanceStatus?: AttendanceStatus;
  hasAssignment: boolean;
}

const Home: React.FC = () => {
  const { user } = useAuth();
  const { isOnline, isInstallable, promptInstall } = usePWA();
  const { isConnected } = useSocket();

  const [stats, setStats] = useState<QuickStats>({
    totalCourses: 0,
    todayAttendance: 0,
    pendingAssignments: 0,
    unreadNotifications: 0,
  });
  const [todaySchedule, setTodaySchedule] = useState<TodaySchedule[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<
    Notification[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // 加载主页数据
  const loadHomeData = async () => {
    try {
      setLoading(true);

      // 并行请求各种数据
      const [statsRes, scheduleRes, notificationsRes] = await Promise.all([
        request.get("/student/stats"),
        request.get("/student/today-schedule"),
        request.get("/notifications?limit=5&unread=true"),
      ]);

      setStats(
        statsRes || {
          totalCourses: 0,
          todayAttendance: 0,
          pendingAssignments: 0,
          unreadNotifications: 0,
        },
      );

      setTodaySchedule(scheduleRes || []);
      setRecentNotifications(notificationsRes.data || []);

      Toast.show({ content: "数据已更新", duration: 1000 });
    } catch (error) {
      console.error("加载主页数据失败:", error);
      if (isOnline) {
        Toast.show({ content: "数据加载失败", duration: 2000 });
      }
    } finally {
      setLoading(false);
    }
  };

  // 加载更多通知
  const loadMoreNotifications = async () => {
    try {
      const response = await request.get("/notifications", {
        params: {
          limit: 10,
          offset: recentNotifications.length,
        },
      });

      const newNotifications = response.data || [];
      setRecentNotifications((prev) => [...prev, ...newNotifications]);
      setHasMore(newNotifications.length >= 10);
    } catch (error) {
      setHasMore(false);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, []);

  // 快捷操作网格数据
  const quickActions = [
    {
      icon: <BookOutline />,
      text: "我的课程",
      badge: stats.totalCourses,
      link: "/courses",
    },
    {
      icon: <UserCheckOutline />,
      text: "签到记录",
      badge: stats.todayAttendance,
      link: "/attendance",
    },
    {
      icon: <EditOutline />,
      text: "作业提交",
      badge: stats.pendingAssignments,
      link: "/assignments",
    },
    {
      icon: <BellOutline />,
      text: "消息通知",
      badge: stats.unreadNotifications,
      link: "/notifications",
    },
  ];

  // 获取签到状态样式
  const getAttendanceStatusStyle = (status?: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return { color: "#52c41a", text: "已签到" };
      case AttendanceStatus.LATE:
        return { color: "#faad14", text: "迟到" };
      case AttendanceStatus.ABSENT:
        return { color: "#ff4d4f", text: "缺勤" };
      case AttendanceStatus.EXCUSED:
        return { color: "#d9d9d9", text: "请假" };
      default:
        return { color: "#1890ff", text: "待签到" };
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      padding: 0,
      margin: 0,
      fontFamily: '"PingFang SC", "Helvetica Neue", Arial, sans-serif'
    }}>
      <PullToRefresh onRefresh={loadHomeData}>
        <div style={{ padding: '20px 16px' }}>
          {/* 现代化头部欢迎卡片 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '24px',
              marginBottom: '20px',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* 装饰性背景元素 */}
              <div style={{
                position: 'absolute',
                top: '-50px',
                right: '-50px',
                width: '120px',
                height: '120px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                borderRadius: '50%'
              }}></div>
              
              <div style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                <div style={{ position: 'relative', marginRight: '16px' }}>
                  <Avatar
                    src={user?.avatar}
                    size={60}
                    style={{ 
                      backgroundColor: "rgba(255,255,255,0.3)",
                      border: '3px solid rgba(255,255,255,0.4)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                    }}
                  >
                    <span style={{ 
                      fontSize: '24px', 
                      fontWeight: 'bold', 
                      color: '#fff' 
                    }}>{user?.firstName?.[0] || '学'}</span>
                  </Avatar>
                  <div style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#10b981',
                    borderRadius: '50%',
                    border: '3px solid white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}></div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '22px',
                    fontWeight: '600',
                    color: 'white',
                    marginBottom: '4px',
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    欢迎回来，{user?.firstName || '同学'}! 🌟
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.8)',
                    marginBottom: '2px'
                  }}>
                    {user?.studentId || '学号'} · {user?.major || '专业'}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.7)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <span style={{ marginRight: '6px' }}>📅</span>
                    {dayjs().format("MM月DD日 dddd")}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: isConnected 
                      ? 'rgba(16, 185, 129, 0.2)' 
                      : 'rgba(239, 68, 68, 0.2)',
                    color: 'white',
                    border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      marginRight: '6px',
                      backgroundColor: isConnected ? '#10b981' : '#ef4444',
                      animation: isConnected ? 'pulse 2s infinite' : 'none'
                    }}></div>
                    {isConnected ? "在线" : "离线"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PWA安装提示 - 现代化设计 */}
          {isInstallable && (
            <div className="mb-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-lg">📱</span>
                  </div>
                  <div>
                    <div className="font-semibold text-sm">安装智慧教师</div>
                    <div className="text-cyan-100 text-xs">添加到主屏幕，获得原生应用体验</div>
                  </div>
                </div>
                <button
                  onClick={promptInstall}
                  className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
                >
                  安装
                </button>
              </div>
            </div>
          )}

          {/* 现代化快捷操作网格 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>快捷操作 ⚡</h2>
              <span style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.7)'
              }}>轻触访问</span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px'
            }}>
              {quickActions.map((action, index) => {
                const colors = [
                  { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', accent: '#667eea' },
                  { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', accent: '#f093fb' },
                  { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', accent: '#4facfe' },
                  { bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', accent: '#43e97b' }
                ];
                return (
                  <div
                    key={index}
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '16px',
                      padding: '20px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onClick={() => {
                      console.log("Navigate to:", action.link);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)';
                    }}
                  >
                    {/* 装饰性背景渐变 */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: '60px',
                      height: '60px',
                      background: colors[index].bg,
                      borderRadius: '50%',
                      opacity: 0.1,
                      transform: 'translate(20px, -20px)'
                    }}></div>
                    
                    <div style={{ position: 'relative', zIndex: 2 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '12px'
                      }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          background: colors[index].bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          marginRight: '12px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                        }}>
                          {action.icon}
                        </div>
                        <div>
                          <div style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: 'white',
                            marginBottom: '2px'
                          }}>{action.text}</div>
                          <div style={{
                            fontSize: '12px',
                            color: 'rgba(255,255,255,0.7)'
                          }}>
                            {index === 0 ? `${action.badge} 门课程` :
                             index === 1 ? `今日 ${action.badge} 次` :
                             index === 2 ? `${action.badge} 待提交` :
                             `${action.badge} 条消息`}
                          </div>
                        </div>
                      </div>
                      
                      {/* 数据显示徽章 */}
                      {action.badge > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          minWidth: '24px',
                          height: '24px',
                          padding: '0 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          background: colors[index].bg,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}>
                          {action.badge}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 现代化今日课程安排 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center'
              }}>
                <span style={{
                  width: '4px',
                  height: '24px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '2px',
                  marginRight: '12px'
                }}></span>
                今日课程 📚
              </h2>
              <button style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '14px',
                fontWeight: '500',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => (e.target as HTMLButtonElement).style.color = 'white'}
              onMouseLeave={(e) => (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.8)'}
              >
                查看全部 →
              </button>
            </div>

            {todaySchedule.length > 0 ? (
              <div className="space-y-3">
                {todaySchedule.map((schedule) => {
                  const statusStyle = getAttendanceStatusStyle(
                    schedule.attendanceStatus,
                  );

                  return (
                    <div
                      key={schedule.id}
                      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2"></div>
                            <div>
                              <div className="font-semibold text-gray-900 text-base mb-1">
                                {schedule.courseName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {schedule.courseCode}
                              </div>
                            </div>
                          </div>
                          
                          <div className="ml-5 space-y-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <span className="mr-2">🕐</span>
                              {schedule.timeSlot}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <span className="mr-2">📍</span>
                              {schedule.location}
                            </div>
                            {schedule.hasAssignment && (
                              <div className="flex items-center text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded-md inline-flex">
                                <span className="mr-1">📝</span>
                                有新作业
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end ml-4">
                          <div
                            className="text-xs font-medium px-2 py-1 rounded-full mb-3"
                            style={{ 
                              backgroundColor: statusStyle.color + '20',
                              color: statusStyle.color,
                              border: `1px solid ${statusStyle.color}30`
                            }}
                          >
                            {statusStyle.text}
                          </div>

                          {!schedule.attendanceStatus && (
                            <button
                              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
                              onClick={() => {
                                console.log("Sign in for course:", schedule.id);
                              }}
                            >
                              立即签到
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                borderRadius: '20px',
                padding: '40px 24px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
              }}>
                <div style={{
                  fontSize: '48px',
                  marginBottom: '16px',
                  opacity: 0.8
                }}>🌴</div>
                <div style={{
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}>今天没有课程安排</div>
                <div style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '14px'
                }}>可以好好休息一下 😊</div>
              </div>
            )}
          </div>

          {/* 现代化最新通知 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center'
              }}>
                <span style={{
                  width: '4px',
                  height: '24px',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  borderRadius: '2px',
                  marginRight: '12px'
                }}></span>
                最新通知 🔔
              </h2>
              <button style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '14px',
                fontWeight: '500',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => (e.target as HTMLButtonElement).style.color = 'white'}
              onMouseLeave={(e) => (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.8)'}
              >
                查看全部 →
              </button>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
            }}>
              {recentNotifications.length > 0 ? (
                <div style={{ borderRadius: '20px', overflow: 'hidden' }}>
                  {recentNotifications.map((notification, index) => (
                    <div
                      key={notification.id}
                      style={{
                        padding: '20px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        borderBottom: index < recentNotifications.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.15) 100%)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                      onClick={() => {
                        console.log("View notification:", notification.id);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: !notification.isRead 
                              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                              : 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%)',
                            color: !notification.isRead ? 'white' : 'rgba(255,255,255,0.8)',
                            fontSize: '18px',
                            boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                          }}>
                            🔔
                          </div>
                          {!notification.isRead && (
                            <div style={{
                              position: 'absolute',
                              top: '-2px',
                              right: '-2px',
                              width: '14px',
                              height: '14px',
                              background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
                              borderRadius: '50%',
                              border: '2px solid rgba(255,255,255,0.9)',
                              animation: 'pulse 2s infinite'
                            }}></div>
                          )}
                        </div>
                        
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <h3 style={{
                              fontSize: '16px',
                              fontWeight: '600',
                              color: !notification.isRead ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.8)',
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {notification.title}
                            </h3>
                            <span style={{
                              fontSize: '12px',
                              color: 'rgba(255,255,255,0.6)',
                              flexShrink: 0,
                              marginLeft: '12px'
                            }}>
                              {dayjs(notification.createdAt).format("MM-DD HH:mm")}
                            </span>
                          </div>
                          <p style={{
                            fontSize: '14px',
                            color: 'rgba(255,255,255,0.7)',
                            margin: 0,
                            lineHeight: '1.5',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {notification.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '60px 30px',
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                  borderRadius: '20px'
                }}>
                  <div style={{
                    fontSize: '64px',
                    marginBottom: '20px',
                    opacity: 0.8,
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                  }}>🔔</div>
                  <div style={{
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: '18px',
                    fontWeight: '600',
                    marginBottom: '8px',
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>暂无新通知</div>
                  <div style={{
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '14px',
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}>有新消息会及时提醒您</div>
                </div>
              )}

              <InfiniteScroll
                loadMore={loadMoreNotifications}
                hasMore={hasMore}
              />
            </div>
          </div>

          {/* 底部安全区域 */}
          <div style={{ height: '80px' }} />
        </div>
      </PullToRefresh>
    </div>
  );
};

export default Home;
