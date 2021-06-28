import { ChangeEvent, useRef } from 'react';
import { PlusIcon } from '@heroicons/react/solid';

import { FileItem } from '../FileItem';

export class UploadTask {}

export interface File {
  name: string;
  progress?: number;
}

export interface UploaderProps {
  defaultFiles?: File[];
  onUpload?: (files: FileList) => void;
}

export function Uploader({ defaultFiles, onUpload }: UploaderProps) {
  const $input = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    $input.current?.click();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files as FileList;
    onUpload?.(files);
    if ($input.current) {
      $input.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <div
        className="w-full h-14 p-4 border border-dashed border-gray-400 rounded flex justify-center items-center active:border active:border-tapBlue-600 cursor-pointer"
        onClick={handleClick}
      >
        <input className="hidden" type="file" ref={$input} onChange={handleChange} />
        <div className="flex items-center select-none">
          <PlusIcon className="w-7 h-7 text-tapBlue-600" />
          <span className="text-gray-500">点击上传</span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap">
        {defaultFiles?.map(({ name, progress }) => (
          <FileItem name={name} progress={progress} />
        ))}
      </div>
    </div>
  );
}
