import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Input, Select, Button, Spin, Empty, Flex, Tag, Typography, Modal, Form, message } from 'antd';
import { PlusOutlined, SearchOutlined, FolderOutlined, TeamOutlined, FileOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { getProjects, createProject } from '../api';

const { Text, Title } = Typography;

const STATUS_MAP = {
  active: { color: 'blue', label: '进行中' },
  completed: { color: 'green', label: '已完成' },
  archived: { color: 'default', label: '已归档' }
};

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: 20 };
      if (search) params.search = search;
      if (status) params.status = status;
      const res = await getProjects(params);
      setProjects(res.data.projects);
      setTotal(res.data.total);
    } catch (e) { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, status]);

  const handleSearch = () => { setPage(1); fetchData(); };

  const handleCreate = async (values) => {
    setCreating(true);
    try {
      const res = await createProject(values);
      message.success('项目创建成功');
      setModalOpen(false);
      form.resetFields();
      navigate(`/projects/${res.data.id}`);
    } catch (e) { message.error('创建失败'); }
    finally { setCreating(false); }
  };

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>项目管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>新建项目</Button>
      </Flex>

      <Flex wrap="wrap" gap={12} style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索项目名称..."
          prefix={<SearchOutlined />}
          style={{ width: 280 }}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onPressEnter={handleSearch}
          allowClear
        />
        <Select
          style={{ width: 120 }}
          placeholder="全部状态"
          value={status || undefined}
          onChange={v => { setStatus(v || ''); setPage(1); }}
          allowClear
          options={[
            { value: 'active', label: '进行中' },
            { value: 'completed', label: '已完成' },
            { value: 'archived', label: '已归档' }
          ]}
        />
        <Text style={{ lineHeight: '32px' }}>共 {total} 个项目</Text>
      </Flex>

      {loading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> :
       projects.length === 0 ? <Empty description="暂无项目" style={{ padding: 60 }} /> : (
        <Row gutter={[16, 16]}>
          {projects.map(p => (
            <Col key={p.id} xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                onClick={() => navigate(`/projects/${p.id}`)}
                style={{ height: '100%' }}
              >
                <Flex vertical gap={8}>
                  <Flex align="center" gap={8}>
                    <FolderOutlined style={{ fontSize: 24, color: '#1677ff' }} />
                    <Text strong ellipsis style={{ flex: 1 }}>{p.name}</Text>
                  </Flex>
                  <Tag color={STATUS_MAP[p.status]?.color}>{STATUS_MAP[p.status]?.label}</Tag>
                  {p.client && <Text type="secondary"><TeamOutlined /> {p.client}</Text>}
                  <Flex gap={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <FileOutlined /> {p._count?.deliverables || 0} 交付
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {p.creator?.displayName}
                    </Text>
                  </Flex>
                </Flex>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal title="新建项目" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="client" label="客户名称">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item name="description" label="项目描述">
            <Input.TextArea rows={3} placeholder="可选" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={creating}>创建项目</Button>
        </Form>
      </Modal>
    </div>
  );
}
