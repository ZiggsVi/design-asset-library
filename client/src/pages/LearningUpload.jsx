import { useState } from 'react';
import { Card, Form, Input, Select, Button, Upload as AntUpload, message, Typography, Flex, Radio } from 'antd';
import { InboxOutlined, LinkOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { uploadLearningResource, createLearningLink } from '../api';

const { Text, Title } = Typography;
const { Dragger } = AntUpload;
const { TextArea } = Input;

export default function LearningUpload() {
  const [form] = Form.useForm();
  const [file, setFile] = useState(null);
  const [resourceType, setResourceType] = useState('file');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (resourceType === 'link' || resourceType === 'cloud_link') {
        await createLearningLink({
          title: values.title,
          description: values.description || '',
          type: resourceType,
          content: values.content,
          category: values.category || '',
          tags: values.tags ? values.tags.split(',').map(t => t.trim()).filter(Boolean) : []
        });
        message.success('链接已保存');
      } else {
        if (!file) {
          message.error('请选择要上传的文件');
          setSubmitting(false);
          return;
        }
        const fd = new FormData();
        fd.append('file', file);
        fd.append('title', values.title || file.name);
        fd.append('description', values.description || '');
        fd.append('type', resourceType);
        fd.append('category', values.category || '');
        fd.append('tags', JSON.stringify(values.tags ? values.tags.split(',').map(t => t.trim()).filter(Boolean) : []));
        await uploadLearningResource(fd);
        message.success('上传成功！');
      }
      navigate('/learning');
    } catch (e) {
      message.error('保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const isLinkType = resourceType === 'link' || resourceType === 'cloud_link';

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Card title="上传学习资料">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="资料类型" required>
            <Radio.Group value={resourceType} onChange={e => setResourceType(e.target.value)}>
              <Radio.Button value="file">文件上传</Radio.Button>
              <Radio.Button value="link">外部链接</Radio.Button>
              <Radio.Button value="cloud_link">网盘链接</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {!isLinkType && (
            <Form.Item label="选择文件" required={!isLinkType}>
              <Dragger
                multiple={false}
                showUploadList={true}
                beforeUpload={(f) => { setFile(f); return false; }}
                onRemove={() => setFile(null)}
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              >
                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                <p className="ant-upload-hint">支持图片/文档/PDF等格式，单文件最大 200MB</p>
              </Dragger>
            </Form.Item>
          )}

          {isLinkType && (
            <Form.Item name="content" label="链接地址" rules={[{ required: true, message: '请输入链接地址' }]}>
              <Input placeholder="https://..." prefix={<LinkOutlined />} />
            </Form.Item>
          )}

          <Form.Item name="title" label="资料标题" rules={[{ required: true }]}>
            <Input placeholder={isLinkType ? '输入标题' : '留空则使用文件名'} />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="添加描述信息..." />
          </Form.Item>

          <Flex gap={16}>
            <Form.Item name="category" label="分类" style={{ flex: 1 }}>
              <Input placeholder="例如: 设计理论、软件教程" />
            </Form.Item>
            {!isLinkType && (
              <Form.Item label="文件类型" style={{ flex: 1 }}>
                <Select value={resourceType} onChange={v => setResourceType(v)}
                  options={[
                    { value: 'image', label: '图片' },
                    { value: 'document', label: '文档' },
                    { value: 'pdf', label: 'PDF' }
                  ]}
                />
              </Form.Item>
            )}
          </Flex>

          <Form.Item name="tags" label="标签">
            <Input placeholder="用逗号分隔，例如: 排版,色彩,包装设计" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting} size="large">
              保存资料
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
