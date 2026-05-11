import { useEffect, useState } from 'react';
import { Tree, Spin } from 'antd';
import { FolderOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { getCategories } from '../api';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function CategoryTree() {
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    getCategories().then(res => {
      const buildTree = (nodes) => nodes.map(n => ({
        title: n.name,
        key: `cat_${n.id}`,
        icon: <FolderOutlined />,
        children: n.children?.length ? buildTree(n.children) : undefined
      }));
      setTreeData(buildTree(res.data));
    }).finally(() => setLoading(false));
  }, []);

  const onSelect = (keys) => {
    const params = new URLSearchParams(searchParams);
    if (keys.length) {
      const id = keys[0].replace('cat_', '');
      params.set('categoryId', id);
    } else {
      params.delete('categoryId');
    }
    navigate(`/assets?${params.toString()}`);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 12 }}><Spin size="small" /></div>;

  const selectedKey = searchParams.get('categoryId') ? [`cat_${searchParams.get('categoryId')}`] : [];

  return (
    <Tree
      showIcon
      treeData={treeData}
      selectedKeys={selectedKey}
      onSelect={onSelect}
      style={{ padding: '8px 0' }}
      switcherIcon={<FolderOpenOutlined />}
    />
  );
}
