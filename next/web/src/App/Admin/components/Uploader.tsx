import { ForwardedRef, forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useMutation } from 'react-query';
import { AiOutlinePlus, AiOutlineFile, AiOutlineEye, AiOutlineDelete } from 'react-icons/ai';
import { Progress } from 'antd';
import cx from 'classnames';

import { storage } from '@/leancloud';
import { FileSchema, fetchFiles } from '@/api/file';

const IMAGE_SUFFIX = ['.jpg', '.jpeg', '.png', '.gif'];

interface FileInfo {
  uid: number;
  id?: string;
  name?: string;
  thumbnailUrl?: string;
  url?: string;
  percent?: number;
  error?: unknown;
}

interface UploaderStatus {
  fileIds: string[];
  uploading: boolean;
  hasError: boolean;
}

interface UploaderProps {
  disabled?: boolean;
}

export interface UploaderRef {
  getStatus: () => UploaderStatus;
  reset: (defaultFiles?: string[] | FileSchema[]) => void;
}

export const Uploader = forwardRef(
  ({ disabled }: UploaderProps, ref: ForwardedRef<UploaderRef>) => {
    const nextUid = useRef(0);
    const generateUid = () => nextUid.current++;

    const [fileInfos, setFileInfos] = useState<FileInfo[]>([]);

    const updateFileInfo = (uid: number, info: Partial<FileInfo>) => {
      setFileInfos((prev) => {
        return prev.map((prevInfo) => {
          if (prevInfo.uid === uid) {
            return { ...prevInfo, ...info };
          }
          return prevInfo;
        });
      });
    };

    const removeFileInfo = (uid: number) => {
      setFileInfos((prev) => prev.filter((info) => info.uid !== uid));
    };

    const handleUpload = (files: FileList) => {
      for (const file of files) {
        const uid = generateUid();
        setFileInfos((prev) => [
          ...prev,
          {
            uid,
            name: file.name,
            percent: 0,
          },
        ]);
        upload({
          file,
          onProgress: (percent) => updateFileInfo(uid, { percent }),
          onSuccess: (fileInfo) => updateFileInfo(uid, fileInfo),
          onError: (error) => updateFileInfo(uid, { error }),
        });
      }
    };

    const setFiles = (files: FileSchema[]) => {
      setFileInfos(
        files.map((file) => ({
          uid: generateUid(),
          id: file.id,
          name: file.name,
          thumbnailUrl: isImage(file.name) ? file.url : undefined,
          url: file.url,
        }))
      );
    };

    const { mutate: fetchDefaultFiles, isLoading } = useMutation({
      mutationFn: fetchFiles,
      onSuccess: (files) => {
        setFiles(files);
      },
    });

    useImperativeHandle(ref, () => ({
      getStatus: () => {
        const status: UploaderStatus = {
          fileIds: [],
          uploading: isLoading,
          hasError: false,
        };
        for (const file of fileInfos) {
          if (file.error) {
            status.hasError = true;
          } else if (!file.id) {
            status.uploading = true;
          } else {
            status.fileIds.push(file.id);
          }
        }
        return status;
      },
      reset: (defaultFiles) => {
        setFileInfos([]);
        if (defaultFiles?.length) {
          if (typeof defaultFiles[0] === 'string') {
            fetchDefaultFiles(defaultFiles as string[]);
          } else {
            setFiles(defaultFiles as FileSchema[]);
          }
        }
      },
    }));

    return (
      <div className="flex flex-wrap gap-2">
        {fileInfos.map((fileInfo) => (
          <FileItem
            key={fileInfo.uid}
            file={fileInfo}
            onRemove={() => removeFileInfo(fileInfo.uid)}
            disabled={disabled}
          />
        ))}
        <UploadButton onUpload={handleUpload} disabled={disabled || isLoading} />
      </div>
    );
  }
);

interface UploadButtonProps {
  onUpload: (fileList: FileList) => void;
  disabled?: boolean;
}

function UploadButton({ onUpload, disabled }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null!);

  return (
    <button
      className="flex w-[90px] h-[90px] border rounded border-dashed bg-white disabled:bg-gray-200 enabled:hover:border-primary-600 transition-colors duration-200"
      onClick={() => inputRef.current.click()}
      disabled={disabled}
    >
      <input
        className="hidden"
        type="file"
        multiple
        ref={inputRef}
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length) {
            onUpload(files);
            inputRef.current.value = '';
          }
        }}
      />
      <div className="m-auto text-center">
        <AiOutlinePlus className="mx-auto mb-2 w-[18px] h-[18px]" />
        <div>上传</div>
      </div>
    </button>
  );
}

interface FileItemProps {
  file: FileInfo;
  onRemove?: () => void;
  disabled?: boolean;
}

function FileItem({ file, onRemove, disabled }: FileItemProps) {
  return (
    <div
      className={cx(
        'w-[90px] h-[90px] relative flex justify-center items-center border rounded overflow-hidden',
        {
          'border-red-500': file.error,
        }
      )}
    >
      {file.percent !== undefined && file.percent < 100 ? (
        <Progress
          className="absolute"
          type="circle"
          strokeColor="#15c5ce"
          showInfo={false}
          width={42}
          strokeWidth={10}
          percent={file.percent}
        />
      ) : (
        <>
          {file.thumbnailUrl ? (
            <img className="w-full h-full object-contain" src={file.thumbnailUrl} />
          ) : (
            <div className={cx('mx-1 overflow-hidden', { 'text-red-500': file.error })}>
              <AiOutlineFile className="mx-auto mb-2 w-4 h-4" />
              <div className="truncate">{file.name ?? 'Loading...'}</div>
            </div>
          )}
          {!disabled && <FileCover url={file.url} onRemove={onRemove} />}
        </>
      )}
    </div>
  );
}

interface FileCoverProps {
  url?: string;
  onRemove?: () => void;
}

function FileCover({ url, onRemove }: FileCoverProps) {
  return (
    <div className="absolute w-full h-full flex justify-center items-center bg-[rgba(0,0,0,0.5)] opacity-0 hover:opacity-100 transition-opacity duration-200 group">
      <div className="space-x-2">
        {url && (
          <a
            className="text-white/75 hover:text-white inline-block transition-colors duration-200"
            href={url}
            target="_blank"
            referrerPolicy="no-referrer"
          >
            <AiOutlineEye className="w-[18px] h-[18px]" />
          </a>
        )}
        <button
          className="text-white/75 hover:text-white transition-colors duration-200"
          onClick={onRemove}
        >
          <AiOutlineDelete className="w-[18px] h-[18px]" />
        </button>
      </div>
    </div>
  );
}

function isImage(name: string) {
  return IMAGE_SUFFIX.some((suffix) => name.endsWith(suffix));
}

interface UploadOptions {
  file: File;
  onProgress: (percent: number) => void;
  onSuccess: (file: Partial<FileInfo>) => void;
  onError: (error: Error) => void;
}

function upload({ file, onProgress, onSuccess, onError }: UploadOptions) {
  storage
    .upload(file.name, file, {
      onProgress: ({ percent }) => onProgress(percent || 0),
    })
    .then((lcFile) => {
      if (isImage(file.name)) {
        getBase64Url(file, (thumbnailUrl) => {
          onSuccess({ thumbnailUrl, id: lcFile.id, url: lcFile.url });
        });
      } else {
        onSuccess({ id: lcFile.id, url: lcFile.url });
      }
    })
    .catch(onError);
}

function getBase64Url(file: File, cb: (base64Url: string) => void) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => cb(reader.result as string);
}
