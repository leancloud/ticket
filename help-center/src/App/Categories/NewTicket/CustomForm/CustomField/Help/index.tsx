import ReactMarkdown, { Components } from 'react-markdown';

import style from './index.module.css';

const components: Components = {
  a: ({ node, ...props }) => <a {...props} target="_blank" />,
};

export function Help({ content }: { content?: string }) {
  if (!content) {
    return null;
  }
  return (
    <ReactMarkdown className={`markdown-body text-sm ${style.md}`} components={components}>
      {content}
    </ReactMarkdown>
  );
}
