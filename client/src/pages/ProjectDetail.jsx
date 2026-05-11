import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Tabs, Typography, Spin, Button, Tag, Flex, Descriptions, Modal, Form, Input,
  Upload, message, Table, Select, Space, List, Image, Popconfirm, Empty, Row, Col
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, DeleteOutlined, PlusOutlined,
  DownloadOutlined, InboxOutlined, UploadOutlined, LinkOutlined,
  CheckCircleOutlined, SendOutlined, FileOutlined, TeamOutlined
} from '@ant-design/icons';
import {
  getProject, updateProject, deleteProject,
  linkMaterial, unlinkMaterial,
  uploadReqFile, deleteReqFile,
  createDeliverable, updateDeliverable, deleteDeliverable,
  nextDeliverableVersion
} from '../api';
import { useAuth } from '../context/AuthContext';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

const STATUS_MAP = { active: { color: 'blue', label: '进行中' }, completed: { color: 'green', label: '已完成' }, archived: { color: 'default', label: '已归档' } };
const DEL_STATUS_MAP = { draft: { color: 'default', label: '草稿' }, review: { color: 'orange', label: '审核中' }, final: { color: 'red', label: '已定稿' } };

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [linkModal, setLinkModal] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [delModal, setDelModal] = useState(false);
  const [delForm] = Form.useForm();
  const [versionModal, setVersionModal] = useState(null);
  const [newVersionFiles, setNewVersionFiles] = useState([]);

  const load = async () => {
    try {
      const res = await getProject(id);
      setProject(res.data);
    } catch (e) { message.error('项目不存在'); navigate('/projects'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  if (!project) return null;

  const handleUpdate = async (values) => {
    await updateProject(id, values);
    message.success('已更新');
    setEditModal(false);
    load();
  };

  const handleDelete = async () => {
    await deleteProject(id);
    message.success('已删除');
    navigate('/projects');
  };

  const handleLinkMaterial = async () => {
    const assetId = parseInt(linkInput);
    if (!assetId) { message.error('请输入素材ID'); return; }
    await linkMaterial(id, assetId, '');
    message.success('已关联');
    setLinkModal(false);
    setLinkInput('');
    load();
  };

  const handleUnlink = async (linkId) => {
    await unlinkMaterial(id, linkId);
    load();
  };

  const handleReqUpload = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    await uploadReqFile(id, fd);
    load();
    return false;
  };

  const handleDelUpload = async (values) => {
    const fd = new FormData();
    fd.append('name', values.name);
    fd.append('description', values.description || '');
    values.files.forEach(f => fd.append('files', f.originFileObj || f));
    await createDeliverable(id, fd);
    message.success('交付物已创建');
    setDelModal(false);
    delForm.resetFields();
    load();
  };

  const handleStatusChange = async (delId, status) => {
    await updateDeliverable(delId, { status });
    message.success(status === 'review' ? '已提交审核' : status === 'final' ? '已标记定稿' : '已更新');
    load();
  };

  const handleNextVersion = async () => {
    const fd = new FormData();
    newVersionFiles.forEach(f => fd.append('files', f.originFileObj || f));
    await nextDeliverableVersion(versionModal.id, fd);
    message.success('新版本已上传');
    setVersionModal(null);
    setNewVersionFiles([]);
    load();
  };

  const items = [
    {
      key: 'requirements',
      label: '需求信息',
      children: (
        <div>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="项目名称">{project.name}</Descriptions.Item>
              <Descriptions.Item label="客户">{project.client || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态"><Tag color={STATUS_MAP[project.status]?.color}>{STATUS_MAP[project.status]?.label}</Tag></Descriptions.Item>
              <Descriptions.Item label="创建人">{project.creator?.displayName}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{new Date(project.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
            </Descriptions>
            {project.description && (
              <div style={{ marginTop: 12, padding: 12, background: '#fafafa', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
                <Text type="secondary">需求描述：</Text>
                <div>{project.description}</div>
              </div>
            )}
          </Card>

          {/* Requirement Files */}
          <Card size="small" title="需求附件" style={{ marginBottom: 16 }}
            extra={
              <Upload customRequest={({ file, onSuccess }) => handleReqUpload(file).then(() => onSuccess?.())} showUploadList={false}>
                <Button size="small" icon={<UploadOutlined />}>上传附件</Button>
              </Upload>
            }>
            {project.reqFiles?.length === 0 ? <Text type="secondary">暂无附件</Text> : (
              <Row gutter={[8, 8]}>
                {project.reqFiles?.map(f => (
                  <Col key={f.id}>
                    <Card size="small" style={{ width: 160 }}>
                      <Image src={f.filePath} style={{ maxHeight: 100 }} fallback="data:image/svg+xml,..." />
                      <Flex justify="space-between" style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{f.fileType}</Text>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteReqFile(id, f.id).then(load)} />
                      </Flex>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card>

          {/* Linked Materials */}
          <Card size="small" title="关联素材库" extra={<Button size="small" icon={<LinkOutlined />} onClick={() => setLinkModal(true)}>关联素材</Button>}>
            {project.materialLinks?.length === 0 ? <Text type="secondary">暂未关联素材</Text> : (
              <List
                size="small"
                dataSource={project.materialLinks}
                renderItem={item => (
                  <List.Item
                    actions={[<Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleUnlink(item.id)} />]}
                  >
                    <Space>
                      <FileOutlined />
                      <a href={item.asset?.filePath} target="_blank">{item.asset?.title || `素材 #${item.assetId}`}</a>
                      <Tag>{item.asset?.fileType}</Tag>
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </div>
      )
    },
    {
      key: 'deliverables',
      label: `设计交付 (${project.deliverables?.length || 0})`,
      children: (
        <div>
          <Flex justify="flex-end" style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setDelModal(true)}>新建交付</Button>
          </Flex>
          {project.deliverables?.length === 0 ? <Empty description="暂无交付物" /> : (
            <List
              dataSource={project.deliverables}
              renderItem={d => (
                <Card size="small" style={{ marginBottom: 12 }}>
                  <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
                    <Space>
                      <Text strong>{d.name}</Text>
                      <Tag color={DEL_STATUS_MAP[d.status]?.color}>{DEL_STATUS_MAP[d.status]?.label}</Tag>
                      <Tag>v{d.version}</Tag>
                    </Space>
                    <Space>
                      {d.status === 'draft' && <Button size="small" icon={<SendOutlined />} onClick={() => handleStatusChange(d.id, 'review')}>提交审核</Button>}
                      {d.status === 'review' && <Button size="small" icon={<CheckCircleOutlined />} onClick={() => handleStatusChange(d.id, 'final')}>标记定稿</Button>}
                      {(d.status === 'draft' || d.status === 'review') && (
                        <Button size="small" icon={<ArrowLeftOutlined />} onClick={() => handleStatusChange(d.id, d.status === 'review' ? 'draft' : 'review')}>撤回</Button>
                      )}
                      {d.status === 'final' && <Button size="small" icon={<UploadOutlined />} onClick={() => setVersionModal(d)}>更新版本</Button>}
                      <Popconfirm title="删除此交付物？" onConfirm={() => deleteDeliverable(d.id).then(load)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  </Flex>
                  {d.description && <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>{d.description}</Text>}
                  <Flex gap={8} wrap="wrap">
                    {d.files?.map(f => (
                      <Card key={f.id} size="small" style={{ width: 140 }} hoverable>
                        <Flex vertical align="center" gap={4}>
                          <FileOutlined style={{ fontSize: 24, color: '#1677ff' }} />
                          <Text ellipsis style={{ fontSize: 12, maxWidth: 120 }}>{f.originalName}</Text>
                          <Tag>{f.fileType?.toUpperCase()}</Tag>
                          <a href={`/api/projects/deliverables/${d.id}/files/${f.id}/download`} target="_blank">
                            <Button size="small" type="link" icon={<DownloadOutlined />}>下载</Button>
                          </a>
                        </Flex>
                      </Card>
                    ))}
                  </Flex>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                    上传人: {d.uploader?.displayName} · {new Date(d.createdAt).toLocaleString('zh-CN')}
                  </Text>
                </Card>
              )}
            />
          )}
        </div>
      )
    },
    {
      key: 'settings',
      label: '基本信息',
      children: (
        <Card>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="项目名称">{project.name}</Descriptions.Item>
            <Descriptions.Item label="客户">{project.client || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={STATUS_MAP[project.status]?.color}>{STATUS_MAP[project.status]?.label}</Tag></Descriptions.Item>
            <Descriptions.Item label="创建人">{project.creator?.displayName}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(project.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
            <Descriptions.Item label="描述">{project.description || '-'}</Descriptions.Item>
          </Descriptions>
          <Flex gap={8} style={{ marginTop: 16 }}>
            <Button icon={<EditOutlined />} onClick={() => setEditModal(true)}>编辑</Button>
            <Popconfirm title="确认删除项目？" onConfirm={handleDelete}>
              <Button danger icon={<DeleteOutlined />}>删除项目</Button>
            </Popconfirm>
          </Flex>
        </Card>
      )
    }
  ];

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')} style={{ marginBottom: 16 }}>返回项目列表</Button>
      <Title level={4} style={{ margin: '0 0 16px' }}>{project.name}</Title>
      <Tabs items={items} />

      {/* Edit Modal */}
      <Modal title="编辑项目" open={editModal} onCancel={() => setEditModal(false)} footer={null}>
        <Form layout="vertical" initialValues={{ name: project.name, client: project.client, description: project.description, status: project.status }}
          onFinish={handleUpdate}>
          <Form.Item name="name" label="项目名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="client" label="客户名称"><Input /></Form.Item>
          <Form.Item name="description" label="描述"><TextArea rows={3} /></Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={[{ value: 'active', label: '进行中' }, { value: 'completed', label: '已完成' }, { value: 'archived', label: '已归档' }]} />
          </Form.Item>
          <Button type="primary" htmlType="submit">保存</Button>
        </Form>
      </Modal>

      {/* Link Material Modal */}
      <Modal title="关联素材库" open={linkModal} onCancel={() => setLinkModal(false)} onOk={handleLinkMaterial}>
        <p>在素材库中找到要关联的素材，复制其ID（在素材详情页URL中的数字）</p>
        <Input placeholder="输入素材ID" value={linkInput} onChange={e => setLinkInput(e.target.value)} />
      </Modal>

      {/* New Deliverable Modal */}
      <Modal title="新建设计交付" open={delModal} onCancel={() => setDelModal(false)} footer={null} width={500}>
        <Form form={delForm} layout="vertical" onFinish={handleDelUpload}>
          <Form.Item name="name" label="交付名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><TextArea rows={2} /></Form.Item>
          <Form.Item name="files" label="上传文件" rules={[{ required: true, message: '请至少上传一个文件' }]}>
            <Upload.Dragger multiple beforeUpload={() => false} accept=".ai,.pdf,.jpg,.jpeg,.png,.psd,.eps,.cdr,.tiff">
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p>点击或拖拽文件（可同时上传 AI + PDF + JPG）</p>
            </Upload.Dragger>
          </Form.Item>
          <Button type="primary" htmlType="submit">创建交付</Button>
        </Form>
      </Modal>

      {/* New Version Modal */}
      <Modal title={`更新版本 - ${versionModal?.name || ''}`} open={!!versionModal} onCancel={() => { setVersionModal(null); setNewVersionFiles([]); }}
        onOk={handleNextVersion} okText="上传新版本">
        <Upload.Dragger multiple beforeUpload={(f) => { setNewVersionFiles(prev => [...prev, f]); return false; }}
          onRemove={(f) => setNewVersionFiles(prev => prev.filter(x => x.uid !== f.uid))}
          fileList={newVersionFiles} accept=".ai,.pdf,.jpg,.jpeg,.png,.psd">
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p>选择新版本文件（旧版本将保留）</p>
        </Upload.Dragger>
      </Modal>
    </div>
  );
}
