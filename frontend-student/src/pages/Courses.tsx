import React, { useState, useEffect } from "react";
import { unstable_Toast as Toast } from "@ant-design/mobile";
import { useNavigate } from "react-router-dom";
import { Course, CourseStatus, Semester } from "../types";
import { request } from "../services/api";
import "./Courses.css";

// Placeholder components
const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}> = ({ children, className, onClick, style }) => (
  <div
    className={`card ${className || ""}`}
    style={{
      padding: "16px",
      margin: "8px 0",
      backgroundColor: "#fff",
      borderRadius: "8px",
      border: "1px solid #f0f0f0",
      cursor: onClick ? "pointer" : "default",
      ...style,
    }}
    onClick={onClick}
  >
    {children}
  </div>
);

const List: React.FC<{ children: React.ReactNode }> & {
  Item: React.FC<{ children: React.ReactNode }>;
} = ({ children }) => (
  <div
    className="list"
    style={{ backgroundColor: "#fff", borderRadius: "8px" }}
  >
    {children}
  </div>
);

List.Item = ({ children }) => (
  <div
    className="list-item"
    style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}
  >
    {children}
  </div>
);

const Badge: React.FC<{ color: string; content: string }> = ({
  color,
  content,
}) => (
  <span
    className={`badge ${color}`}
    style={{
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "12px",
      backgroundColor:
        color === "success"
          ? "#52c41a"
          : color === "warning"
            ? "#faad14"
            : color === "default"
              ? "#d9d9d9"
              : "#1677ff",
      color: "#fff",
    }}
  >
    {content}
  </span>
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

const PullToRefresh: React.FC<{
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
}> = ({ children, onRefresh }) => {
  return <div className="pull-to-refresh">{children}</div>;
};

const SearchBar: React.FC<{
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}> = ({ placeholder, value, onChange, className }) => (
  <div className={`search-bar ${className || ""}`} style={{ padding: "8px 0" }}>
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "8px 12px",
        border: "1px solid #d9d9d9",
        borderRadius: "20px",
        fontSize: "14px",
        backgroundColor: "#f5f5f5",
      }}
    />
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
}> & { Item: React.FC<{ children: React.ReactNode }> } = ({
  children,
  columns,
  gap,
}) => (
  <div
    className="grid"
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

const Space: React.FC<{
  children: React.ReactNode;
  direction?: "vertical" | "horizontal";
  className?: string;
}> = ({ children, direction = "horizontal", className }) => (
  <div
    className={`space ${direction} ${className || ""}`}
    style={{
      display: "flex",
      flexDirection: direction === "vertical" ? "column" : "row",
      gap: "8px",
    }}
  >
    {children}
  </div>
);

// Icon placeholders
const AppOutline = ({ fontSize }: { fontSize?: number }) => (
  <span style={{ fontSize: fontSize || 16 }}>📱</span>
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

const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const response = await request.get<Course[]>("/courses/student");
      setCourses(response);
    } catch (error: any) {
      Toast.show(error.message || "加载课程失败");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    await loadCourses();
  };

  const filteredCourses = courses.filter((course) => {
    const matchSearch =
      course.name.toLowerCase().includes(searchText.toLowerCase()) ||
      course.courseCode.toLowerCase().includes(searchText.toLowerCase());

    if (activeTab === "all") return matchSearch;
    if (activeTab === "active")
      return matchSearch && course.status === CourseStatus.ACTIVE;
    if (activeTab === "completed")
      return matchSearch && course.status === CourseStatus.COMPLETED;
    return matchSearch;
  });

  const getStatusColor = (status: CourseStatus) => {
    switch (status) {
      case CourseStatus.ACTIVE:
        return "success";
      case CourseStatus.COMPLETED:
        return "default";
      case CourseStatus.ARCHIVED:
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusText = (status: CourseStatus) => {
    switch (status) {
      case CourseStatus.ACTIVE:
        return "进行中";
      case CourseStatus.COMPLETED:
        return "已完成";
      case CourseStatus.ARCHIVED:
        return "已归档";
      default:
        return status;
    }
  };

  const getSemesterText = (semester: Semester) => {
    switch (semester) {
      case Semester.SPRING:
        return "春季学期";
      case Semester.FALL:
        return "秋季学期";
      case Semester.SUMMER:
        return "夏季学期";
      case Semester.WINTER:
        return "冬季学期";
      default:
        return semester;
    }
  };

  const handleCourseClick = (course: Course) => {
    navigate(`/course/${course.id}`);
  };

  const renderCourseCard = (course: Course) => (
    <div
      key={course.id}
      className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all duration-300 cursor-pointer overflow-hidden"
      onClick={() => handleCourseClick(course)}
    >
      {/* 渐变背景装饰 */}
      <div 
        className="absolute top-0 left-0 right-0 h-32 opacity-10 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600"
        style={{
          background: course.coverImage 
            ? `url(${course.coverImage})` 
            : `linear-gradient(135deg, ${course.color || '#3B82F6'} 0%, ${course.color || '#8B5CF6'} 100%)`
        }}
      ></div>
      
      {/* 主内容区域 */}
      <div className="relative p-6">
        {/* 头部信息 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2"></div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {course.name}
                </h3>
                <div className="text-sm text-gray-500 font-medium">
                  {course.courseCode}
                </div>
              </div>
            </div>
          </div>
          
          {/* 状态徽章 */}
          <div className="flex flex-col items-end space-y-2">
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                getStatusColor(course.status) === 'success' 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : getStatusColor(course.status) === 'warning'
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}
            >
              {getStatusText(course.status)}
            </div>
            <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium border border-blue-200">
              {course.credits} 学分
            </div>
          </div>
        </div>

        {/* 课程详细信息 */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <ClockCircleOutline fontSize={12} />
            </div>
            <span>{getSemesterText(course.semester)} {course.academicYear}</span>
          </div>

          {course.teacher && (
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                <TeamOutline fontSize={12} />
              </div>
              <span>{course.teacher.firstName} {course.teacher.lastName}</span>
            </div>
          )}

          {course.location && (
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <EnvironmentOutline fontSize={12} />
              </div>
              <span>{course.location}</span>
            </div>
          )}
        </div>

        {/* 底部操作区域 */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            点击查看课程详情
          </div>
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white group-hover:bg-blue-600 transition-colors">
            <span className="text-sm">→</span>
          </div>
        </div>
      </div>

      {/* 悬停时的装饰效果 */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300 rounded-2xl"></div>
    </div>
  );


  const tabs = [
    { key: "all", title: "全部" },
    { key: "active", title: "进行中" },
    { key: "completed", title: "已完成" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <PullToRefresh onRefresh={onRefresh}>
        <div className="p-4">
          {/* 现代化头部 */}
          <div className="mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
              <h1 className="text-2xl font-bold mb-2">我的课程</h1>
              <p className="text-blue-100 text-sm">探索知识的海洋，成就更好的自己</p>
            </div>
          </div>

          {/* 现代化搜索框 */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索课程名称或课程代码"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full px-4 py-3 pl-12 bg-white rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-sm"
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                <span>🔍</span>
              </div>
            </div>
          </div>

          {/* 现代化快捷操作 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center">
                <span className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full mr-3"></span>
                快捷操作
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => navigate("/attendance")}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mr-3">
                    <AppOutline fontSize={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">快速签到</div>
                    <div className="text-xs text-gray-500">扫码或选座签到</div>
                  </div>
                </div>
              </div>

              <div
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => navigate("/assignments")}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mr-3">
                    <ClockCircleOutline fontSize={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">待办作业</div>
                    <div className="text-xs text-gray-500">查看未完成作业</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 现代化标签页 */}
          <div className="mb-6">
            <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100">
              <div className="flex space-x-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === tab.key
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    {tab.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 现代化课程列表 */}
          <div>
            {loading ? (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
                <div className="text-4xl mb-3">⏳</div>
                <div className="text-gray-500 font-medium">加载中...</div>
              </div>
            ) : filteredCourses.length > 0 ? (
              <div className="space-y-4">
                {filteredCourses.map(renderCourseCard)}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
                <div className="text-4xl mb-3">📭</div>
                <div className="text-gray-500 font-medium">暂无课程</div>
                <div className="text-gray-400 text-sm mt-1">请联系管理员添加课程</div>
              </div>
            )}
          </div>

          {/* 底部安全区域 */}
          <div className="h-20" />
        </div>
      </PullToRefresh>
    </div>
  );
};

export default Courses;
