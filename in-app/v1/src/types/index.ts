export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  contentSafeHTML: string;
  createdAt: string;
  updatedAt: string;
}

export interface File {
  id: string;
  name: string;
  mime: string;
  url: string;
}

export interface Evaluation {
  star: 0 | 1;
  content: string;
}

export interface TicketListItem {
  id: string;
  nid: number;
  title: string;
  status: number;
  files?: File[];
  evaluation: Evaluation | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}
export interface Ticket extends TicketListItem {
  contentSafeHTML: string;
}

export interface Reply {
  id: string;
  contentSafeHTML: string;
  isCustomerService: boolean;
  files?: File[];
  createdAt: string;
}

interface FieldOption {
  title: string;
  value: string;
  required: boolean;
}

interface BasicField {
  id: string;
  title: string;
  type: string;
}

export interface DropdownField extends BasicField {
  type: 'dropdown';
  options: FieldOption[];
}

export interface TextField extends BasicField {
  type: 'text';
}

export interface MultiLineField extends BasicField {
  type: 'multi-line';
}

export interface MultiSelectField extends BasicField {
  type: 'multi-select';
  options: FieldOption[];
}

export interface RadiosField extends BasicField {
  type: 'radios';
  options: FieldOption[];
}

export type Field = DropdownField | TextField | MultiLineField | MultiSelectField | RadiosField;
