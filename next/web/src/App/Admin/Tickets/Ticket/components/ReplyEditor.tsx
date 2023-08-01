import { ClipboardEvent, Dispatch, SetStateAction, useMemo, useRef, useState } from 'react';
import { useDebounce } from 'react-use';
import { Button, Empty, Input, Radio, Select, Tabs } from 'antd';
import { AiOutlineFile } from 'react-icons/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { uniq } from 'lodash-es';

import { useQuickReplies } from '@/api/quick-reply';
import { storage, useCurrentUser } from '@/leancloud';
import { LoadingCover } from '@/components/common';
import { useHoverMenu } from '@/App/Admin/components/HoverMenu';
import { Uploader, UploaderRef } from '@/App/Admin/components/Uploader';
import { useModal } from './useModal';

interface ReplyInfo {
  internal: boolean;
  content: string;
  fileIds: string[];
}

interface ReplyEditorProps {
  onSubmit: (replyInfo: ReplyInfo) => Promise<void>;
  onOperate: (action: string) => void;
  operating?: boolean;
}

export function ReplyEditor({ onSubmit, onOperate, operating }: ReplyEditorProps) {
  const [mode, setType] = useState('public');
  const [content, setContent] = useState('');

  const uploaderRef = useRef<UploaderRef>(null!);

  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async () => {
    if (submitting) {
      return;
    }

    const { fileIds, uploading, hasError } = uploaderRef.current.getStatus();
    if (uploading) {
      return alert('请等待全部文件上传完毕');
    }
    if (hasError) {
      return alert('请移除上传失败的文件');
    }

    const trimedContent = content.trim();
    if (!trimedContent && fileIds.length === 0) {
      return alert('回复内容不能为空');
    }

    try {
      setSubmitting(true);
      await onSubmit({
        internal: mode === 'internal',
        content: trimedContent,
        fileIds,
      });
      setContent('');
      uploaderRef.current.reset();
    } finally {
      setSubmitting(false);
    }
  };

  const [quickReplyModal, toggleQuickReplyModal] = useModal({
    render: () => (
      <QuickReplyMenu
        onSelect={(content, fileIds) => {
          setContent(content);
          uploaderRef.current.reset(fileIds);
          toggleQuickReplyModal();
        }}
      />
    ),
    props: {
      title: '选择快捷回复',
      footer: null,
      destroyOnClose: true,
      bodyStyle: { padding: 0 },
    },
  });

  const internal = mode === 'internal';

  return (
    <div>
      <div className="mb-4">
        <Radio.Group value={mode} onChange={(e) => setType(e.target.value)}>
          <Radio value="public">公开</Radio>
          <Radio value="internal">内部</Radio>
        </Radio.Group>
      </div>

      <MarkdownEditor
        className="mb-2"
        value={content}
        onChange={setContent}
        internal={internal}
        onSubmit={handleSubmit}
        disabled={submitting}
      />

      <Uploader ref={uploaderRef} disabled={submitting} />

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={toggleQuickReplyModal}>插入快捷回复</Button>
        <div className="grow" />
        <Button disabled={operating} onClick={() => onOperate('replyWithNoContent')}>
          无需回复
        </Button>
        <Button disabled={operating} onClick={() => onOperate('replySoon')}>
          稍后回复
        </Button>
        <Button type="primary" onClick={handleSubmit} disabled={submitting}>
          {internal ? '提交内部留言' : '回复用户'}
        </Button>
      </div>

      {quickReplyModal}
    </div>
  );
}

interface MarkdownEditorProps {
  className?: string;
  value: string;
  onChange: Dispatch<SetStateAction<string>>;
  internal?: boolean;
  onSubmit: () => void;
  disabled?: boolean;
}

