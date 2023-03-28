import { z } from 'zod';
import {
  createTicketFormNoteTranslationSchema,
  updateTicketFormNoteTranslationSchema,
} from './schemas';

export interface ListTicketFormNoteOptions {
  page: number;
  pageSize: number;
  active?: boolean;
}

export interface CreateTicketFormNoteData {
  name: string;
  content: string;
  language: string;
}

export interface UpdateTicketFormNoteData
  extends Partial<Omit<CreateTicketFormNoteData, 'content' | 'language'>> {
  active?: boolean;
  defaultLanguage?: string;
}

export type CreateTicketFormNoteTranslationData = z.infer<
  typeof createTicketFormNoteTranslationSchema
>;

export type UpdateTicketFormNoteTranslationData = z.infer<
  typeof updateTicketFormNoteTranslationSchema
>;
