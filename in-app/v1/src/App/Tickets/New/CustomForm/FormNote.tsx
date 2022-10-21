import ReactMarkdown from 'react-markdown';

export interface FormNoteProps {
  title: string;
  content: string;
}

export function FormNote({ title, content }: FormNoteProps) {
  return (
    <div className="mb-5">
      <div className="mb-2">{title}</div>
      <ReactMarkdown className="markdown-body text-[rgba(0,0,0,0.45)] text-sm">
        {content}
      </ReactMarkdown>
    </div>
  );
}
