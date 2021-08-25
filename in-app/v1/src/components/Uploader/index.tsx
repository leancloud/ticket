import { ChangeEventHandler, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import cx from 'classnames';

import PlusIcon from 'icons/Plus';
import { FileItems } from '../FileItem';

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
}

export function Uploader<Key extends FileKey>({
  files,
  onUpload,
  onDelete,
  error,
}: UploaderProps<Key>) {
  const { t } = useTranslation();
  const $input = useRef<HTMLInputElement>(null!);
  const handleClick = useCallback(() => $input.current.click(), []);
  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) {
        return;
      }
      onUpload?.(files);
      $input.current.value = '';
    },
    [onUpload]
  );

  return (
    <div className="w-full">
      <div
        className={cx(
          'w-full h-12 p-4 border rounded flex justify-center items-center active:border active:border-tapBlue hover:border-tapBlue cursor-pointer',
          {
            'border-dashed border-[#D9D9D9]': !error,
            'border-red-500': error,
          }
        )}
        onClick={handleClick}
      >
        <input className="hidden" type="file" ref={$input} onChange={handleChange} />
        <div className="flex items-center select-none">
          <PlusIcon className="w-4 h-4 text-tapBlue" />
          <span className="ml-1 text-[#666] text-sm">{t('general.click_to_upload')}</span>
        </div>
      </div>
      {files && files.length > 0 && (
        <FileItems className="mt-2" previewable={false} files={files} onDelete={onDelete} />
      )}
    </div>
  );
}
