import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, Space, Alert, Spin } from 'antd';
import { UserOutlined, LockOutlined, BookOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoginDto } from '../types';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const [form] = Form.useForm();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitLoading, setSubmitLoading] = useState(false);

  // 获取重定向路径
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  useEffect(() => {
    // 如果已登录，直接跳转
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    // 清除错误信息当组件挂载时
    clearError();
  }, [clearError]);

  const onFinish = async (values: LoginDto) => {
    setSubmitLoading(true);
    try {
      await login(values);
      // 登录成功后会自动跳转（通过上面的useEffect）
    } catch (error) {
      // 错误处理已在AuthContext中完成
    } finally {
      setSubmitLoading(false);
    }
  };

  // 演示账号
  const demoAccounts = [
    { email: 'teacher@example.com', password: 'teacher123456', role: '教师' },
    { email: 'admin@smartteacher.com', password: 'admin123456', role: '管理员' },
  ];

  const fillDemoAccount = (email: string, password: string) => {
    form.setFieldsValue({ email, password });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" tip="正在初始化..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo和标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-4">
            <BookOutlined className="text-2xl text-white" />
          </div>
          <Title level={2} className="text-gray-800 mb-2">
            智慧教师专业版
          </Title>
          <Text className="text-gray-600">教师端管理系统</Text>
        </div>

        {/* 登录表单 */}
        <Card className="shadow-lg">
          <Form
            form={form}
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
          >
            {error && (
              <Alert
                message="登录失败"
                description={error}
                type="error"
                showIcon
                className="mb-4"
                closable
                onClose={clearError}
              />
            )}

            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱地址' },
                { type: 'email', message: '请输入有效的邮箱地址' },
              ]}
            >
              <Input
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder="邮箱地址"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6位' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="密码"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="w-full"
                loading={submitLoading}
                size="large"
              >
                {submitLoading ? '登录中...' : '登录'}
              </Button>
            </Form.Item>
          </Form>

          {/* 演示账号 */}
          {process.env.NODE_ENV === 'development' && (
            <div className="border-t pt-4">
              <Text className="text-sm text-gray-500 block mb-3">
                演示账号（开发环境）：
              </Text>
              <Space direction="vertical" className="w-full" size="small">
                {demoAccounts.map((account, index) => (
                  <Button
                    key={index}
                    type="link"
                    size="small"
                    className="text-left p-0 h-auto"
                    onClick={() => fillDemoAccount(account.email, account.password)}
                  >
                    <div className="text-xs">
                      <div>{account.role}: {account.email}</div>
                      <div className="text-gray-400">密码: {account.password}</div>
                    </div>
                  </Button>
                ))}
              </Space>
            </div>
          )}
        </Card>

        {/* 底部信息 */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>© 2024 SmartTeacher Pro. 智慧教育，从这里开始。</p>
        </div>
      </div>
    </div>
  );
};

export default Login;