import { XIcon } from '@heroicons/react/solid';
import { useMemo } from 'react';

import styles from './index.module.css';

export interface FileItemProps {
  name: string;
  progress?: number;
}

export function FileItem({ name, progress }: FileItemProps) {
  const displayName = useMemo(() => {
    const index = name.lastIndexOf('.');
    const pureName = name.slice(0, index);
    const ext = name.slice(index + 1);
    if (pureName.length <= 7) {
      return pureName + '.' + ext;
    }
    return `${pureName.slice(0, 2)}...${pureName.slice(pureName.length - 2)}.${ext}`;
  }, [name]);

  return (
    <div className="bg-gray-50 text-xs mr-2 mb-2 rounded text-gray-500 flex items-center relative overflow-hidden">
      <div className="my-2 ml-2">{displayName}</div>

      <div className="w-8 h-full flex justify-center items-center cursor-pointer">
        <XIcon className="w-3 h-3 text-tapBlue-600" />
      </div>

      {progress && (
        <div className={`${styles.progress} absolute top-0`} style={{ width: progress + '%' }}>
          <div className="h-full bg-tapBlue-600 bg-opacity-50" />
        </div>
      )}
    </div>
  );
}
