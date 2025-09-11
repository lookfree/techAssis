import React, { useState, useEffect } from "react";
import { unstable_Toast as Toast } from "@ant-design/mobile";
import { useNavigate } from "react-router-dom";
import {
  Assignment,
  Submission,
  SubmissionStatus,
  AssignmentType,
} from "../types";
import { request, uploadFile } from "../services/api";
import "./Assignments.css";

// Placeholder components
const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}> = ({ children, className, style, onClick }) => (
  <div
    className={`card ${className || ""}`}
    style={{
      padding: "16px",
      margin: "8px 0",
      backgroundColor: "#fff",
      borderRadius: "8px",
      border: "1px solid #f0f0f0",
      ...style,
    }}
    onClick={onClick}
  >
    {children}
  </div>
);

const Button: React.FC<{
  children: React.ReactNode;
  size?: string;
  fill?: string;
  color?: string;
  onClick?: () => void;
  disabled?: boolean;
  block?: boolean;
  loading?: boolean;
}> = ({ children, size, fill, color, onClick, disabled, block, loading }) => (
  <button
    className={`btn ${size || ""} ${fill || ""} ${color || ""} ${block ? "block" : ""}`}
    style={{
      padding: size === "small" ? "6px 12px" : "10px 16px",
      backgroundColor:
        color === "primary"
          ? "#1677ff"
          : fill === "outline"
            ? "transparent"
            : "#f5f5f5",
      color:
        color === "primary" ? "#fff" : fill === "outline" ? "#1677ff" : "#000",
      border: fill === "outline" ? "1px solid #d9d9d9" : "none",
      borderRadius: "6px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.6 : 1,
      width: block ? "100%" : "auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
    }}
    onClick={onClick}
    disabled={disabled || loading}
  >
    {loading ? "Loading..." : children}
  </button>
);

const Space: React.FC<{
  children: React.ReactNode;
  direction?: "vertical" | "horizontal";
  style?: React.CSSProperties;
  block?: boolean;
}> = ({ children, direction = "horizontal", style, block }) => (
  <div
    className={`space ${direction} ${block ? "block" : ""}`}
    style={{
      display: "flex",
      flexDirection: direction === "vertical" ? "column" : "row",
      gap: "8px",
      width: block ? "100%" : "auto",
      ...style,
    }}
  >
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
      backgroundColor:
        color === "primary"
          ? "#e6f7ff"
          : color === "success"
            ? "#f6ffed"
            : color === "warning"
              ? "#fff7e6"
              : color === "danger"
                ? "#fff2f0"
                : "#f5f5f5",
      color:
        color === "primary"
          ? "#1677ff"
          : color === "success"
            ? "#52c41a"
            : color === "warning"
              ? "#faad14"
              : color === "danger"
                ? "#ff4d4f"
                : "#666",
      border: `1px solid ${color === "primary" ? "#91d5ff" : color === "success" ? "#b7eb8f" : color === "warning" ? "#ffd591" : color === "danger" ? "#ffadd2" : "#d9d9d9"}`,
    }}
  >
    {children}
  </span>
);

const List: React.FC<{ children: React.ReactNode }> & {
  Item: React.FC<{
    children: React.ReactNode;
    prefix?: React.ReactNode;
    description?: React.ReactNode;
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

List.Item = ({ children, prefix, description, extra }) => (
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
      <div>{children}</div>
      {description && (
        <div
          className="list-item-description"
          style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}
        >
          {description}
        </div>
      )}
    </div>
    {extra && (
      <div className="list-item-extra" style={{ marginLeft: "12px" }}>
        {extra}
      </div>
    )}
  </div>
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
}> = ({ visible, title, content, actions }) => {
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

const TextArea: React.FC<{
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  maxLength: number;
  showCount: boolean;
}> = ({ placeholder, value, onChange, rows, maxLength, showCount }) => (
  <div>
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      maxLength={maxLength}
      style={{
        width: "100%",
        padding: "8px",
        border: "1px solid #d9d9d9",
        borderRadius: "6px",
        resize: "vertical",
        fontFamily: "inherit",
      }}
    />
    {showCount && (
      <div
        style={{
          textAlign: "right",
          fontSize: "12px",
          color: "#666",
          marginTop: "4px",
        }}
      >
        {value.length}/{maxLength}
      </div>
    )}
  </div>
);

const PullToRefresh: React.FC<{
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
}> = ({ children, onRefresh }) => {
  return <div className="pull-to-refresh">{children}</div>;
};

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
        color === "primary"
          ? "#1677ff"
          : color === "success"
            ? "#52c41a"
            : color === "warning"
              ? "#faad14"
              : color === "danger"
                ? "#ff4d4f"
                : "#d9d9d9",
      color: "#fff",
    }}
  >
    {content}
  </span>
);

