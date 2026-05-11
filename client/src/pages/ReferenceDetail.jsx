import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Spin, Typography, Tag, Image, Button, message, Flex, Space } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, ClockCircleOutlined, UserOutlined, TagsOutlined } from '@ant-design/icons';
import { getAsset, downloadAsset } from '../api';

const { Text, Title } = Typography;

export default function ReferenceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getAsset(id)
      .then(res => setAsset(res.data))
      .catch(() => { message.error('参考图不存在'); navigate('/references'); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = async () => {
    try {
      const res = await downloadAsset(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = asset?.title || `reference-${id}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(`/api/assets/${id}/download`, '_blank');
    }
  };

  const parseColors = (str) => {
    try { return JSON.parse(str); } catch { return []; }
  };
  const parseTags = (str) => {
    try { return JSON.parse(str); } catch { return []; }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  if (!asset) return null;

  const colors = parseColors(asset.colors);
  const tags = parseTags(asset.tags);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/references')} style={{ marginBottom: 16 }}>
        返回参考图
      </Button>

      <Card>
        <Flex vertical gap={16}>
          <Image
            src={asset.filePath}
            alt={asset.title}
            style={{ maxHeight: 500, objectFit: 'contain' }}
            fallback="data:image/svg+xml,..."
          />

          <div>
            <Title level={4}>{asset.title}</Title>
          </div>

          <Flex wrap="wrap" gap={12}>
            {asset.category && (
              <div><Text type="secondary">分类：</Text><Tag>{asset.category.name}</Tag></div>
            )}
            {tags.length > 0 && (
              <div>
                <Text type="secondary">标签：</Text>
                <Space wrap size={4}>
                  {tags.map(t => <Tag key={t}>{t}</Tag>)}
                </Space>
              </div>
            )}
          </Flex>

          {colors.length > 0 && (
            <div>
              <Text type="secondary">色彩提取：</Text>
              <Flex gap={6} align="center" style={{ marginTop: 4 }}>
                {colors.map((c, i) => (
                  <Flex key={i} vertical align="center" gap={2}>
                    <div style={{ width: 32, height: 32, borderRadius: 4, backgroundColor: c, border: '1px solid #d9d9d9' }} />
                    <Text style={{ fontSize: 11 }}>{c}</Text>
                  </Flex>
                ))}
              </Flex>
            </div>
          )}

          <Flex gap={8} wrap="wrap" style={{ fontSize: 12, color: '#999' }}>
            <Text type="secondary"><UserOutlined /> {asset.uploader?.displayName}</Text>
            <Text type="secondary"><ClockCircleOutlined /> {new Date(asset.createdAt).toLocaleString('zh-CN')}</Text>
            <Text type="secondary">文件类型：{asset.fileType?.toUpperCase()}</Text>
            <Text type="secondary">尺寸：{asset.width && asset.height ? `${asset.width}×${asset.height}` : '-'}</Text>
          </Flex>

          <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload} size="large">
            下载原图
          </Button>
        </Flex>
      </Card>
    </div>
  );
}
