import mem from 'p-memoize';
import QuickLRU from 'quick-lru';

import { createQueue } from '@/queue';
import events from '@/events';
import { Reply } from '@/model/Reply';
import { Ticket } from '@/model/Ticket';
import { Trigger as TriggerModel } from '@/model/Trigger';

import { Action, Condition } from '..';
import { condition as conditionFactory } from './condition';
import { action as actionFactory } from './action';
import { TriggerContext, UpdatedData } from './context';

export class Trigger {
  constructor(private condition: Condition, private actions: Action[]) {}

  async exec(ctx: TriggerContext) {
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

async function runTriggers(ctx: TriggerContext) {
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
  if (isClosed(ctx.originalTicket.status) && ctx.data.status === undefined) {
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
  const ctx = new TriggerContext({
    event: 'created',
    ticket: Ticket.fromJSON(job.ticket),
    currentUserId: job.currentUserId,
  });
  await runTriggers(ctx);
}

async function processTicketUpdated(job: TicketUpdatedJob) {
  const ctx = new TriggerContext({
    event: 'updated',
    ticket: Ticket.fromJSON(job.ticket),
    currentUserId: job.currentUserId,
    updatedData: job.updateData,
  });
  await runTriggers(ctx);
}

async function processTicketReplied(job: TicketRepliedJob) {
  const ticket = await Ticket.find(job.reply.ticketId, { useMasterKey: true });
  if (!ticket || isClosed(ticket.status)) {
    return;
  }
  const ctx = new TriggerContext({
    event: 'replied',
    ticket,
    currentUserId: job.currentUserId,
    reply: Reply.fromJSON(job.reply),
  });
  await runTriggers(ctx);
}

// XXX: 这里还是排除了 PRE_FULFILLED
function isClosed(status: number): boolean {
  return status === Ticket.Status.FULFILLED || status === Ticket.Status.CLOSED;
}
