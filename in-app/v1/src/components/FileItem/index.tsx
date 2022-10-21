import { ComponentPropsWithoutRef, Key, useMemo } from 'react';
import cx from 'classnames';

import { usePreview } from '@/utils/usePreview';
import XIcon from '@/icons/X';
import ClipIcon from '@/icons/Clip';
import FileVideoIcon from '@/icons/FileVideo';
import styles from './index.module.css';

function FileIcon({ mime, url, gallery }: { gallery?: boolean; mime?: string; url?: string }) {
  const style = gallery ? 'h-full w-20 border border-[#f2f2f2] rounded' : 'h-4 w-4 mr-1';

  if (mime) {
    if (mime.startsWith('image') && url) {
      return <img className={cx('inline-block', style)} src={url} />;
    }
    if (mime.startsWith('video')) {
      return <FileVideoIcon className={cx('w-4 h-4 text-[#BFBFBF]', style)} />;
    }
  }
  return <ClipIcon className="w-4 h-4 mr-1 text-[#BFBFBF]" />;
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

function FileName({
  file,
  nameMaxLength = 4,
  gallery,
}: {
  file: FileInfo;
  nameMaxLength?: number;
  gallery?: boolean;
}) {
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

  if (gallery && /^(image)|(video)/.test(file.mime || '')) {
    return null;
  }
  return <span className="select-none">{displayName}</span>;
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
  gallery?: boolean;
}

export function FileItem({ file, onDelete, nameMaxLength, gallery, ...props }: FileItemProps) {
  return (
    <div
      {...props}
      className={cx(
        'bg-[rgba(0,0,0,0.02)] text-xs  rounded text-[#666] relative overflow-hidden inline-flex items-center',
        gallery ? '' : 'p-2',
        props.className
      )}
    >
      {!!file.progress && <Progress value={file.progress} />}

      <FileIcon gallery={gallery} mime={file.mime} url={file.url} />
      <FileName file={file} gallery={gallery} />

      {onDelete && file.progress === undefined && (
        <XIcon
          className={cx(
            'cursor-pointer',
            gallery
              ? 'absolute text-white top-1 right-1 rounded-full bg-black/50'
              : 'ml-1 w-4 h-4 text-tapBlue'
          )}
          onClick={onDelete}
        />
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
  previewable?: boolean;
  gallery?: boolean;
}

export function FileItems<K extends Key>({
  files,
  onDelete,
  nameMaxLength,
  previewable = true,
  gallery,
  ...props
}: FileItemsProps<K>) {
  const { element: previewer, preview } = usePreview();

  return (
    <>
      {previewer}
      <div {...props} className={cx('flex flex-wrap', props.className)}>
        {files.map((file) => (
          <FileItem
            gallery={gallery}
            key={file.key}
            className={cx(gallery ? 'mr-2 mb-1 h-20 w-20' : 'mr-2 mb-2')}
            file={file}
            onClick={() => previewable && file.mime && file.url && preview(file as any)}
            onDelete={onDelete && (() => onDelete(file))}
            nameMaxLength={nameMaxLength}
          />
        ))}
      </div>
    </>
  );
}
