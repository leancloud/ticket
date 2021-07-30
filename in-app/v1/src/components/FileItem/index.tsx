import { ComponentPropsWithoutRef, useMemo } from 'react';
import { FilmIcon, PaperClipIcon, XIcon } from '@heroicons/react/solid';
import classNames from 'classnames';

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

export interface FileItemProps extends ComponentPropsWithoutRef<'div'> {
  name: string;
  mime?: string;
  url?: string;
  progress?: number;
  onDelete?: () => void;
  nameMaxLength?: number;
}

export function FileItem({
  name,
  mime,
  url,
  progress,
  onDelete,
  nameMaxLength = 4,
  ...props
}: FileItemProps) {
  const displayName = useMemo(() => {
    if (!name) {
      return '';
    }
    const index = name.lastIndexOf('.');
    if (index >= 0) {
      const pureName = name.slice(0, index);
      const ext = name.slice(index + 1);
      return truncateName(pureName, nameMaxLength) + '.' + ext;
    }
    return truncateName(name, nameMaxLength);
  }, [name, nameMaxLength]);

  return (
    <div
      {...props}
      className={classNames(
        'bg-gray-100 text-xs p-2 rounded text-gray-500 relative overflow-hidden inline-flex items-center',
        props.className
      )}
    >
      {progress && <Progress value={progress} />}

      <FileIcon mime={mime} url={url} />

      <span className="select-none">{displayName}</span>

      {onDelete && progress === undefined && (
        <XIcon className="ml-1 w-4 h-4 text-tapBlue cursor-pointer" onClick={onDelete} />
      )}
    </div>
  );
}
