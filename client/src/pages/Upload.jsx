import { useState, useEffect } from 'react';
import {
  Card, Form, Input, Select, Button, Upload as AntUpload,
  message, Typography, Flex, Tag
} from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { createAsset, getCategories } from '../api';

const { Text } = Typography;
const { Dragger } = AntUpload;
const { TextArea } = Input;

export default function Upload() {
  const [form] = Form.useForm();
  const [file, setFile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getCategories().then(res => {
      const flatten = (nodes, prefix = '') => {
        let result = [];
        nodes.forEach(n => {
          result.push({ value: n.id, label: `${prefix}${n.name}` });
          if (n.children?.length) result = result.concat(flatten(n.children, `${prefix}${n.name} / `));
        });
        return result;
      };
      setCategories(flatten(res.data));
    });
  }, []);

  const handleSubmit = async (values) => {
    if (!file) {
      message.error('请选择要上传的文件');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', values.title || file.name);
      formData.append('description', values.description || '');
      if (values.categoryId) formData.append('categoryId', values.categoryId);
      if (values.tags) formData.append('tags', JSON.stringify(values.tags.split(',').map(t => t.trim()).filter(Boolean)));
      formData.append('status', values.status || 'reference');

      const res = await createAsset(formData);
      message.success('上传成功！');
      navigate(`/assets/${res.data.id}`);
    } catch (e) {
      message.error('上传失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Card title="上传新素材">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="选择文件" required>
            <Dragger
              multiple={false}
              showUploadList={true}
              beforeUpload={(f) => { setFile(f); return false; }}
              onRemove={() => { setFile(null); form.setFieldsValue({ title: '' }); }}
              accept=".jpg,.jpeg,.png,.gif,.webp,.avif,.svg,.bmp,.pdf,.ai,.psd,.tiff,.eps,.cdr"
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 JPG/PNG/GIF/WebP/PDF/AI/PSD 等格式，单文件最大 500MB
              </p>
            </Dragger>
          </Form.Item>

          <Form.Item name="title" label="素材标题">
            <Input placeholder="留空则使用文件名" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="添加描述信息..." />
          </Form.Item>

          <Flex gap={16}>
            <Form.Item name="categoryId" label="分类" style={{ flex: 1 }}>
              <Select
                placeholder="选择分类"
                options={categories}
                allowClear
                showSearch
                filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>

            <Form.Item name="status" label="类型" style={{ flex: 1 }} initialValue="reference">
              <Select options={[
                { value: 'reference', label: '参考图' },
                { value: 'final', label: '定稿文件' }
              ]} />
            </Form.Item>
          </Flex>

          <Form.Item name="tags" label="标签">
            <Input placeholder="用逗号分隔，例如: 高档,简约,红色" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting} size="large">
              上传素材
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
