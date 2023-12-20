import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { storage } from '@/leancloud';
import { FileInfo } from '@/components/Uploader';

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GB

interface FileInfoWithId extends FileInfo<number> {
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
  removeAll: () => void;
}

export function useUpload({ onError }: UseUploadOptions = {}): UseUploadResult {
  const { t } = useTranslation();
  const [files, setFiles] = useState<FileInfoWithId[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const $nextKey = useRef(0);

  const $onError = useRef(onError);
  $onError.current = onError;

  const upload = useCallback(
    (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        $onError.current?.(
          new Error(t('validation.attachment_too_big_text', { size: 1, unit: 'GB' }))
        );
        return;
      }

      const key = $nextKey.current++;
      const fileInfo: FileInfo<number> = {
        key,
        name: file.name,
        url: URL.createObjectURL(file),
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
            // url: file.url,
            mime: file.mime,
            progress: undefined,
          });
        })
        .catch((error) => {
          setFiles((prev) => prev.filter((f) => f.key !== key));
          $onError.current?.(error);
        })
        .finally(() => setUploadingCount((prev) => prev - 1));
    },
    [t]
  );

  const remove = useCallback((key: number) => {
    setFiles((prev) => prev.filter((f) => f.key !== key));
  }, []);

  const removeAll = useCallback(() => setFiles([]), []);

  return { files, isUploading: uploadingCount > 0, upload, remove, removeAll };
}
