import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Provider } from "react-redux";
// import { ConfigProvider } from '@ant-design/mobile';
// import zhCN from '@ant-design/mobile/es/locales/zh-CN';

import { store } from "./store";
import { AuthProvider } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import { PWAProvider } from "./contexts/PWAContext";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Courses from "./pages/Courses";
import Attendance from "./pages/Attendance";
import Assignments from "./pages/Assignments";
import Profile from "./pages/Profile";
import SeatSelection from "./pages/SeatSelection";

import "./styles/global.css";

function App() {
  useEffect(() => {
    // 阻止iOS Safari的橡皮筋效果
    document.addEventListener(
      "touchmove",
      (e) => {
        if ((e as any).scale !== 1) {
          e.preventDefault();
        }
      },
      { passive: false },
    );

    // 阻止双击缩放
    let lastTouchEnd = 0;
    document.addEventListener(
      "touchend",
      (event) => {
        const now = new Date().getTime();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      },
      false,
    );

    // 监听网络状态变化
    const handleOnline = () => console.log("网络已连接");
    const handleOffline = () => console.log("网络已断开");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <Provider store={store}>
      {/* <ConfigProvider locale={zhCN}> */}
      <PWAProvider>
        <AuthProvider>
          <SocketProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/seat-selection/:courseId"
                  element={
                    <ProtectedRoute>
                      <SeatSelection />
                    </ProtectedRoute>
                  }
                />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Navigate to="/home" replace />} />
                  <Route path="home" element={<Home />} />
                  <Route path="courses/*" element={<Courses />} />
                  <Route path="attendance/*" element={<Attendance />} />
                  <Route path="assignments/*" element={<Assignments />} />
                  <Route path="profile" element={<Profile />} />
                </Route>
                <Route path="*" element={<Navigate to="/home" replace />} />
              </Routes>
            </Router>
          </SocketProvider>
        </AuthProvider>
      </PWAProvider>
      {/* </ConfigProvider> */}
    </Provider>
  );
}

export default App;
