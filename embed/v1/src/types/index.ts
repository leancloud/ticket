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
