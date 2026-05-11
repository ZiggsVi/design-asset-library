import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button, Avatar, Dropdown, Typography, theme } from 'antd';
import {
  InboxOutlined, UploadOutlined, AppstoreOutlined,
  TeamOutlined, LogoutOutlined, UserOutlined, FolderOutlined,
  ProjectOutlined, BookOutlined, FileOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import CategoryTree from './CategoryTree';

const { Sider, Content, Header } = AntLayout;
const { Text } = Typography;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  const menuItems = [
    { type: 'group', label: '素材库', children: [
      { key: '/assets', icon: <InboxOutlined />, label: '浏览素材' },
      { key: '/upload', icon: <UploadOutlined />, label: '上传素材' },
    ]},
    { type: 'group', label: '项目', children: [
      { key: '/projects', icon: <ProjectOutlined />, label: '项目列表' },
    ]},
    { type: 'group', label: '学习资料', children: [
      { key: '/learning', icon: <BookOutlined />, label: '资料库' },
    ]},
    ...(user?.role === 'admin' ? [{
      type: 'group', label: '系统管理', children: [
        { key: '/categories', icon: <AppstoreOutlined />, label: '分类管理' },
        { key: '/users', icon: <TeamOutlined />, label: '用户管理' },
      ]
    }] : []),
  ];

  const userMenu = {
    items: [
      { key: 'role', label: `角色: ${({ admin: '管理员', editor: '设计师', viewer: '访客' })[user?.role] || user?.role}`, disabled: true },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'logout') { logout(); navigate('/login'); }
    }
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider width={220} style={{ background: token.colorBgContainer }} theme="light">
        <div style={{ padding: '16px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
          <Text strong style={{ fontSize: 16 }}>
            <FolderOutlined style={{ marginRight: 8 }} />
            设计素材库
          </Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />
        <div style={{ padding: '0 16px', marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>素材分类</Text>
        </div>
        <CategoryTree />
      </Sider>
      <AntLayout>
        <Header style={{ background: token.colorBgContainer, padding: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
          <Dropdown menu={userMenu} placement="bottomRight">
            <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <Text>{user?.displayName || user?.username}</Text>
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ padding: 24, background: token.colorBgLayout, minHeight: 280 }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
