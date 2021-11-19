import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useController, useFormContext } from 'react-hook-form';

import { Uploader as _Uploader } from '@/components/Uploader';
import { useAlert } from '@/utils/useAlert';
import { useUpload } from '@/utils/useUpload';
import { CustomFieldProps } from '..';
import { ErrorMessage } from '../ErrorMessage';

export function Uploader({ id, required }: CustomFieldProps) {
  const { t } = useTranslation();
  const { element: alertElement, alert } = useAlert();

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
      {alertElement}
      <_Uploader
        files={files}
        onUpload={(files) => upload(files[0])}
        onDelete={(file) => remove(file.key)}
        error={!!error}
      />
      {error && <ErrorMessage className="mt-1">{error.message}</ErrorMessage>}
    </div>
  );
}
