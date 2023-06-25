import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useQueries, useQueryClient } from 'react-query';
import { AiOutlinePlus } from 'react-icons/ai';
import { RcFile } from 'antd/lib/upload';

import { storage } from '@/leancloud';
import { fetchFile, FileSchema } from '@/api/file';
import { Button, Divider, Form, Input, Select, Upload } from '@/components/antd';

const { TextArea } = Input;
const { Option } = Select;

interface FilesProps {
  value?: string[];
  onChange: (value: string[]) => void;
}

function Files({ value: fileIds = [], onChange }: FilesProps) {
  const fileResults = useQueries(
    fileIds.map((fileId) => ({
      queryKey: ['file', fileId],
      queryFn: () => fetchFile(fileId),
      staleTime: 1000 * 60,
    }))
  );

  const uploadedFiles = useMemo(() => {
    return fileResults.map(({ isLoading, error, data }, i) => {
      const id = fileIds[i];
      if (isLoading) {
        return { id, uid: id, name: 'Loading...' };
      }
      if (error) {
        return { id, uid: id, name: 'Unknown', status: 'error' };
      }
      return { id, uid: id, name: data!.name, url: data!.url };
    });
  }, [fileIds, fileResults]);

  const [uploadingFiles, setUploadingFiles] = useState<any[]>([]);

  const fileList = useMemo(() => {
    if (uploadedFiles) {
      return uploadedFiles.concat(uploadingFiles);
    }
    return uploadingFiles;
  }, [uploadedFiles, uploadingFiles]);

  const updateUploadingStatus = (uid: string, data: any) => {
    setUploadingFiles((prev) => {
      const index = prev.findIndex((f) => f.uid === uid);
      if (index === -1) {
        return prev;
      }
      return [...prev.slice(0, index), { ...prev[index], ...data }, ...prev.slice(index + 1)];
    });
  };

  const queryClient = useQueryClient();

  const handleUpload = async (file: RcFile) => {
    setUploadingFiles((prev) => [...prev, { uid: file.uid, name: file.name, status: 'uploading' }]);

    try {
      const uploadedFile = await storage.upload(file.name, file, {
        onProgress: ({ percent }) => {
          if (percent) {
            updateUploadingStatus(file.uid, { percent });
          }
        },
      });

      queryClient.setQueryData<FileSchema>(['file', uploadedFile.id], {
        id: uploadedFile.id,
        name: uploadedFile.name,
        mime: uploadedFile.mime,
        url: uploadedFile.url,
      });

      setUploadingFiles((prev) => prev.filter((f) => f.uid !== file.uid));
      onChange([...fileIds, uploadedFile.id]);
    } catch {
      updateUploadingStatus(file.uid, { status: 'error' });
    }

    return false;
  };

  return (
    <Upload
      listType="picture-card"
      fileList={fileList}
      beforeUpload={handleUpload}
      onRemove={(file: any) => onChange(fileIds.filter((id) => id !== file.id))}
    >
      <div className="text-center">
        <AiOutlinePlus className="m-auto" />
        <div className="text-sm mt-2">上传</div>
      </div>
    </Upload>
  );
}

export interface QuickReplyFormData {
  name: string;
  content: string;
  visibility: 'all' | 'private';
  fileIds?: string[];
  tags?: string[];
}

export interface QuickReplyFormProps {
  initData?: QuickReplyFormData;
  availableTags?: string[];
  loading?: boolean;
  onSubmit: (data: QuickReplyFormData) => void;
}

export function QuickReplyForm({
  initData,
  availableTags,
  loading,
  onSubmit,
}: QuickReplyFormProps) {
  const { control, handleSubmit } = useForm({ defaultValues: initData });

  const tagOptions = useMemo(() => {
    return availableTags?.map((label) => ({ label, value: label }));
  }, [availableTags]);

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <Controller
        control={control}
        name="name"
        rules={{ required: '请填写此字段' }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item
            required
            label="名称"
            htmlFor="quick_reply_form_name"
            validateStatus={error ? 'error' : undefined}
            help={error?.message}
          >
            <Input {...field} id="quick_reply_form_name" autoFocus />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="visibility"
        defaultValue="all"
        render={({ field }) => (
          <Form.Item
            required
            label="权限"
            htmlFor="quick_reply_form_visibility"
            extra="谁可以使用这个快捷回复"
          >
            <Select {...field} id="quick_reply_form_visibility">
              <Option value="all">所有人</Option>
              <Option value="private">仅限自己</Option>
            </Select>
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="tags"
        render={({ field }) => (
          <Form.Item
            label="标签"
            extra="可以用任意字符串创建（输入并按下回车键）或从已有标签中选择。"
          >
            <Select {...field} mode="tags" options={tagOptions} />
          </Form.Item>
        )}
      />

      <Divider />

      <Controller
        control={control}
        name="content"
        rules={{ required: '请填写此字段' }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item
            required
            label="内容"
            htmlFor="quick_reply_form_content"
            validateStatus={error ? 'error' : undefined}
            help={error?.message}
            style={{ marginBottom: 16 }}
          >
            <TextArea {...field} id="quick_reply_form_content" rows={5} />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="fileIds"
        render={({ field: { ref, ...field } }) => <Files {...field} />}
      />

      <div className="mt-4 space-x-2">
        <Button type="primary" htmlType="submit" loading={loading}>
          保存
        </Button>
        <Link to="..">
          <Button disabled={loading}>返回</Button>
        </Link>
      </div>
    </Form>
  );
}
