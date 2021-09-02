import { TicketFilterSchema } from 'api/ticket-filter';

export const presetFilters: TicketFilterSchema[] = [
  {
    id: '',
    name: '所有工单',
    filters: {},
  },
  {
    id: 'unResolvedTickets',
    name: '所有未解决的工单',
    filters: {
      statuses: [50, 120, 160],
    },
  },
];
