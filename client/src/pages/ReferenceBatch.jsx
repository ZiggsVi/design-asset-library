import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Spin, Empty, Flex, Typography, Tag, Image, Button, message, Row, Col, Space } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { getAssetBatch, downloadAsset } from '../api';

const { Text, Title } = Typography;

export default function ReferenceBatch() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!batchId) return;
    setLoading(true);
    getAssetBatch(batchId)
      .then(res => setAssets(res.data.assets || []))
      .catch(() => message.error('加载失败'))
      .finally(() => setLoading(false));
  }, [batchId]);

  const handleDownload = async (assetId, title) => {
    try {
      const res = await downloadAsset(assetId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = title || `reference-${assetId}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // Use direct download as fallback
      window.open(`/api/assets/${assetId}/download`, '_blank');
    }
  };

  const parseColors = (str) => {
    try { return JSON.parse(str); } catch { return []; }
  };

  const parseTags = (str) => {
    try { return JSON.parse(str); } catch { return []; }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  if (assets.length === 0) return <Empty description="未找到该组参考图" style={{ padding: 60 }} />;

  return (
    <div>
      <Flex align="center" gap={12} style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/references')}>返回参考图</Button>
        <Title level={4} style={{ margin: 0 }}>参考图组（共 {assets.length} 张）</Title>
      </Flex>

      <Row gutter={[12, 12]}>
        {assets.map(asset => {
          const colors = parseColors(asset.colors);
          const tags = parseTags(asset.tags);
          return (
            <Col key={asset.id} xs={24} sm={12} md={8} lg={6}>
              <Card
                size="small"
                style={{ height: '100%' }}
                cover={
                  <Image
                    alt={asset.title}
                    src={asset.filePath}
                    style={{ maxHeight: 300, objectFit: 'cover' }}
                    fallback="data:image/svg+xml,..."
                  />
                }
                actions={[
                  <Button type="link" icon={<DownloadOutlined />} onClick={() => handleDownload(asset.id, asset.title)}>
                    下载
                  </Button>,
                  <Button type="link" onClick={() => navigate(`/assets/${asset.id}`)}>
                    详情
                  </Button>
                ]}
              >
                <Flex vertical gap={6}>
                  <Text strong ellipsis>{asset.title}</Text>

                  {asset.category && <Tag>{asset.category.name}</Tag>}

                  {tags.length > 0 && (
                    <Flex wrap="wrap" gap={4}>
                      {tags.map(t => <Tag key={t} style={{ fontSize: 11 }}>{t}</Tag>)}
                    </Flex>
                  )}

                  {colors.length > 0 && (
                    <Flex gap={4} align="center">
                      <Text type="secondary" style={{ fontSize: 12 }}>色彩：</Text>
                      {colors.map((c, i) => (
                        <div
                          key={i}
                          style={{ width: 18, height: 18, borderRadius: 3, backgroundColor: c, border: '1px solid #d9d9d9', cursor: 'pointer' }}
                          title={c}
                        />
                      ))}
                    </Flex>
                  )}

                  <Flex justify="space-between" style={{ fontSize: 12 }}>
                    <Text type="secondary"><UserOutlined /> {asset.uploader?.displayName}</Text>
                    <Text type="secondary"><ClockCircleOutlined /> {new Date(asset.createdAt).toLocaleDateString('zh-CN')}</Text>
                  </Flex>
                </Flex>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
