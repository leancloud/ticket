import mem from 'mem';
import QuickLRU from 'quick-lru';

import { createQueue } from '@/queue';
import events from '@/events';
import { Reply } from '@/model/Reply';
import { Ticket } from '@/model/Ticket';
import { Trigger as TriggerModel } from '@/model/Trigger';

import { Action, Condition } from '..';
import { condition as conditionFactory } from './condition';
import { action as actionFactory } from './action';
import { Context, UpdatedData } from '../context';

class TicketCreatedContext extends Context {
  constructor(ticketSnapshot: any, currentUserId: string) {
    super('created', Ticket.fromJSON(ticketSnapshot), currentUserId);
  }
}

class TicketUpdatedContext extends Context {
  constructor(ticketSnapshot: any, currentUserId: string, updatedData: UpdatedData) {
    super('updated', Ticket.fromJSON(ticketSnapshot), currentUserId);
    this.updatedData = updatedData;
  }
}

class TicketRepliedContext extends Context {
  constructor(ticket: Ticket, currentUserId: string, replySnapshot: any) {
    super('replied', ticket, currentUserId);
    this.reply = Reply.fromJSON(replySnapshot);
  }
}

export class Trigger {
  constructor(private condition: Condition, private actions: Action[]) {}

  async exec(ctx: Context) {
    if (await this.condition.test(ctx)) {
      for (const action of this.actions) {
        await action.exec(ctx);
      }
    }
  }
}

export function createTrigger(data: TriggerModel): Trigger {
  const condition = conditionFactory(data.conditions);
  const actions = data.actions.map(actionFactory);
  return new Trigger(condition, actions);
}

async function fetchTriggers(): Promise<Trigger[]> {
  const triggerDatas = await TriggerModel.queryBuilder()
    .where('active', '==', true)
    .find({ useMasterKey: true });
  triggerDatas.sort((a, b) => a.getPosition() - b.getPosition());

  const triggers: Trigger[] = [];
  triggerDatas.map((data) => {
    try {
      triggers.push(createTrigger(data));
    } catch (error: any) {
      console.warn(`[WARN] [Trigger] Trigger ${data.id} is invalid: ${error.message}`);
    }
  });
  return triggers;
}

const cache = new QuickLRU<string, any>({ maxSize: 1 });

export const getTriggers = mem(
  async () => {
    try {
      return await fetchTriggers();
    } catch (error) {
      cache.clear();
      throw error;
    }
  },
  {
    cache,
    maxAge: 1000 * 60,
  }
);

async function runTriggers(ctx: Context) {
  const triggers = await getTriggers();
  for (const trigger of triggers) {
    await trigger.exec(ctx);
  }
  await ctx.finish();
}

interface TicketCreatedJob {
  event: 'created';
  currentUserId: string;
  ticket: any;
}

interface TicketUpdatedJob {
  event: 'updated';
  currentUserId: string;
  ticket: any;
  updateData: UpdatedData;
}

interface TicketRepliedJob {
  event: 'replied';
  currentUserId: string;
  reply: any;
}

type JobData = TicketCreatedJob | TicketUpdatedJob | TicketRepliedJob;

const queue = createQueue<JobData>('trigger', {
  limiter: {
    max: 100,
    duration: 5000,
  },
  defaultJobOptions: {
    removeOnComplete: true,
  },
});

events.on('ticket:created', (ctx) => {
  queue.add({
    event: 'created',
    currentUserId: ctx.currentUserId,
    ticket: ctx.ticket,
  });
});

events.on('ticket:updated', (ctx) => {
  if (ctx.ignoreTrigger) {
    return;
  }
  if (ctx.originalTicket.status === Ticket.STATUS.CLOSED && ctx.data.status === undefined) {
    // 已关闭的工单不会触发触发器，但在被关闭时仍会触发触发器
    return;
  }
  queue.add({
    event: 'updated',
    currentUserId: ctx.currentUserId,
    ticket: ctx.originalTicket,
    updateData: ctx.data,
  });
});

events.on('reply:created', (ctx) => {
  queue.add({
    event: 'replied',
    currentUserId: ctx.currentUserId,
    reply: ctx.reply,
  });
});

queue.process((job) => {
  switch (job.data.event) {
    case 'created':
      return processTicketCreated(job.data);
    case 'updated':
      return processTicketUpdated(job.data);
    case 'replied':
      return processTicketReplied(job.data);
  }
});

async function processTicketCreated(job: TicketCreatedJob) {
  await runTriggers(new TicketCreatedContext(job.ticket, job.currentUserId));
}

async function processTicketUpdated(job: TicketUpdatedJob) {
  await runTriggers(new TicketUpdatedContext(job.ticket, job.currentUserId, job.updateData));
}

async function processTicketReplied(job: TicketRepliedJob) {
  const ticket = await Ticket.find(job.reply.ticketId, { useMasterKey: true });
  if (!ticket || ticket.status === Ticket.STATUS.CLOSED) {
    return;
  }
  await runTriggers(new TicketRepliedContext(ticket, job.currentUserId, job.reply));
}
