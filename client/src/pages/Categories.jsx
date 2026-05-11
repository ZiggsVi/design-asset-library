import { useEffect, useState, useMemo } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, message, Space, Tag, Popconfirm, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api';

const TYPE_OPTIONS = [
  { key: 'material', label: '素材分类' },
  { key: 'reference', label: '参考图分类' },
];

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [flatList, setFlatList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [activeType, setActiveType] = useState('material');
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  const loadData = async (type) => {
    setLoading(true);
    try {
      const res = await getCategories({ type });
      const flatten = (nodes, level = 0) => {
        let result = [];
        nodes.forEach(n => {
          result.push({ ...n, level });
          if (n.children?.length) result = result.concat(flatten(n.children, level + 1));
        });
        return result;
      };
      setCategories(res.data);
      setFlatList(flatten(res.data));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(activeType); }, [activeType]);

  const openCreate = () => {
    setEditingCat(null);
    form.resetFields();
    form.setFieldsValue({ type: activeType });
    setModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditingCat(cat);
    form.setFieldsValue({ name: cat.name, parentId: cat.parentId, type: cat.type, sortOrder: cat.sortOrder });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingCat) {
      await updateCategory(editingCat.id, values);
      message.success('分类已更新');
    } else {
      await createCategory(values);
      message.success('分类已创建');
    }
    setModalOpen(false);
    loadData(activeType);
  };

  const handleDelete = async (id) => {
    await deleteCategory(id);
    message.success('分类已删除');
    loadData(activeType);
  };

  const parentOptions = flatList
    .filter(c => c.id !== editingCat?.id)
    .map(c => ({ value: c.id, label: `${'  '.repeat(c.level)}${c.name}` }));

  const filteredList = useMemo(() => {
    if (!searchText) return flatList;
    const lower = searchText.toLowerCase();
    return flatList.filter(c => c.name.toLowerCase().includes(lower));
  }, [flatList, searchText]);

  const columns = [
    { title: '分类名称', dataIndex: 'name', render: (name, record) => (
      <span style={{ paddingLeft: record.level * 20 }}>{name}</span>
    )},
    { title: '类型', dataIndex: 'type', width: 100, render: type => (
      <Tag color={type === 'reference' ? 'purple' : 'blue'}>{type === 'reference' ? '参考图' : '素材'}</Tag>
    )},
    { title: '排序', dataIndex: 'sortOrder', width: 60 },
    { title: '子分类', width: 80, render: (_, record) => record.children?.length || 0 },
    { title: '操作', width: 150, render: (_, record) => (
      <Space>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
        <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )}
  ];

  return (
    <Card
      title="分类管理"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建分类</Button>}
    >
      <Tabs
        activeKey={activeType}
        onChange={k => { setActiveType(k); setSearchText(''); }}
        items={TYPE_OPTIONS.map(t => ({ key: t.key, label: t.label }))}
        tabBarExtraContent={
          <Input
            placeholder="搜索分类名称..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
        }
      />

      <Table
        dataSource={filteredList}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
        locale={{ emptyText: searchText ? '未找到匹配的分类' : '暂无分类' }}
      />

      <Modal
        title={editingCat ? '编辑分类' : '新建分类'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="分类类型">
            <Select options={[
              { value: 'material', label: '素材分类' },
              { value: 'reference', label: '参考图分类' },
            ]} />
          </Form.Item>
          <Form.Item name="parentId" label="上级分类">
            <Select
              placeholder="无（顶级分类）"
              options={parentOptions}
              allowClear
            />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序编号" initialValue={0}>
            <InputNumber min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
