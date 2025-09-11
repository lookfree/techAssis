import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

import { Provider } from 'react-redux';
import { store } from './store';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Classrooms from './pages/Classrooms';
import Attendance from './pages/Attendance';
import Assignments from './pages/Assignments';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

import './styles/global.css';

// 设置dayjs中文
dayjs.locale('zh-cn');

// Ant Design主题配置
const theme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
  },
};

function App() {
  return (
    <Provider store={store}>
      <ConfigProvider locale={zhCN} theme={theme}>
        <AuthProvider>
          <SocketProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Layout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="courses/*" element={<Courses />} />
                  <Route path="classrooms" element={<Classrooms />} />
                  <Route path="attendance/*" element={<Attendance />} />
                  <Route path="assignments/*" element={<Assignments />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Router>
          </SocketProvider>
        </AuthProvider>
      </ConfigProvider>
    </Provider>
  );
}

export default App;