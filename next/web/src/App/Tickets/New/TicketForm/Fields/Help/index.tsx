import ReactMarkdown from 'react-markdown';

import style from './index.module.css';

export function Help({ content }: { content?: string }) {
  if (!content) {
    return null;
  }
  return <ReactMarkdown className={`markdown-body ${style.md}`}>{content}</ReactMarkdown>;
}
