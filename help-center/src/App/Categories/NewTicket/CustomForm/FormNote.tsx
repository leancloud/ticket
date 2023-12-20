import ReactMarkdown from 'react-markdown';
import { Form } from '@/components/antd';

export interface FormNoteProps {
  content: string;
}

export function FormNote({ content }: FormNoteProps) {
  return (
    <Form.Item>
      <ReactMarkdown className="markdown-body">{content}</ReactMarkdown>
    </Form.Item>
  );
}