const Progress: React.FC<{ percent: number }> = ({ percent }) => (
  <div
    className="progress"
    style={{
      width: "100%",
      height: "8px",
      backgroundColor: "#f0f0f0",
      borderRadius: "4px",
      overflow: "hidden",
    }}
  >
    <div
      className="progress-bar"
      style={{
        width: `${percent}%`,
        height: "100%",
        backgroundColor: "#1677ff",
      }}
    ></div>
  </div>
);

// Icon placeholders
const FileOutline = () => <span style={{ fontSize: "16px" }}>📄</span>;
const ClockCircleOutline = ({ fontSize }: { fontSize?: number }) => (
  <span style={{ fontSize: fontSize || 16 }}>⏰</span>
);
const CheckCircleOutline = ({ fontSize }: { fontSize?: number }) => (
  <span style={{ fontSize: fontSize || 16 }}>✅</span>
);
const ExclamationCircleOutline = ({ fontSize }: { fontSize?: number }) => (
  <span style={{ fontSize: fontSize || 16 }}>⚠️</span>
);
const UploadOutline = () => <span style={{ fontSize: "16px" }}>📤</span>;
const EyeOutline = () => <span style={{ fontSize: "16px" }}>👁️</span>;

const Assignments: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("todo");
  const [submissionModalVisible, setSubmissionModalVisible] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [submissionContent, setSubmissionContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assignmentsRes, submissionsRes] = await Promise.all([
        request.get<Assignment[]>("/assignments/student"),
        request.get<Submission[]>("/submissions/student"),
      ]);
      setAssignments(assignmentsRes);
      setSubmissions(submissionsRes);
    } catch (error: any) {
      Toast.show(error.message || "加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    await loadData();
  };

  const getAssignmentTypeText = (type: AssignmentType) => {
    switch (type) {
      case AssignmentType.HOMEWORK:
        return "作业";
      case AssignmentType.EXAM:
        return "考试";
      case AssignmentType.PROJECT:
        return "项目";
      case AssignmentType.QUIZ:
        return "测验";
      case AssignmentType.ESSAY:
        return "论文";
      case AssignmentType.LAB_REPORT:
        return "实验报告";
      default:
        return type;
    }
  };

  const getSubmissionStatusText = (status: SubmissionStatus) => {
    switch (status) {
      case SubmissionStatus.DRAFT:
        return "草稿";
      case SubmissionStatus.SUBMITTED:
        return "已提交";
      case SubmissionStatus.GRADED:
        return "已评分";
      case SubmissionStatus.RETURNED:
        return "已退回";
      case SubmissionStatus.RESUBMITTED:
        return "重新提交";
      default:
        return status;
    }
  };

  const getSubmissionStatusColor = (status: SubmissionStatus) => {
    switch (status) {
      case SubmissionStatus.DRAFT:
        return "default";
      case SubmissionStatus.SUBMITTED:
        return "primary";
      case SubmissionStatus.GRADED:
        return "success";
      case SubmissionStatus.RETURNED:
        return "warning";
      case SubmissionStatus.RESUBMITTED:
        return "primary";
      default:
        return "default";
    }
  };

  const isOverdue = (dueDate: Date) => {
    return new Date() > new Date(dueDate);
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getSubmissionForAssignment = (assignmentId: string) => {
    return submissions.find((sub) => sub.assignmentId === assignmentId);
  };

  const handleSubmit = (assignment: Assignment) => {
    setSelectedAssignment(assignment);

    const existingSubmission = getSubmissionForAssignment(assignment.id);
    if (existingSubmission) {
      setSubmissionContent(existingSubmission.content || "");
    } else {
      setSubmissionContent("");
    }

    setSubmissionModalVisible(true);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map((file) =>
        uploadFile(file, (progress) => {
          // 可以显示上传进度
        }),
      );

      const uploadResults = await Promise.all(uploadPromises);

      Toast.show({ content: `成功上传 ${uploadResults.length} 个文件` });
    } catch (error: any) {
      Toast.show({ content: error.message || "文件上传失败" });
    } finally {
      setUploading(false);
    }
  };

  const submitAssignment = async () => {
    if (!selectedAssignment) return;

    if (!submissionContent.trim()) {
      Toast.show({ content: "请输入提交内容" });
      return;
    }

    try {
      await request.post("/submissions", {
        assignmentId: selectedAssignment.id,
        content: submissionContent,
      });

      Toast.show({ content: "提交成功！" });

      setSubmissionModalVisible(false);
      setSelectedAssignment(null);
      setSubmissionContent("");
      loadData();
    } catch (error: any) {
      Toast.show(error.message || "提交失败");
    }
  };

  const renderAssignmentCard = (assignment: Assignment) => {
    const submission = getSubmissionForAssignment(assignment.id);
    const overdue = isOverdue(assignment.dueDate);
    const daysUntilDue = getDaysUntilDue(assignment.dueDate);

    return (
      <div key={assignment.id} style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.3)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        (e.target as HTMLElement).style.transform = 'translateY(-2px)';
        (e.target as HTMLElement).style.boxShadow = '0 25px 70px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        (e.target as HTMLElement).style.transform = 'translateY(0)';
        (e.target as HTMLElement).style.boxShadow = '0 20px 60px rgba(0,0,0,0.2)';
      }}
      >
        {/* 顶部状态条 */}
        <div style={{
          height: '4px',
          background: submission 
            ? 'linear-gradient(135deg, #22c55e 0%, #3b82f6 100%)'
            : overdue 
            ? 'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)'
            : daysUntilDue <= 1
            ? 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
            : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
        }}></div>

        <div style={{ padding: '24px' }}>
          {/* 头部信息 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  borderRadius: '50%',
                  marginRight: '12px',
                  marginTop: '8px'
                }}></div>
                <div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: 'white',
                    margin: '0 0 12px 0',
                    textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                  }}>
                    {assignment.title}
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                      {getAssignmentTypeText(assignment.type)}
                    </span>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                      {assignment.course?.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 状态徽章 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
              {submission ? (
                <div style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'white',
                  background:
                    getSubmissionStatusColor(submission.status) === 'success' ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                    : getSubmissionStatusColor(submission.status) === 'primary' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                    : getSubmissionStatusColor(submission.status) === 'warning' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                }}>
                  {getSubmissionStatusText(submission.status)}
                </div>
              ) : overdue ? (
                <div style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                }}>
                  已逾期
                </div>
              ) : daysUntilDue <= 1 ? (
                <div style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                }}>
                  即将到期
                </div>
              ) : null}
            </div>
          </div>

          {/* 作业描述 */}
          <div style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.9)',
            marginBottom: '20px',
            lineHeight: '1.5',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {assignment.description}
          </div>

          {/* 详细信息 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
              <div style={{
                width: '20px',
                height: '20px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px',
                fontSize: '12px'
              }}>
                ⏰
              </div>
              <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                截止时间：{new Date(assignment.dueDate).toLocaleString()}
              </span>
            </div>

            {!overdue && daysUntilDue >= 0 && (
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '12px',
                  fontSize: '12px'
                }}>
                  ⚠️
                </div>
                <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                  {daysUntilDue === 0
                    ? "今天到期"
                    : daysUntilDue === 1
                      ? "明天到期"
                      : `${daysUntilDue} 天后到期`}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '8px',
                  fontSize: '12px'
                }}>
                  📊
                </div>
                <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>满分：{assignment.maxScore} 分</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '8px',
                  fontSize: '12px'
                }}>
                  ⚖️
                </div>
                <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>权重：{assignment.weight}%</span>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255,255,255,0.2)'
          }}>
            <button
              style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}
              onClick={() => navigate(`/assignment/${assignment.id}`)}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.color = 'white';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.8)';
              }}
            >
              👁️ 查看详情
            </button>

            {!submission || submission.status === SubmissionStatus.RETURNED ? (
              <button
                style={{
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  border: 'none',
                  cursor: overdue && !assignment.allowMultipleSubmissions ? 'not-allowed' : 'pointer',
                  background: overdue && !assignment.allowMultipleSubmissions
                    ? 'linear-gradient(135deg, rgba(107, 114, 128, 0.5) 0%, rgba(75, 85, 99, 0.5) 100%)'
                    : 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                  color: 'white',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  boxShadow: '0 8px 25px rgba(139, 92, 246, 0.3)',
                  opacity: overdue && !assignment.allowMultipleSubmissions ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={() => handleSubmit(assignment)}
                disabled={overdue && !assignment.allowMultipleSubmissions}
                onMouseEnter={(e) => {
                  if (!(overdue && !assignment.allowMultipleSubmissions)) {
                    (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)';
                    (e.target as HTMLButtonElement).style.boxShadow = '0 12px 35px rgba(139, 92, 246, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(overdue && !assignment.allowMultipleSubmissions)) {
                    (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                    (e.target as HTMLButtonElement).style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.3)';
                  }
                }}
              >
                📤 {submission ? "重新提交" : "提交作业"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const renderSubmissionCard = (submission: Submission) => (
    <div key={submission.id} style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
      backdropFilter: 'blur(20px)',
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.3)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      position: 'relative'
    }}
    onMouseEnter={(e) => {
      (e.target as HTMLElement).style.transform = 'translateY(-2px)';
      (e.target as HTMLElement).style.boxShadow = '0 25px 70px rgba(0,0,0,0.3)';
    }}
    onMouseLeave={(e) => {
      (e.target as HTMLElement).style.transform = 'translateY(0)';
      (e.target as HTMLElement).style.boxShadow = '0 20px 60px rgba(0,0,0,0.2)';
    }}
    >
      {/* 顶部状态条 */}
      <div style={{
        height: '4px',
        background: submission.grade 
          ? 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)'
          : submission.status === SubmissionStatus.SUBMITTED
          ? 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)'
          : submission.isLate
          ? 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
          : 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
      }}></div>

      <div style={{ padding: '24px' }}>
        {/* 头部信息 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                borderRadius: '50%',
                marginRight: '12px',
                marginTop: '8px'
              }}></div>
              <div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: 'white',
                  margin: '0 0 12px 0',
                  textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                }}>
                  {submission.assignment?.title || "未知作业"}
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'white',
                    background:
                      getSubmissionStatusColor(submission.status) === 'success' ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                      : getSubmissionStatusColor(submission.status) === 'primary' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                      : getSubmissionStatusColor(submission.status) === 'warning' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                      : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    {getSubmissionStatusText(submission.status)}
                  </span>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    {submission.assignment?.course?.name}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 成绩显示 */}
          {submission.grade && (
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'white',
                textShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }}>
                {submission.grade.score}/{submission.grade.maxScore}
              </div>
              <div style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.8)',
                fontWeight: '600',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}>
                {submission.grade.percentage}%
              </div>
            </div>
          )}
        </div>

        {/* 详细信息 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {submission.submittedAt && (
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
              <div style={{
                width: '20px',
                height: '20px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px',
                fontSize: '12px'
              }}>
                ✅
              </div>
              <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                提交时间：{new Date(submission.submittedAt).toLocaleString()}
              </span>
            </div>
          )}

          {submission.isLate && submission.lateHours && (
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
              <div style={{
                width: '20px',
                height: '20px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px',
                fontSize: '12px'
              }}>
                ⏰
              </div>
              <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                迟交 {submission.lateHours} 小时
              </span>
            </div>
          )}

          {submission.wordCount && (
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
              <div style={{
                width: '20px',
                height: '20px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px',
                fontSize: '12px'
              }}>
                📄
              </div>
              <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                字数：{submission.wordCount}
              </span>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.7)',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}>
            点击查看提交详情
          </div>
          <button
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)',
              color: 'white',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              border: 'none',
              cursor: 'pointer',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              boxShadow: '0 8px 25px rgba(34, 197, 94, 0.3)'
            }}
            onClick={() => navigate(`/submission/${submission.id}`)}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 12px 35px rgba(34, 197, 94, 0.4)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 8px 25px rgba(34, 197, 94, 0.3)';
            }}
          >
            查看详情 →
          </button>
        </div>
      </div>
    </div>
  );

  const todoAssignments = assignments.filter((assignment) => {
    const submission = getSubmissionForAssignment(assignment.id);
    return !submission || submission.status === SubmissionStatus.RETURNED;
  });

  const completedSubmissions = submissions.filter(
    (submission) =>
      submission.status === SubmissionStatus.SUBMITTED ||
      submission.status === SubmissionStatus.GRADED ||
      submission.status === SubmissionStatus.RESUBMITTED,
  );

  const tabs = [
    {
      key: "todo",
      title: `待办 ${todoAssignments.length > 0 ? `(${todoAssignments.length})` : ""}`,
      content: (
        <div>
          {todoAssignments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {todoAssignments.map(renderAssignmentCard)}
            </div>
          ) : (
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '40px',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
              <div style={{
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '4px',
                textShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }}>
                暂无待办作业
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '14px',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}>
                所有作业都已完成，真棒！
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "completed",
      title: "已完成",
      content: (
        <div>
          {completedSubmissions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {completedSubmissions.map(renderSubmissionCard)}
            </div>
          ) : (
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '40px',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <div style={{
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '4px',
                textShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }}>
                暂无已完成作业
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '14px',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}>
                完成作业后会在这里显示
              </div>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '0'
    }}>
      <PullToRefresh onRefresh={onRefresh}>
        <div style={{ padding: '20px' }}>
          {/* Glassmorphism头部 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              textAlign: 'center'
            }}>
              <h1 style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: 'white',
                margin: '0 0 8px 0',
                textShadow: '0 2px 10px rgba(0,0,0,0.3)'
              }}>
                我的作业
              </h1>
              <p style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '16px',
                margin: 0,
                textShadow: '0 1px 5px rgba(0,0,0,0.3)'
              }}>
                完成每一份作业，收获更多知识
              </p>
            </div>
          </div>

          {/* Glassmorphism统计卡片 */}
          <div style={{
            marginBottom: '24px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '16px',
                  fontSize: '20px',
                  boxShadow: '0 8px 25px rgba(245, 158, 11, 0.3)'
                }}>
                  ⏰
                </div>
                <div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: 'white',
                    margin: '0 0 4px 0',
                    textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                  }}>
                    {todoAssignments.length}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.8)',
                    margin: 0,
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                  }}>
                    待完成作业
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '16px',
                  fontSize: '20px',
                  boxShadow: '0 8px 25px rgba(34, 197, 94, 0.3)'
                }}>
                  ✅
                </div>
                <div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: 'white',
                    margin: '0 0 4px 0',
                    textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                  }}>
                    {completedSubmissions.length}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.8)',
                    margin: 0,
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                  }}>
                    已完成作业
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Glassmorphism标签页 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '600',
                      transition: 'all 0.3s ease',
                      border: 'none',
                      cursor: 'pointer',
                      background: activeTab === tab.key 
                        ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                        : 'transparent',
                      color: 'white',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      boxShadow: activeTab === tab.key ? '0 8px 25px rgba(139, 92, 246, 0.4)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== tab.key) {
                        (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== tab.key) {
                        (e.target as HTMLButtonElement).style.background = 'transparent';
                      }
                    }}
                  >
                    {tab.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Glassmorphism内容区域 */}
          <div>
            {loading ? (
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                padding: '40px',
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                <div style={{
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                }}>
                  加载中...
                </div>
              </div>
            ) : (
              <div>
                {tabs.find((tab) => tab.key === activeTab)?.content}
              </div>
            )}
          </div>

          {/* 底部安全区域 */}
          <div style={{ height: '80px' }} />
        </div>
      </PullToRefresh>

      <Modal
        visible={submissionModalVisible}
        title="提交作业"
        content={
          <div className="submission-modal">
            {selectedAssignment && (
              <>
                <div className="assignment-info">
                  <h4>{selectedAssignment.title}</h4>
                  <p>{selectedAssignment.description}</p>
                </div>

                <div className="submission-form">
                  <div className="form-item">
                    <label>作业内容：</label>
                    <TextArea
                      placeholder="请输入作业内容..."
                      value={submissionContent}
                      onChange={setSubmissionContent}
                      rows={6}
                      maxLength={5000}
                      showCount
                    />
                  </div>

                  <div className="form-item">
                    <label>附件上传：</label>
                    <Button
                      block
                      fill="outline"
                      loading={uploading}
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.multiple = true;
                        input.accept =
                          selectedAssignment.allowedFileTypes?.join(",") || "*";
                        input.onchange = (event) => handleFileUpload(event as any);
                        input.click();
                      }}
                    >
                      <UploadOutline /> 选择文件
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        }
        actions={[
          {
            key: "cancel",
            text: "取消",
            onClick: () => {
              setSubmissionModalVisible(false);
              setSelectedAssignment(null);
              setSubmissionContent("");
            },
          },
          {
            key: "submit",
            text: "提交",
            primary: true,
            onClick: submitAssignment,
          },
        ]}
      />
    </div>
  );
};

export default Assignments;
