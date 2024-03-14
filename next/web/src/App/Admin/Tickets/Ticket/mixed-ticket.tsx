import { useEffect, useMemo } from 'react';
import { isEmpty, pick } from 'lodash-es';
import { LCObject } from 'open-leancloud-storage/core';

import { db } from '@/leancloud';
import { TicketDetailSchema, UpdateTicketData, useTicket, useUpdateTicket } from '@/api/ticket';
import { Ticket_v1, UpdateTicket_v1Data, useTicket_v1, useUpdateTicket_v1 } from './api1';
import { useEffectEvent } from '@/utils/useEffectEvent';

interface MixedTicket {
  id: TicketDetailSchema['id'];
  nid: TicketDetailSchema['nid'];
  categoryId: TicketDetailSchema['categoryId'];
  author: TicketDetailSchema['author'];
  authorId: TicketDetailSchema['authorId'];
  groupId: TicketDetailSchema['groupId'];
  assigneeId: TicketDetailSchema['assigneeId'];
  status: TicketDetailSchema['status'];
  title: TicketDetailSchema['title'];
  content: TicketDetailSchema['content'];
  contentSafeHTML: TicketDetailSchema['contentSafeHTML'];
  files: TicketDetailSchema['files'];
  language: TicketDetailSchema['language'];
  evaluation: TicketDetailSchema['evaluation'];
  metaData: TicketDetailSchema['metaData'];
  createdAt: TicketDetailSchema['createdAt'];
  updatedAt: TicketDetailSchema['updatedAt'];

  // v1 properties
  private: Ticket_v1['private'];
  subscribed: Ticket_v1['subscribed'];
  tags: Ticket_v1['tags'];
  privateTags: Ticket_v1['private_tags'];
}

interface MixedUpdateData {
  title?: UpdateTicketData['title'];
  content?: UpdateTicketData['content'];
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
  update: (data: MixedUpdateData) => Promise<void>;
  updating: boolean;
  refetch: () => void;
}

export function useMixedTicket(ticketId: string): UseMixedTicketResult {
  const { data: ticket, refetch } = useTicket(ticketId, {
    include: ['author', 'files'],
  });
  const { data: ticket_v1, refetch: refetch_v1 } = useTicket_v1(ticket ? ticket.id : '', {
    enabled: !!ticket,
  });

  const { mutateAsync: updateTicket, isLoading: ticketUpdating } = useUpdateTicket({
    onSuccess: (_, [_id, data]) => {
      refetch();
      if (data.tags || data.privateTags) {
        refetch_v1();
      }
    },
  });
  const { mutateAsync: updateTicket_v1, isLoading: ticketUpdating_v1 } = useUpdateTicket_v1({
    onSuccess: () => {
      refetch_v1();
    },
  });

  const mixedTicket = useMemo<MixedTicket | undefined>(() => {
    if (ticket && ticket_v1) {
      return {
        id: ticket.id,
        nid: ticket.nid,
        categoryId: ticket.categoryId,
        author: ticket.author,
        authorId: ticket.authorId,
        groupId: ticket.groupId,
        assigneeId: ticket.assigneeId,
        status: ticket.status,
        title: ticket.title,
        content: ticket.content,
        contentSafeHTML: ticket.contentSafeHTML,
        files: ticket.files,
        language: ticket.language,
        evaluation: ticket.evaluation,
        metaData: ticket.metaData,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,

        private: ticket_v1.private,
        subscribed: ticket_v1.subscribed,
        tags: ticket_v1.tags,
        privateTags: ticket_v1.private_tags,
      };
    }
  }, [ticket, ticket_v1]);

  const update = async (data: MixedUpdateData) => {
    if (!ticket) {
      return;
    }
    const updateData = pick(data, [
      'title',
      'content',
      'categoryId',
      'groupId',
      'assigneeId',
      'language',
      'tags',
      'privateTags',
    ]);
    const updateData_v1 = pick(data, ['private', 'subscribed']);
    if (!isEmpty(updateData)) {
      await updateTicket([ticket.id, updateData]);
    }
    if (!isEmpty(updateData_v1)) {
      await updateTicket_v1([ticket.id, updateData_v1]);
    }
  };

  const onUpdate = useEffectEvent((ticketObj: LCObject) => {
    if (!ticket) {
      return;
    }
    if (new Date(ticketObj.updatedAt) > new Date(ticket.updatedAt)) {
      refetch();
      refetch_v1();
    }
  });

  useEffect(() => {
    if (!ticket) {
      return;
    }
    let mounted = true;
    const subscription = db.query('Ticket').where('objectId', '==', ticket.id).subscribe();
    subscription.then((s) => {
      if (mounted) {
        s.on('update', onUpdate);
      }
    });

    return () => {
      subscription.then((s) => s.unsubscribe());
      mounted = false;
    };
  }, [ticket?.id]);

  return {
    ticket: mixedTicket,
    update,
    updating: ticketUpdating || ticketUpdating_v1,
    refetch,
  };
}
