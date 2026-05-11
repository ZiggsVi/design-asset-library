import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, message, Space, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [flatList, setFlatList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getCategories();
      setCategories(res.data);
      // Flatten for table display
      const flatten = (nodes, level = 0) => {
        let result = [];
        nodes.forEach(n => {
          result.push({ ...n, level });
          if (n.children?.length) result = result.concat(flatten(n.children, level + 1));
        });
        return result;
      };
      setFlatList(flatten(res.data));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openCreate = () => {
    setEditingCat(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditingCat(cat);
    form.setFieldsValue({ name: cat.name, parentId: cat.parentId, sortOrder: cat.sortOrder });
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
    loadData();
  };

  const handleDelete = async (id) => {
    await deleteCategory(id);
    message.success('分类已删除');
    loadData();
  };

  // parent options (prevent choosing self as parent)
  const parentOptions = flatList
    .filter(c => c.id !== editingCat?.id)
    .map(c => ({ value: c.id, label: `${'  '.repeat(c.level)}${c.name}` }));

  const columns = [
    { title: '分类名称', dataIndex: 'name', render: (name, record) => (
      <span style={{ paddingLeft: record.level * 20 }}>{name}</span>
    )},
    { title: '排序', dataIndex: 'sortOrder', width: 80 },
    { title: '子分类数', render: (_, record) => record.children?.length || 0, width: 100 },
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
      <Table
        dataSource={flatList}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
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
