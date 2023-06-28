import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useController, useFormContext } from 'react-hook-form';

import { useAlert } from '@/components/Alert';
import { Uploader as _Uploader } from '@/components/Uploader';
import { useUpload } from '@/utils/useUpload';
import { CustomFieldProps } from '..';
import { Description } from '../Description';

export function Uploader({ id, description, required, htmlId }: CustomFieldProps) {
  const { t } = useTranslation();
  const alert = useAlert();

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
    onError: (e) =>
      alert({
        title: t('validation.attachment_too_big'),
        content: e.message,
      }),
  });

  useEffect(() => {
    onChange(files.map((f) => f.id));
  }, [files]);

  const $container = useRef<HTMLDivElement>(null!);
  ref({
    focus: () => $container.current.scrollIntoView(),
  });

  return (
    <div ref={$container}>
      <_Uploader
        id={htmlId}
        files={files}
        onUpload={(files) => upload(files[0])}
        onDelete={(file) => remove(file.key)}
        error={!!error}
      />
      <Description error={error}>{description}</Description>
    </div>
  );
}
