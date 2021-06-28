import { DownloadIcon, XIcon } from '@heroicons/react/solid';
import { useMemo } from 'react';

import styles from './index.module.css';

export interface FileItemProps {
  name: string;
  mime?: string;
  url?: string;
  progress?: number;
  onDelete?: () => void;
}

export function FileItem({ name, progress, onDelete }: FileItemProps) {
  const displayName = useMemo(() => {
    if (!name) {
      return '';
    }
    const index = name.lastIndexOf('.');
    const pureName = name.slice(0, index);
    const ext = name.slice(index + 1);
    if (pureName.length <= 7) {
      return pureName + '.' + ext;
    }
    return `${pureName.slice(0, 2)}...${pureName.slice(pureName.length - 2)}.${ext}`;
  }, [name]);

  return (
    <div className="bg-gray-100 text-xs mr-2 mb-2 p-2 rounded text-gray-500 relative overflow-hidden">
      <span>{displayName}</span>

      <span className="ml-2 text-tapBlue-600">
        <DownloadIcon className="inline-block w-4 h-4 cursor-pointer" />
        {onDelete && <XIcon className="inline-block w-4 h-4 cursor-pointer" onClick={onDelete} />}
      </span>

      {progress && (
        <div
          className={`${styles.progress} absolute top-0 left-0`}
          style={{ width: progress + '%' }}
        >
          <div className="h-full bg-tapBlue-600 bg-opacity-50" />
        </div>
      )}
    </div>
  );
}
