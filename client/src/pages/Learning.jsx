import { useEffect, useState, useCallback } from 'react';
import { Row, Col, Input, Select, Button, Pagination, Spin, Empty, Flex, Typography, Card, Tag, Image, message } from 'antd';
import { SearchOutlined, LinkOutlined, CloudOutlined, FileOutlined, DownloadOutlined, PlusOutlined, PictureOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getLearningResources } from '../api';

const { Text, Title } = Typography;

const TYPE_CONFIG = {
  image: { color: 'blue', icon: <PictureOutlined />, label: '图片' },
  document: { color: 'geekblue', icon: <FileOutlined />, label: '文档' },
  pdf: { color: 'red', icon: <FilePdfOutlined />, label: 'PDF' },
  link: { color: 'green', icon: <LinkOutlined />, label: '网址' },
  cloud_link: { color: 'purple', icon: <CloudOutlined />, label: '网盘链接' }
};

export default function Learning() {
  const [resources, setResources] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type') || '';
  const category = searchParams.get('category') || '';

  useEffect(() => {
    getLearningResources({ pageSize: 1 }).then(() => {
      // Fetch categories list
      return fetch('/api/learning/categories/list');
    }).then(res => res.json()).then(data => {
      if (Array.isArray(data)) setCategories(data);
    }).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: 30 };
      if (search) params.search = search;
      if (type) params.type = type;
      if (category) params.category = category;
      const res = await getLearningResources(params);
      setResources(res.data.resources);
      setTotal(res.data.total);
    } catch (e) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [page, search, type, category]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateParams = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) { params.set(key, value); } else { params.delete(key); }
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  const renderCard = (r) => {
    const config = TYPE_CONFIG[r.type] || { icon: <FileOutlined />, label: r.type, color: 'default' };
    const isFileType = !['link', 'cloud_link'].includes(r.type);

    return (
      <Card
        hoverable
        style={{ height: '100%' }}
        onClick={() => {
          if (r.type === 'link' || r.type === 'cloud_link') {
            window.open(r.content, '_blank');
          } else if (isFileType && r.content) {
            if (r.type === 'image') {
              window.open(r.content, '_blank');
            } else {
              window.open(`/api/learning/${r.id}/download`, '_blank');
            }
          }
        }}
      >
        <Flex vertical gap={8}>
          {/* Preview */}
          <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', borderRadius: 4, overflow: 'hidden' }}>
            {r.type === 'image' && r.content ? (
              <Image src={r.content} style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'cover' }} preview={false} fallback="data:image/svg+xml,..." />
            ) : r.type === 'link' ? (
              <LinkOutlined style={{ fontSize: 40, color: '#52c41a' }} />
            ) : r.type === 'cloud_link' ? (
              <CloudOutlined style={{ fontSize: 40, color: '#722ed1' }} />
            ) : r.type === 'pdf' ? (
              <FilePdfOutlined style={{ fontSize: 40, color: '#ff4d4f' }} />
            ) : (
              <FileOutlined style={{ fontSize: 40, color: '#1677ff' }} />
            )}
          </div>

          {/* Type tag + title */}
          <Flex align="center" gap={6}>
            <Tag color={config.color} style={{ margin: 0, flexShrink: 0 }}>{config.label}</Tag>
            <Text strong ellipsis style={{ flex: 1 }}>{r.title}</Text>
          </Flex>

          {/* Description */}
          {r.description && (
            <Text type="secondary" ellipsis style={{ fontSize: 12 }}>{r.description}</Text>
          )}

          {/* Tags + Meta */}
          <Flex wrap="wrap" gap={4}>
            {JSON.parse(r.tags || '[]').slice(0, 3).map(t => (
              <Tag key={t} style={{ fontSize: 11, lineHeight: '18px' }}>{t}</Tag>
            ))}
          </Flex>

          {r.category && <Tag style={{ fontSize: 11 }}>{r.category}</Tag>}

          <Flex justify="space-between" align="center">
            <Text type="secondary" style={{ fontSize: 11 }}>
              {r.uploader?.displayName || '未知'}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {new Date(r.createdAt).toLocaleDateString('zh-CN')}
            </Text>
          </Flex>

          {/* Download button for non-link types */}
          {isFileType && r.content && (
            <Button size="small" icon={<DownloadOutlined />} block onClick={(e) => {
              e.stopPropagation();
              window.open(`/api/learning/${r.id}/download`, '_blank');
            }}>
              下载
            </Button>
          )}
        </Flex>
      </Card>
    );
  };

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>学习资料库</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/learning/upload')}>上传资料</Button>
      </Flex>

      <Flex wrap="wrap" gap={12} style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索标题、描述、标签..."
          prefix={<SearchOutlined />}
          style={{ width: 280 }}
          value={search}
          onChange={e => updateParams('search', e.target.value)}
          allowClear
        />
        <Select
          style={{ width: 130 }}
          placeholder="全部类型"
          value={type || undefined}
          onChange={v => updateParams('type', v || '')}
          allowClear
          options={Object.entries(TYPE_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
        />
        <Select
          style={{ width: 130 }}
          placeholder="全部分类"
          value={category || undefined}
          onChange={v => updateParams('category', v || '')}
          allowClear
          options={categories.map(c => ({ value: c, label: c }))}
        />
        <Text style={{ lineHeight: '32px' }}>共 {total} 个资料</Text>
      </Flex>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : resources.length === 0 ? (
        <Empty description="暂无学习资料" style={{ padding: 60 }} />
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {resources.map(r => (
              <Col key={r.id} xs={24} sm={12} md={8} lg={6}>
                {renderCard(r)}
              </Col>
            ))}
          </Row>
          <Flex justify="center" style={{ marginTop: 24 }}>
            <Pagination
              current={page}
              total={total}
              pageSize={30}
              onChange={p => updateParams('page', p.toString())}
              showSizeChanger={false}
            />
          </Flex>
        </>
      )}
    </div>
  );
}
