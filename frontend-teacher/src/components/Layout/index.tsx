import React, { useState } from 'react';
import { Layout as AntLayout, Menu, Dropdown, Avatar, Button, Badge, Space } from 'antd';
import {
  DashboardOutlined,
  BookOutlined,
  CheckCircleOutlined,
  EditOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const { Header, Sider, Content } = AntLayout;

const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 菜单项配置
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/courses',
      icon: <BookOutlined />,
      label: '课程管理',
    },
    {
      key: '/attendance',
      icon: <CheckCircleOutlined />,
      label: '签到管理',
    },
    {
      key: '/assignments',
      icon: <EditOutlined />,
      label: '作业管理',
    },
    {
      key: '/analytics',
      icon: <BarChartOutlined />,
      label: '数据分析',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
  ];

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    const pathname = location.pathname;
    // 匹配一级路径
    const mainPath = '/' + pathname.split('/')[1];
    return [mainPath];
  };

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // 用户下拉菜单
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      onClick: () => navigate('/settings/profile'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <AntLayout className="min-h-screen">
      {/* 侧边栏 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="shadow-lg"
        width={240}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-700">
          <div className="text-white font-bold text-lg">
            {collapsed ? 'ST' : '智慧教师'}
          </div>
        </div>

        {/* 菜单 */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          className="border-none"
        />
      </Sider>

      <AntLayout>
        {/* 头部 - 固定在页面最顶部，延伸到最右边 */}
        <Header 
          className="bg-white shadow-sm px-6 flex items-center justify-between fixed top-0 z-[990]" 
          style={{ 
            height: '64px', 
            left: collapsed ? '80px' : '240px',
            right: '0',
            width: 'auto'
          }}
        >
          {/* 左侧：菜单按钮 */}
          <div className="flex items-center">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="text-lg hover:bg-gray-100 transition-colors"
              style={{ width: '40px', height: '40px' }}
            />
          </div>

          {/* 右侧：通知和用户信息 - 置于Header上方 */}
          <div style={{ position: 'absolute', right: '24px', top: '0', height: '64px', display: 'flex', alignItems: 'center', gap: '16px', zIndex: 1000 }}>
            {/* 通知铃铛（小叮当） - 强制触发更新 */}
            <Badge count={8} size="small" offset={[-6, 6]}>
              <Button
                type="text"
                icon={<BellOutlined className="text-lg text-gray-600" />}
                onClick={() => navigate('/notifications')}
                className="hover:bg-gray-100 transition-colors flex items-center justify-center"
                style={{ width: '40px', height: '40px' }}
                title="通知"
              />
            </Badge>

            {/* 用户信息区域 */}
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
              trigger={['click']}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '8px',
                transition: 'all 0.2s',
                border: '1px solid transparent',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
                e.currentTarget.style.borderColor = '#d9d9d9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }}
              >
                <Avatar
                  size={32}
                  src={user?.avatar}
                  icon={<UserOutlined />}
                  style={{ marginRight: '12px', border: '1px solid #d9d9d9' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ color: '#262626', fontWeight: 500, fontSize: '14px', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span style={{ color: '#8c8c8c', fontSize: '12px', lineHeight: 1.3 }}>
                    {user?.role === 'teacher' ? '教师' : user?.role === 'super_admin' ? '超级管理员' : '系统管理员'}
                  </span>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* 内容区域 */}
        <Content className="bg-gray-50" style={{ marginTop: '54px' }}>
          <div className="bg-white min-h-full">
            <Outlet />
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;