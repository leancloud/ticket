import { Uploader as Uploader_ } from 'components/Uploader';
import { useEffect } from 'react';
import { useUpload } from 'utils/useUpload';
import { ErrorMessage } from '../ErrorMessage';

export interface UploaderProps {
  onChange: (value?: string[]) => void;
  error?: string;
}

export function Uploader({ onChange, error }: UploaderProps) {
  const { files, upload, remove } = useUpload();

  useEffect(() => {
    if (files.length === 0 || files.some((f) => !f.id)) {
      // 没有 id 的是正在上传或上传失败的文件
      onChange(undefined);
    } else {
      onChange(files.map((f) => f.id!));
    }
  }, [files]);

  return (
    <div>
      <Uploader_
        files={files}
        onUpload={(files) => upload(files[0])}
        onDelete={(file) => remove(file.key)}
        error={!!error}
      />
      <ErrorMessage className="mt-1">{error}</ErrorMessage>
    </div>
  );
}
