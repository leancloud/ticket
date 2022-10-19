export interface ListTicketFormOptions {
  page: number;
  pageSize: number;
  orderBy: { key: string; order: 'asc' | 'desc' }[];
}

export interface TicketFormItem {
  type: 'field' | 'note';
  id: string;
}

export interface CreateTicketFormData {
  title: string;
  fieldIds?: string[];
  items?: TicketFormItem[];
}

export type UpdateTicketFormData = Partial<CreateTicketFormData>;
