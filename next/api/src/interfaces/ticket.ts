export interface TicketSearchDocument {
  objectId: string;
  title: string;
  content: string;
  categoryId: string;
  authorId: string;
  reporterId?: string;
  assigneeId?: string;
  groupId?: string;
  status: number;
  evaluation?: {
    star: number;
    ts?: string;
  };
  language?: string;
  joinedCustomerServiceIds?: string[];
  metaData?: {
    key: string;
    value: string;
  }[];
  tags?: {
    key: string;
    value: string;
  }[];
  privateTags?: {
    key: string;
    value: string;
  }[];
  fields?: {
    id: string;
    value: string | string[];
  }[];
  createdAt: string;
  updatedAt: string;
}

export type SyncTicketSearchDocumentJobData =
  | {
      type: 'syncById';
      ids: string[];
    }
  | {
      type: 'syncByRange';
      start?: string;
      end?: string;
      limit?: number;
      delay?: number;
    };

export interface SearchTicketFilters {
  authorId?: string;
  assigneeId?: (string | null)[];
  categoryId?: string[];
  groupId?: (string | null)[];
  reporterId?: (string | null)[];
  joinedCustomerServiceId?: string[];
  status?: number[];
  evaluationStar?: number;
  evaluationTs?: {
    from?: string;
    to?: string;
  };
  createdAt?: {
    from?: string;
    to?: string;
  };
  tags?: {
    key: string;
    value: string;
  }[];
  privateTags?: {
    key: string;
    value: string;
  }[];
  metaData?: {
    key: string;
    value: string;
  }[];
  language?: string[];
  fields?: {
    id: string;
    value: string;
  }[];
  keyword?: string;
}

export interface SearchTicketOptions {
  filters: SearchTicketFilters;
  sortField?: string;
  order?: 'asc' | 'desc';
  skip?: number;
  limit?: number;
}
