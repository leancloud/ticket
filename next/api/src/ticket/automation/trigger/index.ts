import { createQueue } from '@/queue';
import events from '@/events';
import mem from '@/utils/mem-promise';
import { Reply } from '@/model/Reply';
import { Ticket } from '@/model/Ticket';
import { Trigger as TriggerModel } from '@/model/Trigger';

import { Action, Condition } from '..';
import { condition as conditionFactory } from './condition';
import { action as actionFactory } from './action';
import { TriggerContext } from './context';

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

export const getTriggers = mem(fetchTriggers, { max: 1, ttl: 1000 * 60 });

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
  ticketId: string;
}

interface TicketUpdatedJob {
  event: 'updated';
  currentUserId: string;
  ticketId: string;
}

interface TicketRepliedJob {
  event: 'replied';
  currentUserId: string;
  ticketId: string;
  replyId: string;
}

type JobData = TicketCreatedJob | TicketUpdatedJob | TicketRepliedJob;

const queue = createQueue<JobData>('trigger:v2', {
  limiter: {
    max: 100,
    duration: 5000,
  },
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
  },
});

events.on('ticket:created', (ctx) => {
  queue.add({
    event: 'created',
    currentUserId: ctx.currentUserId,
    ticketId: ctx.ticket.id,
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
    ticketId: ctx.originalTicket.id,
  });
});

events.on('reply:created', (ctx) => {
  queue.add({
    event: 'replied',
    currentUserId: ctx.currentUserId,
    ticketId: ctx.reply.ticketId,
    replyId: ctx.reply.id,
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
  const ticket = await Ticket.find(job.ticketId, { useMasterKey: true });
  if (!ticket) {
    return;
  }
  const ctx = new TriggerContext({
    event: 'created',
    ticket,
    currentUserId: job.currentUserId,
  });
  await runTriggers(ctx);
}

async function processTicketUpdated(job: TicketUpdatedJob) {
  const ticket = await Ticket.find(job.ticketId, { useMasterKey: true });
  if (!ticket) {
    return;
  }
  const ctx = new TriggerContext({
    event: 'updated',
    ticket,
    currentUserId: job.currentUserId,
  });
  await runTriggers(ctx);
}

async function processTicketReplied(job: TicketRepliedJob) {
  const ticket = await Ticket.find(job.ticketId, { useMasterKey: true });
  if (!ticket || isClosed(ticket.status)) {
    return;
  }
  const reply = await Reply.find(job.replyId, { useMasterKey: true });
  const ctx = new TriggerContext({
    event: 'replied',
    ticket,
    currentUserId: job.currentUserId,
    reply,
  });
  await runTriggers(ctx);
}

// XXX: 这里还是排除了 PRE_FULFILLED
function isClosed(status: number): boolean {
  return status === Ticket.Status.FULFILLED || status === Ticket.Status.CLOSED;
}
