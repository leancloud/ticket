import { ChangeEventHandler, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from '@heroicons/react/solid';

import { FileItem } from '../FileItem';

export interface FileInfo {
  key: string | number;
  name: string;
  mime?: string;
  url?: string;
  progress?: number;
}

export interface UploaderProps {
  files?: FileInfo[];
  onUpload?: (files: FileList) => void;
  onDelete?: (file: FileInfo) => void;
}

export function Uploader({ files, onUpload, onDelete }: UploaderProps) {
  const { t } = useTranslation();
  const $input = useRef<HTMLInputElement>(null!);
  const handleClick = useCallback(() => $input.current.click(), []);
  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (e) => {
      const files = e.target.files as FileList;
      onUpload?.(files);
      $input.current.value = '';
    },
    [onUpload]
  );

  return (
    <div className="w-full">
      <div
        className="w-full h-14 p-4 border border-dashed border-gray-400 rounded flex justify-center items-center active:border active:border-tapBlue-600 hover:border-tapBlue-600 cursor-pointer"
        onClick={handleClick}
      >
        <input className="hidden" type="file" ref={$input} onChange={handleChange} />
        <div className="flex items-center select-none">
          <PlusIcon className="w-7 h-7 text-tapBlue-600" />
          <span className="text-gray-500">{t('click_to_upload')}</span>
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
