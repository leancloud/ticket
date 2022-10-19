import { z } from 'zod';

export const createTicketFormNoteSchema = z.object({
  title: z.string(),
  content: z.string(),
});

export const updateTicketFormNoteSchema = createTicketFormNoteSchema
  .extend({
    active: z.boolean(),
  })
  .partial();
