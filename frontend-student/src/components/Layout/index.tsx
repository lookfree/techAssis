import React, { useState, useContext } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  unstable_Toast as Toast,
  unstable_Switch as Switch
} from "@ant-design/mobile";
import { AuthContext } from "../../contexts/AuthContext";
import "./index.css";

// Placeholder components for missing ones
const NavBar: any = ({ children, right, className }: any) => (
  <div
    className={`flex items-center justify-between p-4 bg-white border-b ${className || ""}`}
  >
    <div className="font-medium">{children}</div>
    {right && <div>{right}</div>}
  </div>
);

const Popup: any = ({
  children,
  visible,
  onMaskClick,
  position,
  bodyStyle,
}: any) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onMaskClick}
      />
      <div
        className={`absolute bg-white ${position === "right" ? "right-0 top-0 h-full" : ""}`}
        style={bodyStyle}
      >
        {children}
      </div>
    </div>
  );
};

const Space: any = ({ children, align }: any) => (
  <div className={`flex items-${align || "start"} gap-2`}>{children}</div>
);

// Icon placeholders
const AppOutline = () => <span>🏠</span>;
const UnorderedListOutline = () => <span>📋</span>;
const CheckCircleOutline = () => <span>✅</span>;
const UserOutline = () => <span>👤</span>;
const SetOutline = () => <span>⚙️</span>;
const LogoutOutline = () => <span>🚪</span>;
const GlobalOutline = () => <span>🌐</span>;

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const tabs = [
    {
      key: "/",
      title: "课程",
      icon: <AppOutline />,
    },
    {
      key: "/attendance",
      title: "签到",
      icon: <CheckCircleOutline />,
    },
    {
      key: "/assignments",
      title: "作业",
      icon: <UnorderedListOutline />,
    },
    {
      key: "/profile",
      title: "我的",
      icon: <UserOutline />,
    },
  ];

  const handleTabChange = (key: string) => {
    navigate(key);
  };

  const handleLogout = async () => {
    try {
      await logout();
      Toast.show({ content: "已安全退出" });
      navigate("/login");
    } catch (error) {
      Toast.show({ content: "退出失败，请重试" });
    }
    setShowSettings(false);
  };

  const handleDarkModeChange = (checked: boolean) => {
    setDarkMode(checked);
    document.documentElement.setAttribute(
      "data-theme",
      checked ? "dark" : "light",
    );
    Toast.show({ content: checked ? "已切换至深色模式" : "已切换至浅色模式" });
  };

  const renderNavBar = () => {
    const currentTab = tabs.find((tab) => tab.key === location.pathname);
    if (!currentTab) return null;

    return (
      <NavBar
        className="layout-navbar"
        right={
          <div
            onClick={() => setShowSettings(true)}
            style={{ fontSize: 18, cursor: "pointer" }}
          >
            <SetOutline />
          </div>
        }
      >
        {currentTab.title}
      </NavBar>
    );
  };

  return (
    <div className="layout">
      <div className="layout-header">{renderNavBar()}</div>

      <div className="layout-content">
        <Outlet />
      </div>

      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000
      }}>
        <div style={{
          display: 'flex',
          backgroundColor: 'white',
          borderTop: '1px solid #e5e7eb',
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingTop: '8px',
          paddingBottom: '8px'
        }}>
          {tabs.map((item) => (
            <div
              key={item.key}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '4px',
                paddingBottom: '4px',
                cursor: 'pointer',
                color: location.pathname === item.key ? '#3b82f6' : '#6b7280',
                transition: 'color 0.2s ease'
              }}
              onClick={() => handleTabChange(item.key)}
              onMouseEnter={(e) => {
                if (location.pathname !== item.key) {
                  e.currentTarget.style.color = '#374151';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = location.pathname === item.key ? '#3b82f6' : '#6b7280';
              }}
            >
              <div style={{
                fontSize: '18px',
                marginBottom: '4px',
                transform: location.pathname === item.key ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s ease'
              }}>
                {item.icon}
              </div>
              <div style={{
                fontSize: '12px',
                fontWeight: location.pathname === item.key ? '600' : '400',
                textAlign: 'center'
              }}>
                {item.title}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Popup
        visible={showSettings}
        onMaskClick={() => setShowSettings(false)}
        position="right"
        bodyStyle={{ width: "280px", height: "100vh" }}
      >
        <div className="settings-panel">
          <div className="settings-header">
            <Space align="center">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    className="w-full h-full rounded-full"
                    alt=""
                  />
                ) : (
                  user?.firstName?.charAt(0)
                )}
              </div>
              <div>
                <div className="user-name">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="user-info">
                  {user?.studentId} | {user?.major}
                </div>
              </div>
            </Space>
          </div>

          <div>
            <div className="px-4 py-2 text-sm text-gray-500 bg-gray-50">
              设置
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-3">
                <GlobalOutline />
                <span>深色模式</span>
              </div>
              <Switch checked={darkMode} onChange={handleDarkModeChange} />
            </div>
          </div>

          <div>
            <div className="px-4 py-2 text-sm text-gray-500 bg-gray-50">
              账户
            </div>
            <div
              className="flex items-center gap-3 px-4 py-3 border-b cursor-pointer"
              onClick={() => {
                setShowSettings(false);
                navigate("/profile");
              }}
            >
              <UserOutline />
              <span>个人资料</span>
            </div>
            <div
              className="flex items-center gap-3 px-4 py-3 border-b cursor-pointer text-red-500"
              onClick={handleLogout}
            >
              <LogoutOutline />
              <span>退出登录</span>
            </div>
          </div>

          <div className="settings-footer">
            <p>SmartTeacher Pro 学生端</p>
            <p>Version 1.0.0</p>
          </div>
        </div>
      </Popup>
    </div>
  );
};

export default Layout;
