import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Descriptions, Tag, Typography, Spin, Button, Image, Flex, Card,
  Table, Modal, Upload, Input, message, Form, Select
} from 'antd';
import {
  DownloadOutlined, ArrowLeftOutlined, UploadOutlined,
  DeleteOutlined, EditOutlined, CheckCircleOutlined, FileOutlined
} from '@ant-design/icons';
import { getAsset, deleteAsset, updateAsset, getVersions, uploadVersion } from '../api';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp', 'tiff'];

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [asset, setAsset] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [versionModal, setVersionModal] = useState(false);
  const [editing, setEditing] = useState(false);

  const canEdit = user?.role === 'admin' || asset?.uploaderId === user?.id;

  const loadData = async () => {
    try {
      const [assetRes, versionsRes] = await Promise.all([
        getAsset(id),
        getVersions(id)
      ]);
      setAsset(assetRes.data);
      setVersions(versionsRes.data);
    } catch (e) {
      message.error('素材不存在');
      navigate('/assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后不可恢复，确定要删除这个素材吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await deleteAsset(id);
        message.success('已删除');
        navigate('/assets');
      }
    });
  };

  const handleEdit = async (values) => {
    setEditing(true);
    try {
      await updateAsset(id, values);
      message.success('更新成功');
      setEditModal(false);
      loadData();
    } catch (e) {
      message.error('更新失败');
    } finally {
      setEditing(false);
    }
  };

  const handleVersionUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const comment = prompt('请输入版本说明（可选）:');
    if (comment) formData.append('comment', comment);
    try {
      await uploadVersion(id, formData);
      message.success('新版本上传成功');
      setVersionModal(false);
      loadData();
    } catch (e) {
      message.error('版本上传失败');
    }
    return false; // prevent default upload
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  if (!asset) return null;

  const isImage = IMAGE_EXTENSIONS.includes(asset.fileType?.toLowerCase());

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/assets')} style={{ marginBottom: 16 }}>
        返回素材库
      </Button>

      <Card>
        <Flex gap={24} wrap="wrap">
          {/* Preview */}
          <div style={{ flex: '0 0 auto', width: 400, maxWidth: '100%' }}>
            {isImage ? (
              <Image
                src={asset.thumbnailPath || asset.filePath}
                alt={asset.title}
                style={{ maxWidth: '100%', borderRadius: 8 }}
              />
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                <FileOutlined style={{ fontSize: 80, color: '#d9d9d9' }} />
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 300 }}>
            <Flex align="center" gap={8} style={{ marginBottom: 16 }}>
              <Title level={4} style={{ margin: 0 }}>{asset.title}</Title>
              <Tag color={asset.status === 'final' ? 'red' : 'blue'}>
                {asset.status === 'final' ? '定稿' : '参考图'}
              </Tag>
            </Flex>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="文件类型">{asset.fileType?.toUpperCase()}</Descriptions.Item>
              <Descriptions.Item label="文件大小">{(asset.fileSize / 1024 / 1024).toFixed(2)} MB</Descriptions.Item>
              {asset.width && <Descriptions.Item label="尺寸">{asset.width} × {asset.height}</Descriptions.Item>}
              <Descriptions.Item label="上传者">{asset.uploader?.displayName}</Descriptions.Item>
              <Descriptions.Item label="分类">{asset.category?.name || '未分类'}</Descriptions.Item>
              <Descriptions.Item label="上传时间">{new Date(asset.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
              {asset.description && <Descriptions.Item label="描述">{asset.description}</Descriptions.Item>}
              {asset.tags && JSON.parse(asset.tags)?.length > 0 && (
                <Descriptions.Item label="标签">
                  {JSON.parse(asset.tags).map(t => <Tag key={t}>{t}</Tag>)}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Flex gap={8} style={{ marginTop: 16 }} wrap="wrap">
              <Button type="primary" icon={<DownloadOutlined />} onClick={() => {
                const a = document.createElement('a');
                a.href = asset.filePath;
                a.download = asset.title;
                a.click();
              }}>
                下载原文件
              </Button>
              {canEdit && (
                <>
                  <Button icon={<EditOutlined />} onClick={() => setEditModal(true)}>编辑信息</Button>
                  <Button icon={<UploadOutlined />} onClick={() => setVersionModal(true)}>上传新版本</Button>
                  {asset.status !== 'final' && (
                    <Button icon={<CheckCircleOutlined />} onClick={async () => {
                      await updateAsset(id, { status: 'final' });
                      message.success('已标记为定稿');
                      loadData();
                    }}>
                      标记定稿
                    </Button>
                  )}
                  <Button icon={<DeleteOutlined />} danger onClick={handleDelete}>删除</Button>
                </>
              )}
            </Flex>
          </div>
        </Flex>
      </Card>

      {/* Version History */}
      <Card title="版本历史" style={{ marginTop: 16 }}>
        {versions.length === 0 ? (
          <Text type="secondary">暂无其他版本</Text>
        ) : (
          <Table
            dataSource={versions}
            rowKey="id"
            pagination={false}
            columns={[
              { title: '版本号', dataIndex: 'versionNumber', render: v => <Tag color="blue">v{v}</Tag>, width: 100 },
              { title: '文件大小', render: (_, r) => `${(r.fileSize / 1024 / 1024).toFixed(1)}MB`, width: 120 },
              { title: '上传人', dataIndex: ['uploader', 'displayName'], width: 120 },
              { title: '版本说明', dataIndex: 'comment', ellipsis: true },
              { title: '上传时间', render: (_, r) => new Date(r.createdAt).toLocaleString('zh-CN'), width: 180 },
              { title: '操作', render: (_, r) => (
                <Button type="link" icon={<DownloadOutlined />} onClick={() => {
                  const a = document.createElement('a');
                  a.href = r.filePath;
                  a.download = `${asset.title}_v${r.versionNumber}`;
                  a.click();
                }}>下载</Button>
              ), width: 80 }
            ]}
          />
        )}
      </Card>

      {/* Edit Modal */}
      <Modal title="编辑素材信息" open={editModal} onCancel={() => setEditModal(false)} footer={null}>
        <EditForm asset={asset} onFinish={handleEdit} loading={editing} />
      </Modal>

      {/* Version Upload Modal */}
      <Modal title="上传新版本" open={versionModal} onCancel={() => setVersionModal(false)} footer={null}>
        <Upload.Dragger
          customRequest={({ file, onSuccess }) => {
            handleVersionUpload(file).then(() => onSuccess?.());
          }}
          showUploadList={false}
          multiple={false}
        >
          <p className="ant-upload-drag-icon"><UploadOutlined /></p>
          <p className="ant-upload-text">点击或拖拽文件到此处上传新版本</p>
          <p className="ant-upload-hint">上传新版本后，旧版本仍会保留在版本历史中</p>
        </Upload.Dragger>
      </Modal>
    </div>
  );
}

function EditForm({ asset, onFinish, loading }) {
  const [form] = Form.useForm();
  const [tagsInput, setTagsInput] = useState(JSON.parse(asset.tags || '[]').join(', '));

  useEffect(() => {
    form.setFieldsValue({
      title: asset.title,
      description: asset.description,
      status: asset.status
    });
    setTagsInput(JSON.parse(asset.tags || '[]').join(', '));
  }, [asset]);

  return (
    <Form form={form} layout="vertical" onFinish={(values) => {
      onFinish({ ...values, tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean) });
    }}>
      <Form.Item name="title" label="标题" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="description" label="描述">
        <TextArea rows={3} />
      </Form.Item>
      <Form.Item label="标签">
        <Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="用逗号分隔多个标签" />
      </Form.Item>
      <Form.Item name="status" label="状态">
        <Select options={[{ value: 'reference', label: '参考图' }, { value: 'final', label: '定稿' }]} />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading}>保存</Button>
    </Form>
  );
}
