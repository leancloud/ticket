import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button, Divider, Input, Radio, Tabs } from 'antd';

import { useTicketContext } from '../TicketContext';

interface ReplyInfo {
  internal: boolean;
  content: string;
  fileIds: string[];
}

interface ReplyEditorProps {
  onSubmit: (replyInfo: ReplyInfo) => void;
}

export function ReplyEditor({ onSubmit }: ReplyEditorProps) {
  const { operate, operating } = useTicketContext();

  const [mode, setType] = useState('public');
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    const trimedContent = content.trim();
    if (!trimedContent) {
      return alert('回复内容不能为空');
    }

    onSubmit({
      internal: mode === 'internal',
      content: content.trim(),
      fileIds: [],
    });
  };

  const internal = mode === 'internal';

  return (
    <div>
      <Divider />

      <div className="my-5">
        <Radio.Group value={mode} onChange={(e) => setType(e.target.value)}>
          <Radio value="public">公开</Radio>
          <Radio value="internal">内部</Radio>
        </Radio.Group>
      </div>

      <MarkdownEditor value={content} onChange={setContent} internal={internal} />

      <div className="flex mt-4 gap-2">
        <Button disabled>插入快捷回复</Button>
        <div className="grow" />
        <Button disabled={operating} onClick={() => operate('replyWithNoContent')}>
          无需回复
        </Button>
        <Button disabled={operating} onClick={() => operate('replySoon')}>
          稍后回复
        </Button>
        <Button type="primary" onClick={handleSubmit}>
          {internal ? '提交内部留言' : '回复用户'}
        </Button>
      </div>
    </div>
  );
}

interface MarkdownEditorProps {
  className?: string;
  value: string;
  onChange: (value: string) => void;
  internal?: boolean;
}

function MarkdownEditor({ className, value, onChange, internal }: MarkdownEditorProps) {
  const editorHeight = useRef(0);

  return (
    <div className={className}>
      <Tabs type="card">
        <Tabs.TabPane tab="编辑" key="edit">
          <Input.TextArea
            autoSize
            ref={(ref) => {
              const el = ref?.resizableTextArea?.textArea;
              if (el) {
                editorHeight.current = el.offsetHeight;
              }
            }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              minHeight: 100,
              backgroundColor: internal ? '#ffc10733' : '#fff',
            }}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab="预览" key="preview">
          <div style={{ minHeight: editorHeight.current || 100 }}>
            <ReactMarkdown className="markdown-body">
              {value.trim() || '没有什么可以预览的'}
            </ReactMarkdown>
          </div>
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
}
