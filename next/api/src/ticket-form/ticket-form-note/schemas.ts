import { localeSchema } from '@/utils/locale';
import { z } from 'zod';

export const createTicketFormNoteSchema = z.object({
  name: z.string(),
  content: z.string(),
  language: localeSchema,
});

export const updateTicketFormNoteSchema = createTicketFormNoteSchema
  .omit({ language: true, content: true })
  .extend({
    active: z.boolean(),
    defaultLanguage: localeSchema,
  })
  .partial();

export const createTicketFormNoteTranslationSchema = z.object({
  content: z.string(),
  language: localeSchema,
});

export const updateTicketFormNoteTranslationSchema = createTicketFormNoteTranslationSchema
  .omit({ language: true })
  .extend({ active: z.boolean() })
  .partial();
