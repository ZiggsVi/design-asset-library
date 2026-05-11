import { useEffect, useState } from 'react';
import { Tree, Segmented, Spin } from 'antd';
import { FolderOutlined, FolderOpenOutlined, PictureOutlined, InboxOutlined } from '@ant-design/icons';
import { getCategories } from '../api';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';

export default function CategoryTree() {
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [catType, setCatType] = useState('material');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Auto-select type based on current route
    if (location.pathname.startsWith('/references')) {
      setCatType('reference');
    } else {
      setCatType('material');
    }
  }, [location.pathname]);

  useEffect(() => {
    setLoading(true);
    getCategories({ type: catType }).then(res => {
      const buildTree = (nodes) => nodes.map(n => ({
        title: n.name,
        key: `cat_${n.id}`,
        icon: <FolderOutlined />,
        children: n.children?.length ? buildTree(n.children) : undefined
      }));
      setTreeData(buildTree(res.data));
    }).finally(() => setLoading(false));
  }, [catType]);

  const onSelect = (keys) => {
    const targetPage = catType === 'reference' ? '/references' : '/assets';
    const params = new URLSearchParams(searchParams);
    if (keys.length) {
      const id = keys[0].replace('cat_', '');
      params.set('categoryId', id);
    } else {
      params.delete('categoryId');
    }
    navigate(`${targetPage}?${params.toString()}`);
  };

  const onTypeChange = (type) => {
    setCatType(type);
    const targetPage = type === 'reference' ? '/references' : '/assets';
    // Preserve existing search params but clear categoryId
    const params = new URLSearchParams(searchParams);
    params.delete('categoryId');
    navigate(`${targetPage}?${params.toString()}`);
  };

  const selectedKey = searchParams.get('categoryId') ? [`cat_${searchParams.get('categoryId')}`] : [];

  return (
    <div>
      <div style={{ padding: '4px 16px 8px' }}>
        <Segmented
          size="small"
          value={catType}
          onChange={onTypeChange}
          options={[
            { value: 'material', icon: <InboxOutlined />, label: '素材' },
            { value: 'reference', icon: <PictureOutlined />, label: '参考图' },
          ]}
          block
        />
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 12 }}><Spin size="small" /></div>
      ) : (
        <Tree
          showIcon
          treeData={treeData}
          selectedKeys={selectedKey}
          onSelect={onSelect}
          style={{ padding: '0 0 8px' }}
          switcherIcon={<FolderOpenOutlined />}
        />
      )}
    </div>
  );
}
