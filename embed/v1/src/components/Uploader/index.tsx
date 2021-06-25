import { useRef } from 'react';
import { PlusIcon } from '@heroicons/react/solid';
import classNames from 'classnames';

import { FileItem } from './FileItem';

export class UploadTask {}

type IntrinsicInputProps = JSX.IntrinsicElements['input'];

export interface UploaderProps extends IntrinsicInputProps {
  onUpload?: (files: any) => void;
}

export function Uploader({ className, onUpload, ...props }: UploaderProps) {
  const $input = useRef<HTMLInputElement>(null);

  const handleClick: IntrinsicInputProps['onClick'] = (e) => {
    props.onClick?.(e);
    $input.current?.click();
  };

  const handleChange: IntrinsicInputProps['onChange'] = (e) => {
    props.onChange?.(e);
    const files = e.target.files as FileList;
    onUpload?.(files);
    if ($input.current) {
      $input.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <div
        className={classNames(
          className,
          'w-full h-14 p-4',
          'border border-dashed border-gray-400 rounded',
          'flex justify-center items-center',
          'active:border active:border-tapBlue-600',
          'cursor-pointer'
        )}
        onClick={handleClick}
      >
        <input {...props} className="hidden" type="file" ref={$input} onChange={handleChange} />
        <div className="flex items-center select-none">
          <PlusIcon className="w-7 h-7 text-tapBlue-600" />
          <span className="text-gray-500">点击上传</span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap">
        <FileItem name="附件有个很长的名称.png" />
        <FileItem name="附件.png" />
        <FileItem name="附件有个很长的名称.png" progress={75} />
      </div>
    </div>
  );
}
