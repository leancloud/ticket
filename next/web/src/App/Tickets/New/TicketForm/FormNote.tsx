import { Help } from './Fields/Help';

export interface FormNoteProps {
  title: string;
  content: string;
}

export function FormNote({ title, content }: FormNoteProps) {
  return (
    <div className="mb-4">
      <div className="font-bold mb-1">{title}</div>
      <Help content={content} />
    </div>
  );
}
