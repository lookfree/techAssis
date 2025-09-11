import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  List, 
  Modal, 
  Upload, 
  message, 
  Spin, 
  Space, 
  Typography, 
  Tag,
  Popconfirm,
  Tooltip,
  Row,
  Col 
} from 'antd';
import {
  UploadOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { request } from '../../services/api';

const { Title, Text } = Typography;

interface PPTFile {
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  isActive: boolean;
}

interface PPTViewerProps {
  courseId: string;
}

const PPTViewer: React.FC<PPTViewerProps> = ({ courseId }) => {
  const [pptFiles, setPptFiles] = useState<PPTFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [presentationVisible, setPresentationVisible] = useState(false);
  const [currentPPT, setCurrentPPT] = useState<PPTFile | null>(null);
  const [lastLoadedCourseId, setLastLoadedCourseId] = useState<string | null>(null);

  useEffect(() => {
    if (courseId && courseId !== lastLoadedCourseId && !loading) {
      console.log(`[PPT Frontend] CourseId changed from ${lastLoadedCourseId} to ${courseId}, loading PPT files`);
      setLastLoadedCourseId(courseId);
      loadPPTFiles();
    }
  }, [courseId, lastLoadedCourseId, loading]);

  const loadPPTFiles = async () => {
    if (!courseId) return;
    
    setLoading(true);
    try {
      console.log(`[PPT Frontend] Loading PPT files for course: ${courseId}`);
      console.log(`[PPT Frontend] Auth token:`, localStorage.getItem('access_token') ? 'Present' : 'Missing');
      const files = await request.get(`/courses/${courseId}/ppt`);
      console.log(`[PPT Frontend] Received files:`, files);
      // 确保 files 是一个数组
      setPptFiles(Array.isArray(files) ? files : []);
    } catch (error) {
      console.error(`[PPT Frontend] Error loading PPT files:`, error);
      console.error(`[PPT Frontend] Full error:`, (error as any)?.response || error);
      message.error('加载PPT列表失败');
      setPptFiles([]); // 设置为空数组作为默认值
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('ppt', file);

    setUploading(true);
    try {
      await request.post(`/courses/${courseId}/ppt/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      message.success('PPT上传成功！');
      loadPPTFiles();
    } catch (error) {
      message.error('PPT上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileName: string) => {
    try {
      await request.delete(`/courses/${courseId}/ppt/${encodeURIComponent(fileName)}`);
      message.success('PPT删除成功！');
      loadPPTFiles();
    } catch (error) {
      message.error('PPT删除失败');
    }
  };

  const handleSetActive = async (fileName: string) => {
    try {
      await request.patch(`/courses/${courseId}/ppt/${encodeURIComponent(fileName)}/activate`);
      message.success('已设置为活动PPT！');
      loadPPTFiles();
    } catch (error) {
      message.error('设置活动PPT失败');
    }
  };

  const handleStartPresentation = (pptFile: PPTFile) => {
    setCurrentPPT(pptFile);
    setPresentationVisible(true);
  };

  const uploadProps = {
    beforeUpload: (file: File) => {
      const isPPT = file.type === 'application/vnd.ms-powerpoint' || 
                   file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      
      if (!isPPT) {
        message.error('只支持上传PPT或PPTX文件！');
        return false;
      }

      const isLt50M = file.size / 1024 / 1024 < 50;
      if (!isLt50M) {
        message.error('PPT文件大小不能超过50MB！');
        return false;
      }

      handleUpload(file);
      return false; // 阻止默认上传行为
    },
    showUploadList: false,
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <FileOutlined />
            <span>PPT管理</span>
          </Space>
        }
        extra={
          <Upload {...uploadProps}>
            <Button 
              type="primary" 
              icon={<UploadOutlined />} 
              loading={uploading}
            >
              上传PPT
            </Button>
          </Upload>
        }
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.8) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        }}
      >
        <Spin spinning={loading}>
          {pptFiles.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: 40,
              color: '#666'
            }}>
              <FileOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">还没有上传PPT文件</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  点击上方"上传PPT"按钮开始上传
                </Text>
              </div>
            </div>
          ) : (
            <List
              dataSource={pptFiles}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Tooltip title={item.isActive ? '当前活动PPT' : '设为活动PPT'}>
                      <Button
                        type={item.isActive ? 'primary' : 'default'}
                        size="small"
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleSetActive(item.fileName)}
                        disabled={item.isActive}
                      >
                        {item.isActive ? '活动中' : '设为活动'}
                      </Button>
                    </Tooltip>,
                    <Tooltip title="开始演示">
                      <Button
                        type="default"
                        size="small"
                        icon={<PlayCircleOutlined />}
                        onClick={() => handleStartPresentation(item)}
                      >
                        演示
                      </Button>
                    </Tooltip>,
                    <Popconfirm
                      title="确认删除"
                      description="确定要删除这个PPT文件吗？"
                      onConfirm={() => handleDelete(item.fileName)}
                      okText="确认"
                      cancelText="取消"
                    >
                      <Button
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                      >
                        删除
                      </Button>
                    </Popconfirm>
                  ]}
                  style={{
                    backgroundColor: item.isActive ? 'rgba(24, 144, 255, 0.05)' : 'transparent',
                    borderRadius: 8,
                    padding: '12px 16px',
                    marginBottom: 8,
                    border: item.isActive ? '1px solid rgba(24, 144, 255, 0.2)' : 'none'
                  }}
                >
                  <List.Item.Meta
                    avatar={<FileOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                    title={
                      <Space>
                        <Text strong>{item.fileName}</Text>
                        {item.isActive && (
                          <Tag color="success">活动中</Tag>
                        )}
                      </Space>
                    }
                    description={
                      <Text type="secondary">
                        上传时间: {new Date(item.uploadedAt).toLocaleString()}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Spin>
      </Card>

      {/* PPT演示模态框 */}
      <Modal
        title={`PPT演示 - ${currentPPT?.fileName}`}
        open={presentationVisible}
        onCancel={() => setPresentationVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPresentationVisible(false)}>
            关闭
          </Button>
        ]}
        width="90%"
        style={{ top: 20 }}
        bodyStyle={{ height: 'calc(90vh - 100px)', padding: 0 }}
      >
        {currentPPT && (
          <div style={{ 
            width: '100%', 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: '#f5f5f5'
          }}>
            {/* PPT预览区域 */}
            <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column' }}>
              {/* 工具栏 */}
              <div style={{ 
                marginBottom: '16px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '8px 16px',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <div>
                  <Text strong>PPT文件: {currentPPT.fileName}</Text>
                </div>
                <div>
                  <Space>
                    <Button 
                      icon={<EyeOutlined />}
                      onClick={() => {
                        window.open(`http://localhost:3000${currentPPT.fileUrl}`, '_blank');
                      }}
                    >
                      在新窗口打开
                    </Button>
                    <Button 
                      type="primary"
                      icon={<EyeOutlined />}
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = `http://localhost:3000${currentPPT.fileUrl}`;
                        link.download = currentPPT.fileName;
                        link.click();
                      }}
                    >
                      下载PPT
                    </Button>
                  </Space>
                </div>
              </div>
              
              {/* PPT内容预览区 */}
              <div style={{ 
                flex: 1, 
                background: '#f8f9fa', 
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}>
                {/* PPT预览主区域 */}
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flex: 1,
                  flexDirection: 'column',
                  textAlign: 'center',
                  padding: '40px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  position: 'relative'
                }}>
                  {/* 背景装饰 */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'url(data:image/svg+xml,%3Csvg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="3" cy="3" r="3"/%3E%3C/g%3E%3C/svg%3E)',
                    opacity: 0.3
                  }} />
                  
                  {/* PPT图标和信息 */}
                  <div style={{ zIndex: 1, position: 'relative' }}>
                    <div style={{
                      fontSize: '80px',
                      marginBottom: '24px',
                      textShadow: '0 4px 8px rgba(0,0,0,0.3)'
                    }}>
                      📊
                    </div>
                    
                    <Title level={2} style={{ color: 'white', marginBottom: '16px', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                      {currentPPT.fileName}
                    </Title>
                    
                    <div style={{ marginBottom: '40px' }}>
                      <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '18px' }}>
                        PowerPoint 演示文稿 • {(1.8).toFixed(1)} MB
                      </Text>
                      <br />
                      <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                        上传时间: {new Date(currentPPT.uploadedAt).toLocaleString()}
                      </Text>
                      <br />
                      {currentPPT.isActive && (
                        <Tag color="success" style={{ marginTop: '12px' }}>
                          🟢 当前活动PPT
                        </Tag>
                      )}
                    </div>
                    
                    {/* 操作按钮组 */}
                    <Space size="large" direction="vertical">
                      <Space size="large">
                        <Button 
                          type="primary"
                          size="large"
                          icon={<PlayCircleOutlined />}
                          onClick={() => {
                            // 直接在浏览器中打开文件，让浏览器或系统决定如何处理
                            const fileUrl = `http://localhost:3000${currentPPT.fileUrl}`;
                            window.open(fileUrl, '_blank', 'noopener,noreferrer');
                          }}
                          style={{
                            height: '50px',
                            paddingLeft: '32px',
                            paddingRight: '32px',
                            fontSize: '16px',
                            background: 'rgba(255,255,255,0.2)',
                            borderColor: 'rgba(255,255,255,0.3)',
                            backdropFilter: 'blur(10px)'
                          }}
                        >
                          开始演示
                        </Button>
                        
                        <Button 
                          size="large"
                          icon={<EyeOutlined />}
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `http://localhost:3000${currentPPT.fileUrl}`;
                            link.download = currentPPT.fileName;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          style={{
                            height: '50px',
                            paddingLeft: '32px',
                            paddingRight: '32px',
                            fontSize: '16px',
                            background: 'rgba(255,255,255,0.1)',
                            borderColor: 'rgba(255,255,255,0.2)',
                            color: 'white',
                            backdropFilter: 'blur(10px)'
                          }}
                        >
                          下载PPT
                        </Button>
                      </Space>
                      
                      <div>
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                          💡 点击"开始演示"将在新标签页中打开PPT文件进行预览和演示
                        </Text>
                      </div>
                    </Space>
                  </div>
                </div>
                
                {/* 功能提示卡片 */}
                <div style={{
                  background: 'white',
                  padding: '20px',
                  borderTop: '1px solid #e9ecef'
                }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <div style={{ textAlign: 'center', padding: '16px' }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎯</div>
                        <Text strong>智能预览</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          自动识别PPT格式并选择最佳查看方式
                        </Text>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={{ textAlign: 'center', padding: '16px' }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡</div>
                        <Text strong>快速演示</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          一键启动演示模式，支持全屏展示
                        </Text>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={{ textAlign: 'center', padding: '16px' }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>💾</div>
                        <Text strong>便捷下载</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          支持直接下载原始PPT文件到本地
                        </Text>
                      </div>
                    </Col>
                  </Row>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PPTViewer;