import React, { useState, useContext } from "react";
import { unstable_Toast as Toast } from "@ant-design/mobile";
import { AuthContext } from "../contexts/AuthContext";
import { User, UserRole } from "../types";
import { request, uploadFile } from "../services/api";
import "./Profile.css";

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

const List: React.FC<{ children: React.ReactNode }> & {
  Item: React.FC<{
    children: React.ReactNode;
    prefix?: React.ReactNode;
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

List.Item = ({ children, prefix, extra }) => (
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
      {children}
    </div>
    {extra && (
      <div className="list-item-extra" style={{ marginLeft: "12px" }}>
        {extra}
      </div>
    )}
  </div>
);

const Avatar: React.FC<{
  src?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  children?: React.ReactNode;
}> = ({ src, style, onClick, children }) => (
  <div
    className="avatar"
    style={{
      width: "64px",
      height: "64px",
      borderRadius: "50%",
      backgroundColor: "#f0f0f0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundImage: src ? `url(${src})` : undefined,
      backgroundSize: "cover",
      backgroundPosition: "center",
      cursor: onClick ? "pointer" : "default",
      fontSize: "24px",
      fontWeight: "bold",
      color: "#666",
      ...style,
    }}
    onClick={onClick}
  >
    {!src && children}
  </div>
);

const Button: React.FC<{
  children: React.ReactNode;
  block?: boolean;
  fill?: string;
  color?: string;
  onClick?: () => void;
}> = ({ children, block, fill, color, onClick }) => (
  <button
    className={`btn ${fill || ""} ${color || ""} ${block ? "block" : ""}`}
    style={{
      padding: "10px 16px",
      backgroundColor:
        color === "danger"
          ? "#ff4d4f"
          : fill === "outline"
            ? "transparent"
            : "#f5f5f5",
      color:
        color === "danger" ? "#fff" : fill === "outline" ? "#1677ff" : "#000",
      border:
        fill === "outline"
          ? "1px solid #d9d9d9"
          : color === "danger"
            ? "none"
            : "1px solid #d9d9d9",
      borderRadius: "6px",
      cursor: "pointer",
      width: block ? "100%" : "auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
    }}
    onClick={onClick}
  >
    {children}
  </button>
);

const Space: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="space" style={{ display: "flex", gap: "8px" }}>
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
      backgroundColor: color === "primary" ? "#e6f7ff" : "#f5f5f5",
      color: color === "primary" ? "#1677ff" : "#666",
      border: `1px solid ${color === "primary" ? "#91d5ff" : "#d9d9d9"}`,
    }}
  >
    {children}
  </span>
);

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
  confirm?: { title: string; content: string; onConfirm: () => void };
}> & {
  confirm: (options: {
    title: string;
    content: string;
    onConfirm: () => void;
  }) => void;
} = ({ visible, title, content, actions }) => {
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

Modal.confirm = ({ title, content, onConfirm }) => {
  if (window.confirm(`${title}\n${content}`)) {
    onConfirm();
  }
};

const Form: React.FC<{
  children: React.ReactNode;
  form: any;
  layout: string;
  className?: string;
}> & {
  useForm: () => any[];
  Item: React.FC<{
    children: React.ReactNode;
    name: string;
    label: string;
    rules?: any[];
  }>;
} = ({ children, form, layout, className }) => (
  <form
    className={`form ${layout} ${className || ""}`}
    style={{ display: "flex", flexDirection: "column", gap: "16px" }}
  >
    {children}
  </form>
);

Form.useForm = () => {
  const [values, setValues] = React.useState<any>({});
  return [
    {
      setFieldsValue: (newValues: any) => setValues(newValues),
      validateFields: () => Promise.resolve(values),
    },
  ];
};

Form.Item = ({ children, name, label, rules }) => (
  <div
    className="form-item"
    style={{ display: "flex", flexDirection: "column", gap: "4px" }}
  >
    <label style={{ fontSize: "14px", fontWeight: "500" }}>{label}</label>
    {children}
  </div>
);

const Input: React.FC<{ placeholder: string }> = ({ placeholder }) => (
  <input
    type="text"
    placeholder={placeholder}
    style={{
      padding: "8px 12px",
      border: "1px solid #d9d9d9",
      borderRadius: "6px",
      fontSize: "14px",
    }}
  />
);

const ImageUploader: React.FC<{
  value: any[];
  onChange: (files: any[]) => void;
  upload: (file: File) => Promise<any>;
  maxCount: number;
  showUpload: boolean;
  children: React.ReactNode;
}> = ({ value, onChange, upload, maxCount, showUpload, children }) => (
  <div
    className="image-uploader"
    style={{
      textAlign: "center",
      padding: "20px",
      border: "1px dashed #d9d9d9",
      borderRadius: "6px",
    }}
  >
    {showUpload ? (
      <div
        style={{ cursor: "pointer" }}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (file) {
              try {
                await upload(file);
                onChange([{ file }]);
              } catch (error) {
                // Error handled in upload function
              }
            }
          };
          input.click();
        }}
      >
        {children}
      </div>
    ) : (
      children
    )}
  </div>
);

