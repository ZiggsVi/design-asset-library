import { useEffect, useState, useCallback } from 'react';
import { Row, Col, Input, Select, Pagination, Spin, Empty, Flex, Typography, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { getAssets } from '../api';
import AssetCard from '../components/AssetCard';

const { Text } = Typography;

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [statuses] = useState(['', 'reference', 'final']);

  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const status = searchParams.get('status') || '';
  const fileType = searchParams.get('fileType') || '';

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: 20 };
      if (search) params.search = search;
      if (categoryId) params.categoryId = categoryId;
      if (status) params.status = status;
      if (fileType) params.fileType = fileType;
      const res = await getAssets(params);
      setAssets(res.data.assets);
      setTotal(res.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryId, status, fileType]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const updateParams = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  return (
    <div>
      <Flex wrap="wrap" gap={12} style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索素材标题、描述、标签..."
          prefix={<SearchOutlined />}
          style={{ width: 320 }}
          value={search}
          onChange={e => updateParams('search', e.target.value)}
          allowClear
        />
        <Select
          style={{ width: 120 }}
          placeholder="全部状态"
          value={status || undefined}
          onChange={v => updateParams('status', v || '')}
          allowClear
          options={[
            { value: 'reference', label: <><Tag color="blue">参考</Tag></> },
            { value: 'final', label: <><Tag color="red">定稿</Tag></> }
          ]}
        />
        <Select
          style={{ width: 120 }}
          placeholder="文件类型"
          value={fileType || undefined}
          onChange={v => updateParams('fileType', v || '')}
          allowClear
          options={[
            { value: 'jpg', label: 'JPEG' },
            { value: 'png', label: 'PNG' },
            { value: 'pdf', label: 'PDF' },
            { value: 'ai', label: 'AI' },
            { value: 'psd', label: 'PSD' },
          ]}
        />
        <Text style={{ lineHeight: '32px' }}>
          共 {total} 个素材
        </Text>
      </Flex>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : assets.length === 0 ? (
        <Empty description="暂无素材" style={{ padding: 60 }} />
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {assets.map(asset => (
              <Col key={asset.id} xs={24} sm={12} md={8} lg={6} xl={4}>
                <AssetCard asset={asset} />
              </Col>
            ))}
          </Row>
          <Flex justify="center" style={{ marginTop: 24 }}>
            <Pagination
              current={page}
              total={total}
              pageSize={20}
              onChange={p => updateParams('page', p.toString())}
              showSizeChanger={false}
            />
          </Flex>
        </>
      )}
    </div>
  );
}
