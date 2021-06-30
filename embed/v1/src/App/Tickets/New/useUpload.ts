import { useCallback, useRef, useState } from 'react';

import { storage } from 'leancloud';
import { FileInfo } from 'components/Uploader';

interface FileInfoWithId extends FileInfo {
  id?: string;
}

export interface UseUploadOptions {
  onError?: (error: Error) => void;
}

export interface UseUploadResult {
  files: FileInfoWithId[];
  isUploading: boolean;
  upload: (file: File) => void;
  remove: (key: number) => void;
}

export function useUpload({ onError }: UseUploadOptions = {}): UseUploadResult {
  const [files, setFiles] = useState<FileInfoWithId[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const $nextKey = useRef(0);

  const upload = useCallback((file: File) => {
    const key = $nextKey.current++;
    const fileInfo: FileInfo = {
      key,
      name: file.name,
      progress: 0,
    };

    setFiles((prev) => prev.concat(fileInfo));
    setUploadingCount((prev) => prev + 1);

    const update = (fileInfo: Partial<FileInfoWithId>) => {
      setFiles((prev) => {
        const index = prev.findIndex((f) => f.key === key);
        if (index === -1) {
          return prev;
        }
        return [
          ...prev.slice(0, index),
          {
            ...prev[index],
            ...fileInfo,
          },
          ...prev.slice(index + 1),
        ];
      });
    };

    const onProgress = ({ loaded, total }: { loaded: number; total?: number }) => {
      if (total) {
        const percent = (loaded / total) * 100;
        update({ progress: percent });
      }
    };

    storage
      .upload(fileInfo.name, file, { onProgress })
      .then((file) => {
        update({
          id: file.id,
          url: file.url,
          mime: file.mime,
          progress: undefined,
        });
      })
      .catch((error) => {
        setFiles((prev) => prev.filter((f) => f.key !== key));
        onError?.(error);
      })
      .finally(() => setUploadingCount((prev) => prev - 1));
  }, []);

  const remove = useCallback((key: number) => {
    setFiles((prev) => prev.filter((f) => f.key !== key));
  }, []);

  return { files, isUploading: uploadingCount > 0, upload, remove };
}
