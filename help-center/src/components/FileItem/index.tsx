import { ComponentPropsWithoutRef, Key, useMemo } from 'react';
import cx from 'classnames';
import {
  AiTwotoneVideoCamera,
  AiOutlinePaperClip,
  AiOutlineDelete,
  AiOutlineEye,
} from 'react-icons/ai';
import { preview } from '@/utils/preview';

import styles from './index.module.css';

function FileIcon({ mime, url, gallery }: { gallery?: boolean; mime?: string; url?: string }) {
  const style = gallery ? 'h-full w-20 border border-[#f2f2f2] rounded' : 'h-4 w-4 mr-1';

  if (mime) {
    if (mime.startsWith('image') && url) {
      return <img className={cx('inline-block', style)} src={url} />;
    }
    if (mime.startsWith('video')) {
      return <AiTwotoneVideoCamera className={cx('w-4 h-4 text-[#BFBFBF]', style)} />;
    }
  }
  return <AiOutlinePaperClip className={style} />;
}

function Progress({ value }: { value: number }) {
  return (
    <div className={`${styles.progress} absolute top-0 left-0 w-full`}>
      <div
        className="h-full bg-primary bg-opacity-50 transition-all ease-linear"
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
  return <div className="select-none">{displayName}</div>;
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
  showName?: boolean;
  gallery?: boolean;
}

export function FileItem({ file, onDelete, nameMaxLength, gallery, ...props }: FileItemProps) {
  return (
    <div
      {...props}
      className={cx(
        'group bg-[rgba(0,0,0,0.02)] text-xs rounded text-neutral-600 relative overflow-hidden inline-flex items-center',
        gallery ? '' : 'p-2',
        props.className
      )}
    >
      {!!file.progress && <Progress value={file.progress} />}
      <FileIcon gallery={gallery} mime={file.mime} url={file.url} />
      <FileName file={file} gallery={gallery} />
      <div className="flex justify-center gap-x-1 items-center absolute top-0 right-0 bottom-0 left-0 opacity-0 group-hover:opacity-100 bg-[rgba(0,0,0,0.4)] text-lg text-white">
        <AiOutlineEye
          className="cursor-pointer"
          onClick={() => preview({ url: file.url, mime: file.mime })}
        />
        {onDelete && file.progress === undefined && (
          <AiOutlineDelete
            className={cx('cursor-pointer', gallery ? 'rounded-full' : 'ml-1 w-4 h-4 text-primary')}
            onClick={onDelete}
          />
        )}
      </div>
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
  return (
    <>
      <div {...props} className={cx('flex flex-wrap gap-2', props.className)}>
        {files.map((file) => (
          <FileItem
            gallery={gallery}
            className={cx(gallery ? 'mr-2 mb-1 h-20 w-20' : 'mr-2 mb-2')}
            key={file.key}
            file={file}
            onDelete={onDelete && (() => onDelete(file))}
            nameMaxLength={nameMaxLength}
          />
        ))}
      </div>
    </>
  );
}
