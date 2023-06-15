import { memo, useState } from 'react';
import { useController } from 'react-hook-form';
import { UploadChangeParam } from 'antd/lib/upload';

import { storage } from '@/leancloud';
import { Button, Form, Upload as AntUpload } from '@/components/antd';
import { Help } from './Help';

function uploadFileToLeanCloud({ file, onError, onProgress, onSuccess }: any) {
  return storage.upload(file.name, file, { onProgress }).then(onSuccess).catch(onError);
}

interface UploadState {
  isUploading: boolean;
  fileIds: string[];
  errors: Error[];
}

function getStateFromAntUploadInfo({ fileList }: UploadChangeParam): UploadState {
  let isUploading = false;
  const fileIds: string[] = [];
  const errors: Error[] = [];
  fileList.forEach((file) => {
    if (file.response) {
      fileIds.push(file.response.id);
    } else if (file.error) {
      errors.push(file.error);
    } else {
      isUploading = true;
    }
  });
  return { isUploading, fileIds, errors };
}

export interface UploadProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  multiple?: boolean;
}

export const Upload = memo(({ name, label, description, required, multiple }: UploadProps) => {
  const [uploadState, setUploadState] = useState<UploadState>();
  const {
    field,
    fieldState: { error },
  } = useController({
    name,
    rules: {
      required: {
        value: !!required,
        message: '请填写此字段',
      },
      validate: () => {
        if (uploadState?.isUploading) {
          return '请等待全部文件上传完成';
        }
        if (uploadState?.errors.length) {
          return '请移除上传失败的文件';
        }
        return true;
      },
    },
  });

  const id = `ticket_${name}`;
  const { ref, onChange } = field;

  const handleChange = (info: any) => {
    const state = getStateFromAntUploadInfo(info);
    setUploadState(state);
    onChange(state.fileIds.length ? state.fileIds : undefined);
  };

  return (
    <Form.Item
      label={label}
      htmlFor={id}
      required={required}
      validateStatus={error ? 'error' : undefined}
      help={error?.message || <Help content={description} />}
    >
      <AntUpload
        ref={ref}
        multiple={multiple}
        customRequest={uploadFileToLeanCloud}
        onChange={handleChange}
      >
        <Button>选择文件</Button>
      </AntUpload>
    </Form.Item>
  );
});
