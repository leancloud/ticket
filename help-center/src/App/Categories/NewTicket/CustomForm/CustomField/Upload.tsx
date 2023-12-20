import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useController, useFormContext } from 'react-hook-form';
import { Form } from '@/components/antd';
import { Uploader as _Uploader } from '@/components/Uploader';
import { useUpload } from '@/utils/useUpload';
import { CustomFieldProps } from './';
import { Help } from './Help';

export function Upload({ id, description, title, required }: CustomFieldProps) {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const {
    field: { ref, onChange },
    fieldState: { error },
  } = useController<Record<string, string[] | undefined>>({
    control,
    name: id,
    rules: {
      required: {
        value: required,
        message: t('validation.required'),
      },
      validate: (fileIds) => {
        // 未上传完毕的文件没有 id
        if (fileIds?.some((id) => id === undefined)) {
          return t('validation.attachment_not_uploaded') as string;
        }
        return true;
      },
    },
  });

  const { files, upload, remove } = useUpload({
    onError: (e) => {},
  });

  useEffect(() => {
    onChange(files.map((f) => f.id));
  }, [files]);

  return (
    <Form.Item
      label={title}
      htmlFor={id}
      required={required}
      help={error?.message || <Help content={description} />}
      validateStatus={error ? 'error' : undefined}
    >
      <_Uploader
        id={id}
        files={files}
        onUpload={(files) => upload(files[0])}
        onDelete={(file) => remove(file.key)}
        error={!!error}
      />
    </Form.Item>
  );
}
