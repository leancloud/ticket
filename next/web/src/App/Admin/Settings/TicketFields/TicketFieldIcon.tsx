import { memo } from 'react';
import { IconType } from 'react-icons';
import {
  BsUiChecksGrid,
  BsCaretDownSquare,
  BsFileEarmarkArrowUp,
  BsInputCursorText,
  BsUiRadiosGrid,
  BsTextareaResize,
} from 'react-icons/bs';

import { TicketFieldSchema } from '@/api/ticket-field';

const icons: Record<TicketFieldSchema['type'], IconType> = {
  text: BsInputCursorText,
  'multi-line': BsTextareaResize,
  dropdown: BsCaretDownSquare,
  'multi-select': BsUiChecksGrid,
  radios: BsUiRadiosGrid,
  file: BsFileEarmarkArrowUp,
};

export interface TicketFieldIconProps {
  type: TicketFieldSchema['type'];
  className?: string;
}

export const TicketFieldIcon = memo(({ type, className }: TicketFieldIconProps) => {
  const Icon = icons[type];
  if (!Icon) {
    throw new Error(`[TicketFieldIcon] Unknown type: ${type}`);
  }
  return <Icon className={className} />;
});
