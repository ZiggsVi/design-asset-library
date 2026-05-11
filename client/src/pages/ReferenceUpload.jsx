import { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, Upload as AntUpload, message, Typography, Flex, Image, Tag, Space } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { batchUploadAssets, getCategories } from '../api';

const { Text, Title } = Typography;
const { Dragger } = AntUpload;

export default function ReferenceUpload() {
  const [form] = Form.useForm();
  const [files, setFiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

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

  const handleSubmit = async (values) => {
    if (files.length === 0) {
      message.error('请至少选择一张图片');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f.originFileObj || f));
      if (values.categoryId) fd.append('categoryId', values.categoryId);
      if (values.tags) fd.append('tags', JSON.stringify(values.tags.split(',').map(t => t.trim()).filter(Boolean)));
      fd.append('status', 'reference');

      const res = await batchUploadAssets(fd);
      message.success(`成功上传 ${res.data.count} 张参考图`);
      navigate(`/references/batch/${res.data.batchId}`);
    } catch (e) {
      message.error('上传失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 16 }}>批量上传参考图</Title>

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="选择图片（最多15张）" required>
            <Dragger
              multiple
              showUploadList={false}
              beforeUpload={(f) => {
                const isImage = f.type.startsWith('image/');
                if (!isImage) {
                  message.error('只能上传图片文件');
                  return false;
                }
                if (files.length >= 15) {
                  message.error('最多上传15张图片');
                  return false;
                }
                setFiles(prev => [...prev, f]);
                return false;
              }}
              onRemove={() => {}}
              accept="image/*"
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">点击或拖拽图片到此区域</p>
              <p className="ant-upload-hint">支持 JPG/PNG/WebP 等格式，可一次选择多张，最多 15 张</p>
            </Dragger>
          </Form.Item>

          {files.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text strong>已选择 {files.length} 张图片：</Text>
              <Flex wrap="wrap" gap={8} style={{ marginTop: 8 }}>
                {files.map((f, idx) => (
                  <div key={f.uid || idx} style={{ position: 'relative' }}>
                    <Image
                      src={URL.createObjectURL(f.originFileObj || f)}
                      width={100}
                      height={100}
                      style={{ objectFit: 'cover', borderRadius: 4 }}
                      preview={false}
                    />
                    <Button
                      size="small"
                      danger
                      type="primary"
                      style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, fontSize: 10, padding: 0, borderRadius: '50%' }}
                      onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </Flex>
            </div>
          )}

          <Flex gap={16}>
            <Form.Item name="categoryId" label="分类" style={{ flex: 1 }}>
              <Select
                placeholder="选择参考图分类"
                options={categories}
                allowClear
                showSearch
                filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>
          </Flex>

          <Form.Item name="tags" label="标签">
            <Input placeholder="用逗号分隔，例如: 包装,食品,简约" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting} size="large">
              上传 {files.length > 0 ? `(${files.length}张)` : ''}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
