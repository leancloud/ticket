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
    if (files.some((f) => !f.id)) {
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
      />
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  );
}
