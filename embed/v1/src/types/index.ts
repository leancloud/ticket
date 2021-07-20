export interface Category {
  id: string;
  name: string;
  parentId?: string;
  position: number;
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

export interface Ticket {
  id: string;
  nid: number;
  title: string;
  content: string;
  status: number;
  files: File[];
  evaluation: Evaluation | null;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reply {
  id: string;
  content: string;
  isStaff: boolean;
  files: File[];
  createdAt: Date;
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
