import { ComponentPropsWithoutRef, Key, useMemo } from 'react';
import { FilmIcon, PaperClipIcon, XIcon } from '@heroicons/react/solid';
import cx from 'classnames';

import { usePreview } from 'utils/usePreview';
import styles from './index.module.css';

function FileIcon({ mime, url }: { mime?: string; url?: string }) {
  if (mime) {
    if (mime.startsWith('image') && url) {
      return <img className="inline-block h-4 w-4 mr-1" src={url} />;
    }
    if (mime.startsWith('video')) {
      return <FilmIcon className="w-4 h-4 mr-1 text-gray-400" />;
    }
  }
  return <PaperClipIcon className="w-4 h-4 mr-1 text-gray-400 transform rotate-45" />;
}

function Progress({ value }: { value: number }) {
  return (
    <div className={`${styles.progress} absolute top-0 left-0 w-full`}>
      <div
        className="h-full bg-tapBlue bg-opacity-50 transition-all ease-linear"
        style={{ width: value + '%' }}
      />
    </div>
  );
}

function truncateName(name: string, length: number): string {
  if (name.length <= length) {
    return name;
  }
  const prefixLength = Math.floor(length / 2);
  const suffixLength = Math.ceil(length / 2);
  return name.slice(0, prefixLength) + '...' + name.slice(name.length - suffixLength);
}

export interface FileInfo {
  name: string;
  mime?: string;
  url?: string;
  progress?: number;
}

export interface FileItemProps extends ComponentPropsWithoutRef<'div'> {
  file: FileInfo;
  onDelete?: () => void;
  nameMaxLength?: number;
}

export function FileItem({ file, onDelete, nameMaxLength = 4, ...props }: FileItemProps) {
  const displayName = useMemo(() => {
    if (!file.name) {
      return '';
    }
    const index = file.name.lastIndexOf('.');
    if (index >= 0) {
      const pureName = file.name.slice(0, index);
      const ext = file.name.slice(index + 1);
      return truncateName(pureName, nameMaxLength) + '.' + ext;
    }
    return truncateName(file.name, nameMaxLength);
  }, [file.name, nameMaxLength]);

  return (
    <div
      {...props}
      className={cx(
        'bg-[rgba(0,0,0,0.02)] text-xs p-2 rounded text-[#666] relative overflow-hidden inline-flex items-center',
        props.className
      )}
    >
      {file.progress && <Progress value={file.progress} />}

      <FileIcon mime={file.mime} url={file.url} />

      <span className="select-none">{displayName}</span>

      {onDelete && file.progress === undefined && (
        <XIcon className="ml-1 w-4 h-4 text-tapBlue cursor-pointer" onClick={onDelete} />
      )}
    </div>
  );
}

export interface FileInfoWithKey<K extends Key> extends FileInfo {
  key: K;
}

export interface FileItemsProps<K extends Key> extends ComponentPropsWithoutRef<'div'> {
  files: FileInfoWithKey<K>[];
  onDelete?: (file: FileInfoWithKey<K>) => void;
  nameMaxLength?: number;
}

export function FileItems<K extends Key>({
  files,
  onDelete,
  nameMaxLength,
  ...props
}: FileItemsProps<K>) {
  const { element: previewer, preview } = usePreview();

  return (
    <div {...props}>
      {previewer}
      <div className="flex flex-wrap -mb-2 -mr-2">
        {files.map((file) => (
          <FileItem
            key={file.key}
            className="mr-2 mb-2"
            file={file}
            onClick={() => file.mime && file.url && preview(file as any)}
            onDelete={onDelete && (() => onDelete(file))}
            nameMaxLength={nameMaxLength}
          />
        ))}
      </div>
    </div>
  );
}
