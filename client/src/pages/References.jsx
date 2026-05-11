import { useEffect, useState, useCallback } from 'react';
import { Input, Select, Button, Spin, Empty, Flex, Typography, Tag, Image, message, Pagination } from 'antd';
import { SearchOutlined, PlusOutlined, ClockCircleOutlined, TagsOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAssets, getCategories } from '../api';

const { Text, Title } = Typography;

export default function References() {
  const [assets, setAssets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [hoveredId, setHoveredId] = useState(null);
  const [isComposing, setIsComposing] = useState(false);
  const navigate = useNavigate();

  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('categoryId') || '';

  useEffect(() => {
    getCategories({ type: 'reference' }).then(res => {
      const flatten = (nodes, prefix = '') => {
        let result = [];
        nodes.forEach(n => {
          result.push({ value: n.id, label: `${prefix}${n.name}` });
          if (n.children?.length) result = result.concat(flatten(n.children, `${prefix}${n.name} / `));
        });
        return result;
      };
      setCategories(flatten(res.data));
    }).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: 30, status: 'reference' };
      if (search) params.search = search;
      if (categoryId) params.categoryId = categoryId;
      const res = await getAssets(params);
      setAssets(res.data.assets);
      setTotal(res.data.total);
    } catch (e) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateParams = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) { params.set(key, value); } else { params.delete(key); }
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  const parseColors = (colorsStr) => {
    try { return JSON.parse(colorsStr); } catch { return []; }
  };

  const parseTags = (tagsStr) => {
    try { return JSON.parse(tagsStr); } catch { return []; }
  };

  const columnsStyle = {
    columnCount: 5,
    columnGap: 12,
  };

  // Responsive column count
  const getColumnCount = () => {
    const width = window.innerWidth;
    if (width < 576) return 2;
    if (width < 768) return 2;
    if (width < 992) return 3;
    if (width < 1200) return 4;
    return 5;
  };

  const [colCount, setColCount] = useState(getColumnCount());
  useEffect(() => {
    const handleResize = () => setColCount(getColumnCount());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Distribute items into columns for the masonry layout
  const distributeIntoColumns = (items, columns) => {
    const cols = Array.from({ length: columns }, () => []);
    items.forEach((item, idx) => {
      cols[idx % columns].push(item);
    });
    return cols;
  };

  const columns = distributeIntoColumns(assets, colCount);

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>参考图</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/references/upload')}>批量上传</Button>
      </Flex>

      <Flex wrap="wrap" gap={12} style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索参考图..."
          prefix={<SearchOutlined />}
          style={{ width: 280 }}
          value={search}
          onChange={e => { if (!isComposing) updateParams('search', e.target.value); }}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={e => { setIsComposing(false); updateParams('search', e.currentTarget.value); }}
          allowClear
        />
        <Select
          style={{ width: 160 }}
          placeholder="全部分类"
          value={categoryId || undefined}
          onChange={v => updateParams('categoryId', v || '')}
          allowClear
          options={categories}
          showSearch
          filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
        />
        <Text style={{ lineHeight: '32px' }}>共 {total} 张</Text>
      </Flex>

      <style>{`
        .masonry-col {
          break-inside: avoid;
          margin-bottom: 12px;
          position: relative;
          overflow: hidden;
          border-radius: 6px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .masonry-col:hover {
          transform: scale(1.02);
        }
        .masonry-col img {
          width: 100%;
          display: block;
          border-radius: 6px;
        }
        .masonry-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.75));
          padding: 30px 10px 10px;
          opacity: 0;
          transition: opacity 0.25s;
          border-radius: 0 0 6px 6px;
        }
        .masonry-col:hover .masonry-overlay {
          opacity: 1;
        }
      `}</style>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : assets.length === 0 ? (
        <Empty description="暂无参考图" style={{ padding: 60 }} />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {columns.map((col, colIdx) => (
              <div key={colIdx} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {col.map(asset => {
                  const colors = parseColors(asset.colors);
                  const tags = parseTags(asset.tags);
                  return (
                    <div
                      key={asset.id}
                      className="masonry-col"
                      onClick={() => {
                        if (asset.batchId) {
                          navigate(`/references/batch/${asset.batchId}`);
                        } else {
                          navigate(`/references/${asset.id}`);
                        }
                      }}
                      onMouseEnter={() => setHoveredId(asset.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <Image
                        src={asset.thumbnailPath || asset.filePath}
                        alt={asset.title}
                        style={{ width: '100%', display: 'block' }}
                        preview={false}
                        fallback="data:image/svg+xml,..."
                      />
                      <div className="masonry-overlay">
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                          {asset.title}
                        </Text>
                        {asset.category && (
                          <Tag style={{ fontSize: 11, marginBottom: 4 }}>{asset.category.name}</Tag>
                        )}
                        {tags.length > 0 && (
                          <Flex wrap="wrap" gap={4} style={{ marginBottom: 4 }}>
                            {tags.slice(0, 3).map(t => (
                              <Tag key={t} style={{ fontSize: 10, lineHeight: '16px' }}>{t}</Tag>
                            ))}
                          </Flex>
                        )}
                        {colors.length > 0 && (
                          <Flex gap={3} align="center">
                            {colors.map((c, i) => (
                              <div key={i} style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: c, border: '1px solid rgba(255,255,255,0.3)' }} title={c} />
                            ))}
                          </Flex>
                        )}
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, display: 'block', marginTop: 4 }}>
                          <ClockCircleOutlined /> {new Date(asset.createdAt).toLocaleDateString('zh-CN')}
                        </Text>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

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
