import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, message, Space, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getUsers, register, updateUser, deleteUser } from '../api';

const ROLE_MAP = { admin: '管理员', editor: '设计师', viewer: '访客' };
const ROLE_COLORS = { admin: 'red', editor: 'blue', viewer: 'green' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getUsers();
      setUsers(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openCreate = () => {
    setEditingUser(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    form.setFieldsValue({ displayName: user.displayName, email: user.email, role: user.role });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingUser) {
      await updateUser(editingUser.id, values);
      message.success('用户已更新');
    } else {
      await register(values);
      message.success('用户已创建');
    }
    setModalOpen(false);
    loadData();
  };

  const handleDelete = async (id) => {
    await deleteUser(id);
    message.success('用户已删除');
    loadData();
  };

  const columns = [
    { title: '用户名', dataIndex: 'username', width: 120 },
    { title: '显示名', dataIndex: 'displayName', width: 120 },
    { title: '邮箱', dataIndex: 'email', width: 200 },
    { title: '角色', dataIndex: 'role', width: 100, render: role => (
      <Tag color={ROLE_COLORS[role]}>{ROLE_MAP[role] || role}</Tag>
    )},
    { title: '创建时间', dataIndex: 'createdAt', width: 180, render: t => new Date(t).toLocaleString('zh-CN') },
    { title: '操作', width: 150, render: (_, record) => (
      <Space>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
        <Popconfirm title="确定删除此用户？" onConfirm={() => handleDelete(record.id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )}
  ];

  return (
    <Card
      title="用户管理"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>添加用户</Button>}
    >
      <Table dataSource={users} columns={columns} rowKey="id" loading={loading} pagination={false} />

      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        width={500}
      >
        <Form form={form} layout="vertical">
          {!editingUser && (
            <>
              <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
                <Input />
              </Form.Item>
              <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
                <Input.Password />
              </Form.Item>
            </>
          )}
          {editingUser && (
            <Form.Item name="password" label="修改密码（留空则不修改）">
              <Input.Password placeholder="输入新密码" />
            </Form.Item>
          )}
          <Form.Item name="displayName" label="显示名称" rules={[{ required: true, message: '请输入显示名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '请输入有效邮箱' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="角色" initialValue="editor" rules={[{ required: true }]}>
            <Select options={[
              { value: 'admin', label: '管理员' },
              { value: 'editor', label: '设计师' },
              { value: 'viewer', label: '访客' }
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
