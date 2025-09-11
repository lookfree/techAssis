import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Switch, 
  Select, 
  Upload, 
  Avatar, 
  Divider,
  Row,
  Col,
  Typography,
  Space,
  Tabs,
  Modal,
  message,
  ColorPicker,
  Slider,
  Radio,
  InputNumber
} from 'antd';
import {
  UserOutlined,
  UploadOutlined,
  SettingOutlined,
  BellOutlined,
  SecurityScanOutlined,
  BgColorsOutlined,
  SaveOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { request, uploadFile } from '../services/api';
import { User } from '../types';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Password } = Input;

interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  primaryColor: string;
  fontSize: number;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    assignment: boolean;
    attendance: boolean;
    grade: boolean;
  };
  privacy: {
    showProfile: boolean;
    showEmail: boolean;
    showPhone: boolean;
  };
  teaching: {
    autoGrading: boolean;
    attendanceReminder: boolean;
    deadlineNotification: number; // days before
    defaultAssignmentDuration: number; // days
  };
}

const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [settingsForm] = Form.useForm();
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'light',
    language: 'zh-CN',
    primaryColor: '#1890ff',
    fontSize: 14,
    notifications: {
      email: true,
      push: true,
      sms: false,
      assignment: true,
      attendance: true,
      grade: true,
    },
    privacy: {
      showProfile: true,
      showEmail: false,
      showPhone: false,
    },
    teaching: {
      autoGrading: false,
      attendanceReminder: true,
      deadlineNotification: 3,
      defaultAssignmentDuration: 7,
    },
  });
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  useEffect(() => {
    loadUserSettings();
    if (user) {
      form.setFieldsValue(user);
    }
  }, [user, form]);

  const loadUserSettings = async () => {
    try {
      const response = await request.get<UserSettings>('/users/settings');
      setSettings(response);
      settingsForm.setFieldsValue(response);
    } catch (error) {
      console.error('加载用户设置失败:', error);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const updatedUser = await request.put<User>('/users/profile', values);
      updateUser(updatedUser);
      message.success('个人信息更新成功');
    } catch (error) {
      message.error('更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      setLoading(true);
      const values = await settingsForm.validateFields();
      await request.put('/users/settings', values);
      setSettings(values);
      message.success('设置保存成功');
    } catch (error) {
      message.error('保存设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      const values = await passwordForm.validateFields();
      await request.put('/auth/change-password', values);
      message.success('密码修改成功');
      setPasswordModalVisible(false);
      passwordForm.resetFields();
    } catch (error) {
      message.error('密码修改失败');
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      const uploadResult = await uploadFile(file);
      const updatedUser = await request.put<User>('/users/avatar', {
        avatar: uploadResult.url,
      });
      updateUser(updatedUser);
      message.success('头像更新成功');
      return { url: uploadResult.url };
    } catch (error) {
      message.error('头像上传失败');
      throw error;
    }
  };

  const renderProfileTab = () => (
    <Card title="个人信息" extra={<Button type="primary" onClick={handleUpdateProfile} loading={loading}><SaveOutlined /> 保存</Button>}>
      <Form form={form} layout="vertical">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <Upload
            name="avatar"
            listType="picture-circle"
            className="avatar-uploader"
            showUploadList={false}
            customRequest={({ file, onSuccess, onError }) => {
              handleAvatarUpload(file as File)
                .then(onSuccess)
                .catch(onError);
            }}
          >
            <Avatar size={80} src={user?.avatar} icon={<UserOutlined />} />
          </Upload>
          <div style={{ marginLeft: 16 }}>
            <Title level={4} style={{ margin: 0 }}>
              {user?.firstName} {user?.lastName}
            </Title>
            <Text type="secondary">点击头像更换</Text>
          </div>
        </div>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="firstName"
              label="姓"
              rules={[{ required: true, message: '请输入姓' }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="lastName"
              label="名"
              rules={[{ required: true, message: '请输入名' }]}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入正确的邮箱格式' }
              ]}
            >
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="phone"
              label="电话"
              rules={[
                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="department" label="院系">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="jobTitle" label="职位">
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="bio" label="个人简介">
          <TextArea rows={4} placeholder="请输入个人简介" />
        </Form.Item>
      </Form>

      <Divider />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={5}>安全设置</Title>
          <Text type="secondary">管理您的账户安全</Text>
        </div>
        <Button onClick={() => setPasswordModalVisible(true)}>
          <SecurityScanOutlined /> 修改密码
        </Button>
      </div>
    </Card>
  );

  const renderAppearanceTab = () => (
    <Card title="外观设置" extra={<Button type="primary" onClick={handleUpdateSettings} loading={loading}><SaveOutlined /> 保存</Button>}>
      <Form form={settingsForm} layout="vertical">
        <Form.Item name="theme" label="主题模式">
          <Radio.Group>
            <Radio value="light">浅色模式</Radio>
            <Radio value="dark">深色模式</Radio>
            <Radio value="auto">跟随系统</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="primaryColor" label="主题色">
          <ColorPicker showText />
        </Form.Item>

        <Form.Item name="fontSize" label="字体大小">
          <Slider
            min={12}
            max={18}
            marks={{
              12: '小',
              14: '中',
              16: '大',
              18: '特大'
            }}
          />
        </Form.Item>

        <Form.Item name="language" label="语言">
          <Select>
            <Option value="zh-CN">简体中文</Option>
            <Option value="en-US">English</Option>
          </Select>
        </Form.Item>
      </Form>
    </Card>
  );

  const renderNotificationTab = () => (
    <Card title="通知设置" extra={<Button type="primary" onClick={handleUpdateSettings} loading={loading}><SaveOutlined /> 保存</Button>}>
      <Form form={settingsForm} layout="vertical">
        <Title level={5}>通知方式</Title>
        <Form.Item name={['notifications', 'email']} valuePropName="checked">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div>邮件通知</div>
              <Text type="secondary">接收重要通知的邮件</Text>
            </div>
            <Switch />
          </div>
        </Form.Item>

        <Form.Item name={['notifications', 'push']} valuePropName="checked">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div>桌面通知</div>
              <Text type="secondary">在浏览器中显示通知</Text>
            </div>
            <Switch />
          </div>
        </Form.Item>

        <Form.Item name={['notifications', 'sms']} valuePropName="checked">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div>短信通知</div>
              <Text type="secondary">重要事件的短信提醒</Text>
            </div>
            <Switch />
          </div>
        </Form.Item>

        <Divider />

        <Title level={5}>通知类型</Title>
        <Form.Item name={['notifications', 'assignment']} valuePropName="checked">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div>作业通知</div>
              <Text type="secondary">作业提交、评分等通知</Text>
            </div>
            <Switch />
          </div>
        </Form.Item>

        <Form.Item name={['notifications', 'attendance']} valuePropName="checked">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div>考勤通知</div>
              <Text type="secondary">学生签到状态通知</Text>
            </div>
            <Switch />
          </div>
        </Form.Item>

        <Form.Item name={['notifications', 'grade']} valuePropName="checked">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div>成绩通知</div>
              <Text type="secondary">成绩相关的通知</Text>
            </div>
            <Switch />
          </div>
        </Form.Item>
      </Form>
    </Card>
  );

  const renderTeachingTab = () => (
    <Card title="教学设置" extra={<Button type="primary" onClick={handleUpdateSettings} loading={loading}><SaveOutlined /> 保存</Button>}>
      <Form form={settingsForm} layout="vertical">
        <Form.Item name={['teaching', 'autoGrading']} valuePropName="checked">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div>智能评分</div>
              <Text type="secondary">对客观题启用AI自动评分</Text>
            </div>
            <Switch />
          </div>
        </Form.Item>

        <Form.Item name={['teaching', 'attendanceReminder']} valuePropName="checked">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div>考勤提醒</div>
              <Text type="secondary">上课前自动提醒发起签到</Text>
            </div>
            <Switch />
          </div>
        </Form.Item>

        <Form.Item 
          name={['teaching', 'deadlineNotification']} 
          label="作业截止提醒"
          tooltip="在截止日期前多少天提醒学生"
        >
          <InputNumber min={1} max={7} suffix="天前" />
        </Form.Item>

        <Form.Item 
          name={['teaching', 'defaultAssignmentDuration']} 
          label="默认作业时长"
          tooltip="创建作业时的默认完成期限"
        >
          <InputNumber min={1} max={30} suffix="天" />
        </Form.Item>
      </Form>
    </Card>
  );

  const renderPrivacyTab = () => (
    <Card title="隐私设置" extra={<Button type="primary" onClick={handleUpdateSettings} loading={loading}><SaveOutlined /> 保存</Button>}>
      <Form form={settingsForm} layout="vertical">
        <Title level={5}>信息可见性</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          控制其他用户可以看到您的哪些信息
        </Text>

        <Form.Item name={['privacy', 'showProfile']} valuePropName="checked">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div>显示个人资料</div>
              <Text type="secondary">允许学生查看您的基本信息</Text>
            </div>
            <Switch />
          </div>
        </Form.Item>

        <Form.Item name={['privacy', 'showEmail']} valuePropName="checked">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div>显示邮箱地址</div>
              <Text type="secondary">在个人资料中显示邮箱</Text>
            </div>
            <Switch />
          </div>
        </Form.Item>

        <Form.Item name={['privacy', 'showPhone']} valuePropName="checked">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div>显示电话号码</div>
              <Text type="secondary">在个人资料中显示电话</Text>
            </div>
            <Switch />
          </div>
        </Form.Item>
      </Form>
    </Card>
  );

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>设置</Title>
        <Text type="secondary">管理您的账户设置和偏好</Text>
      </div>

      <Tabs defaultActiveKey="profile" size="large">
        <TabPane 
          tab={<span><UserOutlined />个人信息</span>} 
          key="profile"
        >
          {renderProfileTab()}
        </TabPane>
        
        <TabPane 
          tab={<span><BgColorsOutlined />外观</span>} 
          key="appearance"
        >
          {renderAppearanceTab()}
        </TabPane>
        
        <TabPane 
          tab={<span><BellOutlined />通知</span>} 
          key="notifications"
        >
          {renderNotificationTab()}
        </TabPane>
        
        <TabPane 
          tab={<span><SettingOutlined />教学</span>} 
          key="teaching"
        >
          {renderTeachingTab()}
        </TabPane>
        
        <TabPane 
          tab={<span><SecurityScanOutlined />隐私</span>} 
          key="privacy"
        >
          {renderPrivacyTab()}
        </TabPane>
      </Tabs>

      {/* 修改密码模态框 */}
      <Modal
        title="修改密码"
        open={passwordModalVisible}
        onCancel={() => setPasswordModalVisible(false)}
        onOk={handleChangePassword}
        destroyOnClose
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item
            name="currentPassword"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Password placeholder="请输入当前密码" />
          </Form.Item>
          
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度至少6位' }
            ]}
          >
            <Password placeholder="请输入新密码" />
          </Form.Item>
          
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Settings;