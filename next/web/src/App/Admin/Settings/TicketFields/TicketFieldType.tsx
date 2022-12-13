import { ComponentPropsWithoutRef, memo } from 'react';

import { TicketFieldSchema } from '@/api/ticket-field';

const fieldTypeText: Record<TicketFieldSchema['type'], string> = {
  text: '单行文本',
  'multi-line': '多行文本',
  dropdown: '下拉框',
  'multi-select': '多选框',
  radios: '单选框',
  file: '文件',
  number: '数字',
  date: '日期',
};

export interface TicketFieldTypeProps extends ComponentPropsWithoutRef<'span'> {
  type: TicketFieldSchema['type'];
}

export const TicketFieldType = memo(({ type, ...props }: TicketFieldTypeProps) => {
  return <span {...props}>{fieldTypeText[type] ?? 'unknown'}</span>;
});
