import { Help } from './Fields/Help';

export interface FormNoteProps {
  content: string;
}

export function FormNote({ content }: FormNoteProps) {
  return (
    <div className="mb-4">
      <Help content={content} />
    </div>
  );
}
