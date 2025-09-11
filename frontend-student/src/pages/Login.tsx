import React, { useState, useContext, useEffect } from "react";
import {
  unstable_Form as Form,
  unstable_InputItem as Input,
  unstable_Toast as Toast,
} from "@ant-design/mobile";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../components/PlaceholderComponents";
import { AuthContext } from "../contexts/AuthContext";
import { LoginDto } from "../types";
import "./Login.css";

// Placeholder components
const Card: any = ({ children, className }: any) => (
  <div className={`bg-white rounded-lg p-4 shadow-sm ${className || ""}`}>
    {children}
  </div>
);
const Space: any = ({ children, direction, style }: any) => (
  <div
    className={`${direction === "vertical" ? "space-y-2" : "space-x-2"} flex ${direction === "vertical" ? "flex-col" : ""}`}
    style={style}
  >
    {children}
  </div>
);
const Divider: any = () => <hr className="my-4" />;
const EyeInvisibleOutline = () => <span>👁️‍🗨️</span>;
const EyeOutline = () => <span>👁️</span>;

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useContext(AuthContext);

  // If user is already logged in, redirect them away
  useEffect(() => {
    if (user) {
      const from = (location.state as any)?.from?.pathname || "/home";
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({ content: "请填写邮箱和密码" });
      return;
    }

    setLoading(true);
    try {
      await login({ email, password });
      Toast.show({ content: "登录成功" });
      
      // Redirect to where they were trying to go, or home
      const from = (location.state as any)?.from?.pathname || "/home";
      navigate(from, { replace: true });
    } catch (error: any) {
      Toast.show({ content: error.message || "登录失败，请重试" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '0 20px'
      }}>
        {/* Logo和标题部分 */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%)',
            borderRadius: '50%',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            fontSize: '36px',
            color: 'white',
            fontWeight: 'bold',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }}>
            ST
          </div>
          <h1 style={{
            color: 'white',
            fontSize: '28px',
            fontWeight: 'bold',
            margin: '0 0 8px 0',
            textShadow: '0 2px 10px rgba(0,0,0,0.3)'
          }}>
            SmartTeacher Pro
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '16px',
            margin: 0,
            textShadow: '0 1px 5px rgba(0,0,0,0.3)'
          }}>
            智慧教师专业版 - 学生端
          </p>
        </div>

        {/* 登录表单 */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '40px 30px',
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          marginBottom: '30px'
        }}>
          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'rgba(255,255,255,0.9)',
              marginBottom: '8px',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}>
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入学生邮箱"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '12px',
                fontSize: '16px',
                color: 'white',
                outline: 'none',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.25)';
                e.target.style.border = '1px solid rgba(255,255,255,0.5)';
                e.target.style.boxShadow = '0 0 20px rgba(255,255,255,0.2)';
              }}
              onBlur={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.2)';
                e.target.style.border = '1px solid rgba(255,255,255,0.3)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'rgba(255,255,255,0.9)',
              marginBottom: '8px',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}>
              密码
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={visible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  paddingRight: '50px',
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  fontSize: '16px',
                  color: 'white',
                  outline: 'none',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.25)';
                  e.target.style.border = '1px solid rgba(255,255,255,0.5)';
                  e.target.style.boxShadow = '0 0 20px rgba(255,255,255,0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.2)';
                  e.target.style.border = '1px solid rgba(255,255,255,0.3)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: '15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '18px',
                  transition: 'color 0.3s ease'
                }}
                onClick={() => setVisible(!visible)}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.7)';
                }}
              >
                {visible ? <EyeOutline /> : <EyeInvisibleOutline />}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading 
                ? 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.2) 100%)'
                : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(10px)',
              opacity: loading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.target as HTMLButtonElement).style.boxShadow = '0 12px 35px rgba(0,0,0,0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.target as HTMLButtonElement).style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)';
              }
            }}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </div>

        {/* 开发测试账户提示 */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.1) 100%)',
            backdropFilter: 'blur(10px)',
            borderRadius: '15px',
            padding: '20px',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.9)',
              marginBottom: '12px',
              fontWeight: '600',
              textShadow: '0 1px 3px rgba(0,0,0,0.3)'
            }}>
              🛠️ 开发测试账户
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '15px',
              marginBottom: '8px',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.8)',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>邮箱：student1@university.edu</span>
                <button
                  onClick={() => setEmail('student1@university.edu')}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '11px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)';
                  }}
                >
                  填入
                </button>
              </div>
              <div style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.8)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>密码：student123456</span>
                <button
                  onClick={() => setPassword('student123456')}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '11px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)';
                  }}
                >
                  填入
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                setEmail('student1@university.edu');
                setPassword('student123456');
              }}
              style={{
                width: '100%',
                padding: '8px',
                background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.8) 0%, rgba(76, 175, 80, 0.6) 100%)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)';
                (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.4)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.target as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              一键填入测试账户
            </button>
          </div>
        )}

        {/* 底部信息 */}
        <div style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '14px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            backdropFilter: 'blur(10px)',
            borderRadius: '15px',
            padding: '20px',
            border: '1px solid rgba(255,255,255,0.2)',
            marginBottom: '15px'
          }}>
            <p style={{ 
              margin: '0 0 10px 0', 
              lineHeight: '1.5',
              textShadow: '0 1px 3px rgba(0,0,0,0.3)' 
            }}>
              如果您忘记了密码，请联系任课教师或管理员重置
            </p>
          </div>
          <p style={{ 
            margin: 0, 
            fontSize: '12px',
            opacity: 0.7,
            textShadow: '0 1px 2px rgba(0,0,0,0.3)' 
          }}>
            Version 1.0.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
