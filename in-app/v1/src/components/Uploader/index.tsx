import { ChangeEventHandler, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from '@heroicons/react/solid';
import cx from 'classnames';

import { useAlert } from 'utils/useAlert';
import { FileItems } from '../FileItem';

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GB

type FileKey = string | number;

export interface FileInfo<Key extends FileKey> {
  key: Key;
  name: string;
  mime?: string;
  url?: string;
  progress?: number;
}

export interface UploaderProps<Key extends FileKey> {
  files?: FileInfo<Key>[];
  onUpload?: (files: FileList) => void;
  onDelete?: (file: FileInfo<Key>) => void;
  error?: boolean;
  maxSize?: number;
}

export function Uploader<Key extends FileKey>({
  files,
  onUpload,
  onDelete,
  error,
  maxSize = MAX_FILE_SIZE,
}: UploaderProps<Key>) {
  const { t } = useTranslation();
  const $input = useRef<HTMLInputElement>(null!);
  const { element: alertElement, alert } = useAlert();
  const handleClick = useCallback(() => $input.current.click(), []);
  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) {
        return;
      }
      if (maxSize) {
        for (const file of files) {
          if (file.size > maxSize) {
            alert({
              title: t('validation.attachment_too_big'),
              content: t('validation.attachment_too_big_text', { size: 1, unit: 'GB' }),
            });
            return;
          }
        }
      }
      onUpload?.(files);
      $input.current.value = '';
    },
    [maxSize, t, onUpload]
  );

  return (
    <div className="w-full">
      {alertElement}
      <div
        className={cx(
          'w-full h-14 p-4 border rounded flex justify-center items-center active:border active:border-tapBlue hover:border-tapBlue cursor-pointer',
          {
            'border-dashed border-[#D9D9D9]': !error,
            'border-red-500': error,
          }
        )}
        onClick={handleClick}
      >
        <input className="hidden" type="file" ref={$input} onChange={handleChange} />
        <div className="flex items-center select-none">
          <PlusIcon className="w-7 h-7 text-tapBlue" />
          <span className="text-[#666]">{t('general.click_to_upload')}</span>
        </div>
      </div>
      {files && files.length > 0 && <FileItems files={files} onDelete={onDelete} />}
    </div>
  );
}
