import { z } from 'zod';

export const ticketFormItemSchema = z.object({
  type: z.enum(['field', 'note']),
  id: z.string().nonempty(),
});

export const createTicketFormSchema = z.object({
  title: z.string().nonempty(),
  fieldIds: z.array(z.string()).nonempty().optional(),
  items: z
    .array(ticketFormItemSchema)
    .nonempty()
    .refine((items) => items.findIndex((item) => item.type === 'field') >= 0, {
      message: 'should contain at least one field',
    })
    .optional(),
});

export const updateTicketFormSchema = createTicketFormSchema.partial();
