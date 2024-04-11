import { useMemo } from 'react';
import { Tooltip } from 'antd';

export interface CustomFieldGridProps {
  content: string | string[];
}

export function CustomFieldGrid({ content }: CustomFieldGridProps) {
  const text = useMemo(() => {
    if (Array.isArray(content)) {
      return content.join(',');
    }
    return content;
  }, [content]);
  return (
    <Tooltip title={text}>
      <div className="inline-block max-w-[400px] truncate">{text}</div>
    </Tooltip>
  );
}
