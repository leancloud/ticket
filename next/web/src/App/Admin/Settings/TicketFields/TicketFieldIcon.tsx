import { memo } from 'react';
import { IconType } from 'react-icons';
import {
  BsUiChecksGrid,
  BsCaretDownSquare,
  BsFileEarmarkArrowUp,
  BsInputCursorText,
  BsUiRadiosGrid,
  BsTextareaResize,
  BsCalendarDate,
} from 'react-icons/bs';
import { RiNumber6 } from 'react-icons/ri';

import { TicketFieldSchema } from '@/api/ticket-field';

const icons: Record<TicketFieldSchema['type'], IconType> = {
  text: BsInputCursorText,
  'multi-line': BsTextareaResize,
  dropdown: BsCaretDownSquare,
  'multi-select': BsUiChecksGrid,
  radios: BsUiRadiosGrid,
  file: BsFileEarmarkArrowUp,
  date: BsCalendarDate,
  number: RiNumber6,
};

export interface TicketFieldIconProps {
  type: TicketFieldSchema['type'];
  className?: string;
}

export const TicketFieldIcon = memo(({ type, className }: TicketFieldIconProps) => {
  const Icon = icons[type];
  if (!Icon) {
    return null;
  }
  return <Icon className={className} />;
});
