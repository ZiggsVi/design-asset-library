import { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Flex } from 'antd';
import { UserOutlined, LockOutlined, FolderOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const data = await login(values.username, values.password);
      message.success(`欢迎回来，${data.user.displayName}！`);
      navigate('/assets');
    } catch (err) {
      message.error(err.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex justify="center" align="center" style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400, boxShadow: '0 2px 8px rgba(0,0,0,0.09)' }}>
        <Flex vertical align="center" style={{ marginBottom: 24 }}>
          <FolderOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 8 }} />
          <Title level={3} style={{ margin: 0 }}>设计素材库</Title>
          <Text type="secondary">包装设计公司内部系统</Text>
        </Flex>
        <Form onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center' }}>
          演示账号: admin / admin123
        </Text>
      </Card>
    </Flex>
  );
}
