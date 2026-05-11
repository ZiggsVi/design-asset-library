import { Card, Tag, Typography, Image, Flex } from 'antd';
import { FileOutlined, FileImageOutlined, DownloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

const FILE_ICONS = {
  pdf: <FileOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />,
  ai: <FileOutlined style={{ fontSize: 48, color: '#fa8c16' }} />,
  psd: <FileOutlined style={{ fontSize: 48, color: '#1677ff' }} />,
  default: <FileImageOutlined style={{ fontSize: 48, color: '#52c41a' }} />
};

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp', 'tiff'];

export default function AssetCard({ asset }) {
  const navigate = useNavigate();
  const isImage = IMAGE_EXTENSIONS.includes(asset.fileType?.toLowerCase());

  return (
    <Card
      hoverable
      size="small"
      style={{ width: '100%' }}
      onClick={() => navigate(`/assets/${asset.id}`)}
      cover={
        isImage && asset.thumbnailPath ? (
          <div style={{ height: 180, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
            <Image
              src={asset.thumbnailPath}
              alt={asset.title}
              style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain' }}
              preview={false}
              fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNiZmJmYmYiIGZvbnQtc2l6ZT0iMjAiPuivtOaYr+Wbvuagh+WcsOWdgDwvdGV4dD48L3N2Zz4="
            />
          </div>
        ) : (
          <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
            {FILE_ICONS[asset.fileType] || FILE_ICONS.default}
          </div>
        )
      }
    >
      <Text strong ellipsis style={{ display: 'block', marginBottom: 4 }}>
        {asset.title}
      </Text>
      <Flex wrap="wrap" gap={4} style={{ marginBottom: 4 }}>
        <Tag color={asset.status === 'final' ? 'red' : 'blue'}>
          {asset.status === 'final' ? '定稿' : '参考'}
        </Tag>
        <Tag>{asset.fileType?.toUpperCase()}</Tag>
      </Flex>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {(asset.fileSize / 1024 / 1024).toFixed(1)}MB · {asset.uploader?.displayName}
      </Text>
    </Card>
  );
}
