import { ChangeEventHandler, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from '@heroicons/react/solid';

import { useAlert } from 'utils/useAlert';
import { FileItem } from '../FileItem';

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
  maxSize?: number;
}

export function Uploader<Key extends FileKey>({
  files,
  onUpload,
  onDelete,
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
        className="w-full h-14 p-4 border border-dashed border-gray-400 rounded flex justify-center items-center active:border active:border-tapBlue hover:border-tapBlue cursor-pointer"
        onClick={handleClick}
      >
        <input className="hidden" type="file" ref={$input} onChange={handleChange} />
        <div className="flex items-center select-none">
          <PlusIcon className="w-7 h-7 text-tapBlue" />
          <span className="text-gray-500">{t('general.click_to_upload')}</span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {files?.map((info) => (
          <FileItem {...info} onDelete={onDelete && (() => onDelete(info))} />
        ))}
      </div>
    </div>
  );
}