const Divider: React.FC = () => (
  <div
    className="divider"
    style={{ height: "1px", backgroundColor: "#f0f0f0", margin: "16px 0" }}
  ></div>
);

// Icon placeholders
const UserOutline = () => <span style={{ fontSize: "16px" }}>👤</span>;
const EditSOutline = () => <span style={{ fontSize: "16px" }}>✏️</span>;
const PhoneOutline = () => <span style={{ fontSize: "16px" }}>📞</span>;
const MailOutline = () => <span style={{ fontSize: "16px" }}>📧</span>;
const IdcardOutline = () => <span style={{ fontSize: "16px" }}>🆔</span>;
const TeamOutline = () => <span style={{ fontSize: "16px" }}>👥</span>;
const BookOutline = () => <span style={{ fontSize: "16px" }}>📚</span>;
const EnvironmentOutline = () => <span style={{ fontSize: "16px" }}>📍</span>;
const RightOutline = () => <span style={{ fontSize: "16px" }}>▶️</span>;

const Profile: React.FC = () => {
  const { user, updateUser, logout } = useContext(AuthContext);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);

  const getRoleText = (role: UserRole) => {
    switch (role) {
      case UserRole.STUDENT:
        return "学生";
      case UserRole.TEACHER:
        return "教师";
      case UserRole.DEPARTMENT_ADMIN:
        return "系统管理员";
      case UserRole.SUPER_ADMIN:
        return "超级管理员";
      default:
        return role;
    }
  };

  const handleEdit = () => {
    if (!user) return;

    form.setFieldsValue({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      bio: user.bio,
    });
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const updatedUser = await request.put<User>("/users/profile", values);

      updateUser(updatedUser);
      Toast.show({ content: "个人信息更新成功" });
      setEditModalVisible(false);
    } catch (error: any) {
      Toast.show({ content: error.message || "更新失败" });
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setUploading(true);
    try {
      const uploadResult = await uploadFile(file);
      const updatedUser = await request.put<User>("/users/avatar", {
        avatar: uploadResult.url,
      });

      updateUser(updatedUser);
      Toast.show({ content: "头像更新成功" });
      return { url: uploadResult.url };
    } catch (error: any) {
      Toast.show({ content: error.message || "头像上传失败" });
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    Modal.confirm({
      title: "确认退出",
      content: "确定要退出登录吗？",
      onConfirm: async () => {
        try {
          await logout();
          Toast.show({ content: "已安全退出" });
        } catch (error) {
          Toast.show({ content: "退出失败" });
        }
      },
    });
  };

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-content">
        {/* 用户信息卡片 */}
        <Card className="profile-card">
          <div className="profile-header">
            <div className="avatar-container">
              <Avatar
                src={user.avatar}
                style={{ width: "80px", height: "80px" }}
                onClick={() => setAvatarModalVisible(true)}
              >
                {user.firstName?.charAt(0)}
              </Avatar>
              <div
                className="avatar-edit-btn"
                onClick={() => setAvatarModalVisible(true)}
              >
                <EditSOutline />
              </div>
            </div>

            <div className="user-info">
              <div className="user-name">
                {user.firstName} {user.lastName}
              </div>
              <div className="user-role">
                <Tag color="primary">{getRoleText(user.role)}</Tag>
              </div>
              {user.bio && <div className="user-bio">{user.bio}</div>}
            </div>
          </div>

          <div className="profile-actions">
            <Button block fill="outline" onClick={handleEdit}>
              <EditSOutline /> 编辑资料
            </Button>
          </div>
        </Card>

        {/* 个人详情 */}
        <Card className="details-card">
          <div className="details-header">
            <h4>个人详情</h4>
          </div>

          <List>
            <List.Item prefix={<IdcardOutline />} extra={<RightOutline />}>
              学号
              <div className="detail-value">{user.studentId || "未设置"}</div>
            </List.Item>

            <List.Item prefix={<MailOutline />} extra={<RightOutline />}>
              邮箱
              <div className="detail-value">{user.email}</div>
            </List.Item>

            <List.Item prefix={<PhoneOutline />} extra={<RightOutline />}>
              电话
              <div className="detail-value">{user.phone || "未设置"}</div>
            </List.Item>

            <List.Item prefix={<EnvironmentOutline />} extra={<RightOutline />}>
              院系
              <div className="detail-value">{user.department || "未设置"}</div>
            </List.Item>

            <List.Item prefix={<BookOutline />} extra={<RightOutline />}>
              专业
              <div className="detail-value">{user.major || "未设置"}</div>
            </List.Item>

            <List.Item prefix={<TeamOutline />} extra={<RightOutline />}>
              年级
              <div className="detail-value">{user.grade || "未设置"}</div>
            </List.Item>
          </List>
        </Card>

        {/* 系统信息 */}
        <Card className="system-card">
          <div className="system-header">
            <h4>系统信息</h4>
          </div>

          <List>
            <List.Item>
              上次登录
              <div className="detail-value">
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleString()
                  : "从未登录"}
              </div>
            </List.Item>

            <List.Item>
              注册时间
              <div className="detail-value">
                {new Date(user.createdAt).toLocaleString()}
              </div>
            </List.Item>
          </List>
        </Card>

        {/* 退出登录 */}
        <div className="logout-section">
          <Button block color="danger" fill="outline" onClick={handleLogout}>
            退出登录
          </Button>
        </div>
      </div>

      {/* 编辑资料模态框 */}
      <Modal
        visible={editModalVisible}
        title="编辑个人资料"
        content={
          <Form form={form} layout="vertical" className="edit-form">
            <Form.Item
              name="firstName"
              label="姓"
              rules={[{ required: true, message: "请输入姓" }]}
            >
              <Input placeholder="请输入姓" />
            </Form.Item>

            <Form.Item
              name="lastName"
              label="名"
              rules={[{ required: true, message: "请输入名" }]}
            >
              <Input placeholder="请输入名" />
            </Form.Item>

            <Form.Item
              name="phone"
              label="电话号码"
              rules={[
                { pattern: /^1[3-9]\d{9}$/, message: "请输入正确的手机号码" },
              ]}
            >
              <Input placeholder="请输入电话号码" />
            </Form.Item>

            <Form.Item name="bio" label="个人简介">
              <Input placeholder="请输入个人简介" />
            </Form.Item>
          </Form>
        }
        actions={[
          {
            key: "cancel",
            text: "取消",
            onClick: () => setEditModalVisible(false),
          },
          {
            key: "save",
            text: "保存",
            primary: true,
            onClick: handleSave,
          },
        ]}
      />

      {/* 头像上传模态框 */}
      <Modal
        visible={avatarModalVisible}
        title="更换头像"
        content={
          <div className="avatar-upload">
            <div className="current-avatar">
              <Avatar
                src={user.avatar}
                style={{ width: "120px", height: "120px" }}
              >
                {user.firstName?.charAt(0)}
              </Avatar>
            </div>

            <Divider />

            <ImageUploader
              value={[]}
              onChange={async (files) => {
                if (files.length > 0 && files[0].file) {
                  try {
                    await handleAvatarUpload(files[0].file);
                    setAvatarModalVisible(false);
                  } catch (error) {
                    // 错误已在handleAvatarUpload中处理
                  }
                }
              }}
              upload={handleAvatarUpload}
              maxCount={1}
              showUpload={!uploading}
            >
              <div className="upload-placeholder">
                {uploading ? "上传中..." : "点击选择新头像"}
              </div>
            </ImageUploader>
          </div>
        }
        actions={[
          {
            key: "close",
            text: "关闭",
            onClick: () => setAvatarModalVisible(false),
          },
        ]}
      />
    </div>
  );
};

export default Profile;
