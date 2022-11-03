import { useState } from 'react';
import { Button, Divider, Input } from '@/components/antd';

interface ReplyEditorProps {
  onOperate: (action: string) => void;
  operating: boolean;
}

export function ReplyEditor({ onOperate, operating }: ReplyEditorProps) {
  const [content, setContent] = useState('');

  return (
    <div>
      <Divider />
      <Input.TextArea
        autoSize
        placeholder="暂不可用"
        value={content}
        // onChange={(e) => setContent(e.target.value)}
        style={{ minHeight: 100 }}
      />
      <div className="flex mt-4 gap-2">
        <Button disabled>插入快捷回复</Button>
        <div className="grow" />
        <Button disabled={operating} onClick={() => onOperate('replyWithNoContent')}>
          无需回复
        </Button>
        <Button disabled={operating} onClick={() => onOperate('replySoon')}>
          稍后回复
        </Button>
        <Button type="primary" disabled={!content}>
          回复用户
        </Button>
      </div>
    </div>
  );
}