export function MarkdownEditor({
  className,
  value,
  onChange,
  internal,
  onSubmit,
  disabled,
}: MarkdownEditorProps) {
  const editorHeight = useRef(0);

  const handlePasteFile = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = e.clipboardData.files;
    if (!files.length) return;
    const file = files[0];
    const placeholder = `![${file.name}](uploading)`;
    const { selectionStart, selectionEnd } = e.currentTarget;
    const nextValue = value.slice(0, selectionStart) + placeholder + value.slice(selectionEnd);
    onChange(nextValue);
    storage
      .upload(file.name, file)
      .then((lcFile) => {
        const fileUrl = `![${file.name}](${lcFile.url})`;
        onChange((value) => value.replace(placeholder, fileUrl));
      })
      .catch(() => {
        onChange((value) => value.replace(placeholder, '[上传失败]'));
      });
  };

  return (
    <div className={className}>
      <Tabs
        type="card"
        items={[
          {
            key: 'edit',
            label: '编辑',
            children: (
              <Input.TextArea
                autoSize={{ minRows: 5, maxRows: 15 }}
                ref={(ref) => {
                  const el = ref?.resizableTextArea?.textArea;
                  if (el) {
                    editorHeight.current = el.offsetHeight;
                  }
                }}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.metaKey && e.key === 'Enter') {
                    onSubmit();
                  }
                }}
                onPaste={handlePasteFile}
                disabled={disabled}
                style={{
                  minHeight: 124,
                  backgroundColor: internal ? '#ffc10733' : '#fff',
                }}
              />
            ),
          },
          {
            key: 'preview',
            label: '预览',
            children: (
              <div className="p-2" style={{ minHeight: editorHeight.current || 124 }}>
                <ReactMarkdown
                  className="markdown-body"
                  linkTarget="_blank"
                  remarkPlugins={[remarkGfm]}
                >
                  {value.trim() || '没有什么可以预览的'}
                </ReactMarkdown>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

interface QuickReplyMenuProps {
  onSelect: (content: string, fileIds?: string[]) => void;
}

function QuickReplyMenu({ onSelect }: QuickReplyMenuProps) {
  const currentUser = useCurrentUser();
  const { data, isLoading } = useQuickReplies({
    userId: [currentUser?.id, 'null'].join(','),
  });

  const [tag, setTag] = useState<string>();
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  useDebounce(() => setDebouncedKeyword(keyword), 200, [keyword]);

  const filteredQuickReplies = useMemo(() => {
    if (!data) {
      return [];
    }
    let filteredQuickReplies = data;
    if (tag) {
      filteredQuickReplies = filteredQuickReplies.filter((qr) => qr.tags?.includes(tag));
    }
    if (debouncedKeyword) {
      filteredQuickReplies = filteredQuickReplies.filter((qr) => {
        return qr.name.includes(debouncedKeyword) || qr.content.includes(debouncedKeyword);
      });
    }
    return filteredQuickReplies;
  }, [data, tag, debouncedKeyword]);

  const tagOptions = useMemo(() => {
    if (!data) {
      return [];
    }
    const tags = data.flatMap((qr) => qr.tags || []);
    return uniq(tags).map((tag) => ({ label: tag, value: tag }));
  }, [data]);

  const { hover, menu } = useHoverMenu<string>({
    render: (content) => (
      <div className="max-w-[400px] bg-white p-2 shadow border rounded">{content}</div>
    ),
  });

  return (
    <div className="flex flex-col min-h-[400px] max-h-[calc(100vh-255px)] relative">
      <div className="grid grid-cols-2 gap-1.5 p-2 border-b">
        <Select
          allowClear
          showSearch
          placeholder="标签"
          options={tagOptions}
          value={tag}
          onChange={setTag}
        />
        <Input
          allowClear
          placeholder="关键词"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>
      {isLoading && <LoadingCover />}
      {filteredQuickReplies.length ? (
        <div className="divide-y overflow-y-auto">
          {filteredQuickReplies.map((qr) => (
            <div key={qr.id} className="flex px-4 py-3" {...hover(qr.content)}>
              <a className="block" onClick={() => onSelect(qr.content, qr.fileIds)}>
                {qr.name}
              </a>
              {qr.fileIds && qr.fileIds.length > 0 && (
                <div className="flex items-center ml-auto">
                  <AiOutlineFile className="w-4 h-4 mx-1" />
                  <div className="font-mono">{qr.fileIds.length}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty style={{ margin: 'auto' }} />
      )}
      {menu}
    </div>
  );
}
