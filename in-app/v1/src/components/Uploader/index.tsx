import { ChangeEventHandler, useCallback, useRef } from 'react';
import cx from 'classnames';

import PlusIcon from '@/icons/Plus';
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
  id?: string;
  files?: FileInfo<Key>[];
  onUpload?: (files: FileList) => void;
  onDelete?: (file: FileInfo<Key>) => void;
  error?: boolean;
}

export function Uploader<Key extends FileKey>({
  id,
  files,
  onUpload,
  onDelete,
  error,
}: UploaderProps<Key>) {
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
      <div className="w-full flex flex-wrap">
        {files && files.length > 0 && (
          <FileItems gallery previewable={false} files={files} onDelete={onDelete} />
        )}
        <div
          className={cx('flex items-center mb-1 p-6 bg-[#f2f2f2] rounded cursor-pointer', {
            'border border-red': error,
          })}
          onClick={handleClick}
        >
          <PlusIcon className="w-8 h-8" />
        </div>
      </div>
      <input id={id} className="hidden" type="file" ref={$input} onChange={handleChange} />
    </div>
  );
}
