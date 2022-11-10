import ReactMarkdown from 'react-markdown';

export interface FormNoteProps {
  content: string;
}

export function FormNote({ content }: FormNoteProps) {
  return (
    <div>
      <ReactMarkdown className="markdown-body text-[rgba(0,0,0,0.45)] text-base">
        {content}
      </ReactMarkdown>
    </div>
  );
}
