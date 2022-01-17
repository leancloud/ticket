import throat from 'throat';
import { isEmpty } from 'lodash-es';
import { AxiosError } from 'axios';

import { http } from '@/leancloud';

export interface BatchReply {
  content: string;
}

export type Operation = 'close';

export interface BatchUpdateData {
  reply?: BatchReply;
  assigneeId?: string;
  groupId?: string;
  caregoryId?: string;
  operation?: Operation;
}

async function replyTicket(ticketId: string, reply: BatchReply) {
  try {
    await http.post(`/api/1/tickets/${ticketId}/replies`, {
      content: reply.content,
    });
  } catch (error) {
    const msg = (error as AxiosError).response?.data;
    throw new Error(`reply ticket ${ticketId} failed: ${JSON.stringify(msg)}`);
  }
}

async function updateTicket(ticketId: string, data: Omit<BatchUpdateData, 'reply'>) {
  try {
    await http.patch(`/api/1/tickets/${ticketId}`, {
      assignee_id: data.assigneeId,
      group_id: data.groupId,
      category_id: data.caregoryId,
    });
  } catch (error) {
    const msg = (error as AxiosError).response?.data;
    throw new Error(`update ticket ${ticketId} failed: ${JSON.stringify(msg)}`);
  }
}

async function operateTicket(ticketId: string, operation: Operation) {
  try {
    await http.post(`/api/1/tickets/${ticketId}/operate`, { action: operation });
  } catch (error) {
    const msg = (error as AxiosError).response?.data;
    throw new Error(`operate ticket ${ticketId} failed: ${JSON.stringify(msg)}`);
  }
}

export class BatchUpdateError extends Error {
  constructor(readonly errors: Error[]) {
    super(`${errors.length} tasks failed`);
  }
}

export interface BatchUpdateOptions {
  concurrency?: number;
}

export async function batchUpdate(
  ticketIds: string[],
  data: BatchUpdateData,
  options?: BatchUpdateOptions
) {
  if (ticketIds.length === 0 || isEmpty(data)) {
    return;
  }

  const { concurrency = 3 } = options ?? {};
  const runner = throat(concurrency);
  const tasks: ((...args: any[]) => Promise<any>)[] = [];
  const errors: Error[] = [];
  const errorHandler = (error: Error) => errors.push(error);

  if (data.reply) {
    const reply = data.reply;
    ticketIds.forEach((id) => {
      const task = () => replyTicket(id, reply).catch(errorHandler);
      tasks.push(task);
    });
  }

  if (data.assigneeId || data.groupId || data.caregoryId) {
    ticketIds.forEach((id) => {
      const task = () => updateTicket(id, data).catch(errorHandler);
      tasks.push(task);
    });
  }

  if (data.operation) {
    const op = data.operation;
    ticketIds.forEach((id) => {
      const task = () => operateTicket(id, op).catch(errorHandler);
      tasks.push(task);
    });
  }

  await Promise.all(tasks.map((task) => runner(task)));
  if (errors.length) {
    throw new BatchUpdateError(errors);
  }
}
