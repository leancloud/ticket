import { ChangeEventHandler, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { message } from 'antd';
import cx from 'classnames';
import { AiOutlinePaperClip } from 'react-icons/ai';
import { Button, Input } from '@/components/antd';
import { FileInfoWithKey, FileItems } from '@/components/FileItem';
import { useUpload } from '@/utils/useUpload';

export interface ReplyData {
  content: string;
  fileIds: string[];
}

export interface ReplyInputProps {
  onCommit?: (data: ReplyData) => void | Promise<void>;
}

export function ReplyInput({ onCommit }: ReplyInputProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const { files, isUploading, upload, remove, removeAll } = useUpload({
    onError: (e) => message.warning(e.message),
  });

  const [isCommitting, setIsCommitting] = useState(false);
  const commitable = !isCommitting && !isUploading && (!!content.trim() || !!files.length);
  const handleCommit = async () => {
    if (onCommit) {
      setIsCommitting(true);
      try {
        await onCommit({ content, fileIds: files.map((f) => f.id!) });
        setContent('');
        removeAll();
      } finally {
        setIsCommitting(false);
      }
    }
  };

  return (
    <div className="sticky bottom-0 border-t rounded overflow-hidden bg-transparent">
      <div
        className={cx(
          'overflow-hidden border-gray-100 bg-background pb-[env(safe-area-inset-bottom)]'
        )}
      >
        <div className="flex items-center px-3 py-2 bg-background">
          <div className="grow leading-8 text-sm overflow-hidden rounded-lg relative bg-white">
            <Input.TextArea
              disabled={isCommitting}
              className="!placeholder-[#BFBFBF] !border-0 !bg-white !pr-[40px]"
              autoSize={{ minRows: 1, maxRows: 10 }}
              bordered={false}
              placeholder={t('reply.input_content_hint')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            {files && files.length > 0 && (
              <FileItems
                gallery
                className="mx-[11px] mt-4"
                files={files}
                previewable={false}
                onDelete={(file) => remove(file.key)}
              />
            )}
            <MiniUploader
              className={cx('mx-2 text-2xl absolute top-[50%] right-[4px] translate-y-[-50%]')}
              onUpload={(files) => upload(files[0])}
            />
          </div>
          <Button
            type="primary"
            loading={isCommitting}
            className="mr-3 shrink-0 ml-2"
            disabled={!commitable}
            onClick={handleCommit}
          >
            {t('general.send')}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface AdvancedReplyInputProps {
  value: string;
  files: FileInfoWithKey<number>[];
  disabled?: boolean;
  onChange: (value: string) => void;
  onUpload: (file: File) => void;
  onRemove: (fileId: number) => void;
  onCommit: () => void;
}

function AdvancedReplyInput({
  value,
  files,
  disabled,
  onChange,
  onUpload,
  onRemove,
  onCommit,
}: AdvancedReplyInputProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-[#FAFAFA] border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
      <div className="relative flex px-3 py-2">
        <div className="bg-white grow rounded-2xl border pl-3 pr-[34px] max-h-[200px] sm:max-h-[140px] overflow-y-auto text-sm relative">
          <Editor
            autoFocus
            placeholder={t('reply.input_content_hint')}
            value={value}
            onChange={onChange}
          />
          <MiniUploader
            className="absolute right-1 top-0 w-[34px] h-[30px]"
            onUpload={(files) => onUpload(files[0])}
          />
          {files && files.length > 0 && (
            <FileItems files={files} previewable={false} onDelete={(file) => onRemove(file.key)} />
          )}
        </div>
        <Button
          className="shrink-0 mt-auto ml-2 leading-[30px] text-[13px]"
          disabled={disabled}
          onClick={onCommit}
        >
          {t('general.send')}
        </Button>
      </div>
    </div>
  );
}

interface MiniUploaderProps {
  className?: string;
  onUpload: (files: FileList) => void;
}

function MiniUploader({ className, onUpload }: MiniUploaderProps) {
  const $input = useRef<HTMLInputElement>(null!);
  const handleUpload = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (e) => {
      const files = e.target.files;
      if (files?.length) {
        onUpload(files);
        $input.current!.value = '';
      }
    },
    [onUpload]
  );

  return (
    <button
      className={cx('flex', className)}
      onClick={() => $input.current.click()}
      onTouchEnd={(e) => {
        e.preventDefault();
        $input.current.click();
      }}
    >
      <input className="hidden" type="file" ref={$input} onChange={handleUpload} />
      <AiOutlinePaperClip />
    </button>
  );
}

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
}

function Editor({ value, onChange, autoFocus, placeholder }: EditorProps) {
  const $editor = useRef<HTMLDivElement>(null!);
  useEffect(() => {
    $editor.current.innerText = value;
    if (autoFocus) {
      $editor.current.focus();
    }
  }, []);

  const $value = useRef(value);
  const handleChange = useCallback(
    (value: string) => {
      $value.current = value;
      onChange(value);
    },
    [onChange]
  );

  return (
    <div className="relative">
      {(!$value.current || $value.current === '\n') && placeholder && (
        <span className="absolute text-[#BFBFBF] pointer-events-none">{placeholder}</span>
      )}
      <div
        ref={$editor}
        contentEditable
        className="outline-none leading-4 my-[7px] whitespace-pre-line"
        onInput={(e) => handleChange((e.target as HTMLDivElement).innerText)}
      />
    </div>
  );
}
