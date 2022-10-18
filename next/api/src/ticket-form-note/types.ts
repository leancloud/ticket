export interface ListTicketFormNoteOptions {
  page: number;
  pageSize: number;
  active?: boolean;
}

export interface CreateTicketFormNoteData {
  title: string;
  content: string;
}

export interface UpdateTicketFormNoteData extends Partial<CreateTicketFormNoteData> {
  active?: boolean;
}
