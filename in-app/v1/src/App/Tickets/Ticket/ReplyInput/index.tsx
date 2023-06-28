import { ChangeEventHandler, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import cx from 'classnames';

import { useAlert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { FileInfoWithKey, FileItems } from '@/components/FileItem';
import { useUpload } from '@/utils/useUpload';
import ClipIcon from '@/icons/Clip';

export interface ReplyData {
  content: string;
  fileIds: string[];
}

export interface ReplyInputProps {
  onCommit?: (data: ReplyData) => void | Promise<void>;
}

export function ReplyInput({ onCommit }: ReplyInputProps) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [content, setContent] = useState('');
  const alert = useAlert();
  const { files, isUploading, upload, remove, removeAll } = useUpload({
    onError: (e) =>
      alert({
        title: t('validation.attachment_too_big'),
        content: e.message,
      }),
  });

  const [isCommitting, setIsCommitting] = useState(false);
  const commitable = !isCommitting && !isUploading && (!!content.trim() || !!files.length);
  const handleCommit = async () => {
    if (onCommit) {
      setIsCommitting(true);
      try {
        await onCommit({ content, fileIds: files.map((f) => f.id!) });
        setContent('');
        setShow(false);
        removeAll();
      } finally {
        setIsCommitting(false);
      }
    }
  };

  return (
    <div
      className={cx(
        'sticky bottom-0 border-t border-gray-100 bg-[#FAFAFA] pb-[env(safe-area-inset-bottom)]',
        { invisible: show }
      )}
    >
      <div className="flex items-center px-3 py-2">
        <input
          className="grow leading-8 px-3 border rounded-full placeholder-[#BFBFBF] text-sm"
          placeholder={t('reply.input_content_hint')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onClick={() => setShow(true)}
        />
        <Button
          className="shrink-0 ml-2 leading-[30px] text-[13px]"
          disabled={!commitable}
          onClick={handleCommit}
        >
          {t('general.send')}
        </Button>
      </div>

      <Dialog className="fixed inset-0 z-50" open={show} onClose={() => setShow(false)}>
        <Dialog.Overlay className="fixed bg-[rgba(0,0,0,0.3)] inset-0" />
        <div className="fixed inset-x-0 bottom-0">
          <AdvancedReplyInput
            value={content}
            files={files}
            disabled={!commitable}
            onChange={setContent}
            onUpload={upload}
            onRemove={remove}
            onCommit={handleCommit}
          />
        </div>
      </Dialog>
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
      <ClipIcon className="m-auto text-tapBlue" />
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
