import { useMemo } from 'react';
import { isEmpty, pick } from 'lodash-es';

import {
  TicketDetailSchema,
  UpdateTicketData,
  useOperateTicket,
  useTicket,
  useUpdateTicket,
} from '@/api/ticket';
import { Ticket_v1, UpdateTicket_v1Data, useTicket_v1, useUpdateTicket_v1 } from './api1';

export interface MixedTicket {
  id: TicketDetailSchema['id'];
  nid: TicketDetailSchema['nid'];
  categoryId: TicketDetailSchema['categoryId'];
  author: TicketDetailSchema['author'];
  groupId: TicketDetailSchema['groupId'];
  assigneeId: TicketDetailSchema['assigneeId'];
  status: TicketDetailSchema['status'];
  title: TicketDetailSchema['title'];
  contentSafeHTML: TicketDetailSchema['contentSafeHTML'];
  files: TicketDetailSchema['files'];
  language: TicketDetailSchema['language'];
  createdAt: TicketDetailSchema['createdAt'];
  updatedAt: TicketDetailSchema['updatedAt'];

  // v1 properties
  private: Ticket_v1['private'];
  subscribed: Ticket_v1['subscribed'];
  tags: Ticket_v1['tags'];
  privateTags: Ticket_v1['private_tags'];
}

interface MixedUpdateData {
  categoryId?: UpdateTicketData['categoryId'];
  groupId?: UpdateTicketData['groupId'];
  assigneeId?: UpdateTicketData['assigneeId'];
  language?: UpdateTicketData['language'];
  tags?: UpdateTicketData['tags'];
  privateTags?: UpdateTicketData['privateTags'];

  // v1
  private?: UpdateTicket_v1Data['private'];
  subscribed?: UpdateTicket_v1Data['subscribed'];
}

interface UseMixedTicketResult {
  ticket?: MixedTicket;
  update: (data: MixedUpdateData) => void;
  updating: boolean;
  operate: (action: string) => void;
  operating: boolean;
}

export function useMixedTicket(ticketId: string): UseMixedTicketResult {
  const { data: ticket, refetch } = useTicket(ticketId, {
    include: ['author', 'files'],
  });
  const { data: ticket_v1, refetch: refetch_v1 } = useTicket_v1(ticket ? ticket.id : '', {
    enabled: !!ticket,
  });

  const { mutate: updateTicket, isLoading: ticketUpdating } = useUpdateTicket({
    onSuccess: (_, [_id, data]) => {
      refetch();
      if (data.tags || data.privateTags) {
        refetch_v1();
      }
    },
  });
  const { mutate: updateTicket_v1, isLoading: ticketUpdating_v1 } = useUpdateTicket_v1({
    onSuccess: () => {
      refetch_v1();
    },
  });

  const { mutate: operateTicket, isLoading: operating } = useOperateTicket({
    onSuccess: () => {
      refetch();
    },
  });

  const mixedTicket = useMemo<MixedTicket | undefined>(() => {
    if (ticket && ticket_v1) {
      return {
        id: ticket.id,
        nid: ticket.nid,
        categoryId: ticket.categoryId,
        author: ticket.author,
        groupId: ticket.groupId,
        assigneeId: ticket.assigneeId,
        status: ticket.status,
        title: ticket.title,
        contentSafeHTML: ticket.contentSafeHTML,
        files: ticket.files,
        language: ticket.language,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,

        private: ticket_v1.private,
        subscribed: ticket_v1.subscribed,
        tags: ticket_v1.tags,
        privateTags: ticket_v1.private_tags,
      };
    }
  }, [ticket, ticket_v1]);

  const update = (data: MixedUpdateData) => {
    const updateData = pick(data, [
      'categoryId',
      'groupId',
      'assigneeId',
      'language',
      'tags',
      'privateTags',
    ]);
    const updateData_v1 = pick(data, ['private', 'subscribed']);
    if (!isEmpty(updateData)) {
      updateTicket([ticketId, data]);
    }
    if (ticket && !isEmpty(updateData_v1)) {
      updateTicket_v1([ticket.id, updateData_v1]);
    }
  };

  return {
    ticket: mixedTicket,
    update,
    updating: ticketUpdating || ticketUpdating_v1,
    operate: (action) => operateTicket([ticketId, action]),
    operating,
  };
}
