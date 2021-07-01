import { DownloadIcon, PaperClipIcon, XIcon } from '@heroicons/react/solid';
import { useMemo } from 'react';

import styles from './index.module.css';

function FileIcon({ mime, url }: { mime?: string; url?: string }) {
  if (mime && mime.startsWith('image') && url) {
    return <img className="inline-block h-4 w-4 mr-1" src={url} />;
  }
  return <PaperClipIcon className="w-4 h-4 text-gray-400 transform rotate-45" />;
}

function Progress({ value }: { value: number }) {
  return (
    <div className={`${styles.progress} absolute top-0 left-0`} style={{ width: value + '%' }}>
      <div className="h-full bg-tapBlue-600 bg-opacity-50" />
    </div>
  );
}

export interface FileItemProps {
  name: string;
  mime?: string;
  url?: string;
  progress?: number;
  onDelete?: () => void;
  nameMaxLength?: number;
}

function truncateName(name: string, length: number): string {
  if (name.length <= length) {
    return name;
  }
  const prefixLength = Math.floor(length / 2);
  const suffixLength = Math.ceil(length / 2);
  return name.slice(0, prefixLength) + '...' + name.slice(name.length - suffixLength);
}

export function FileItem({
  name,
  mime,
  url,
  progress,
  onDelete,
  nameMaxLength = 4,
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
    <div className="bg-gray-100 text-xs mr-2 mb-2 p-2 rounded text-gray-500 relative overflow-hidden inline-flex items-center">
      {progress && <Progress value={progress} />}

      <FileIcon mime={mime} url={url} />

      <span>{displayName}</span>

      <span className="ml-1 text-tapBlue-600">
        {onDelete && progress === undefined && (
          <XIcon className="inline-block w-4 h-4 cursor-pointer" onClick={onDelete} />
        )}
      </span>
    </div>
  );
}
