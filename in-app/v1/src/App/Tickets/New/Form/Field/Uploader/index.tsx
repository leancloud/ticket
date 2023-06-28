import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useAlert } from '@/components/Alert';
import { Uploader as Uploader_ } from '@/components/Uploader';
import { useUpload } from '@/utils/useUpload';
import { ControlRef } from '..';
import { ErrorMessage } from '../ErrorMessage';

export interface UploaderProps {
  onChange: (value?: string[]) => void;
  error?: string;
}

export const Uploader = forwardRef<ControlRef, UploaderProps>(({ onChange, error }, ref) => {
  const { t } = useTranslation();
  const $container = useRef<HTMLDivElement>(null!);
  const alert = useAlert();
  const { files, upload, remove } = useUpload({
    onError: (e) =>
      alert({
        title: t('validation.attachment_too_big'),
        content: e.message,
      }),
  });

  useEffect(() => {
    if (files.length === 0 || files.some((f) => !f.id)) {
      // 没有 id 的是正在上传或上传失败的文件
      onChange(undefined);
    } else {
      onChange(files.map((f) => f.id!));
    }
  }, [files]);

  useImperativeHandle(ref, () => ({
    focus: () => $container.current.scrollIntoView(),
  }));

  return (
    <div>
      <Uploader_
        files={files}
        onUpload={(files) => upload(files[0])}
        onDelete={(file) => remove(file.key)}
        error={!!error}
      />
      <ErrorMessage className="mt-1">{error}</ErrorMessage>
    </div>
  );
});
