import throat from 'throat';

import { OpsLog } from '@/model/OpsLog';
import { Ticket } from '@/model/Ticket';
import { TimeTrigger as TimeTriggerModel } from '@/model/TimeTrigger';

import { Condition } from '../condition';
import { Action } from '../action';
import { TimeTriggerContext } from './context';
import { condition as conditionFactory } from './condition';
import { action as actionFactory } from './action';

export class TimeTrigger {
  id: string;
  fired = false;

  private condition: Condition;
  private actions: Action[];

  constructor(data: TimeTriggerModel) {
    this.id = data.id;
    this.condition = conditionFactory(data.conditions);
    this.actions = data.actions.map(actionFactory);
  }

  async exec(ctx: TimeTriggerContext) {
    if (await this.condition.test(ctx)) {
      for (const action of this.actions) {
        await action.exec(ctx);
      }
      this.fired = true;
    }
  }
}

function getOpenTickets(): Promise<Ticket[]> {
  return Ticket.queryBuilder()
    .where('status', '<', Ticket.STATUS.FULFILLED)
    .orderBy('objectId', 'asc')
    .limit(1000)
    .find({ useMasterKey: true });
}

async function getTimeTriggerDatas(): Promise<TimeTriggerModel[]> {
  const timeTriggers = await TimeTriggerModel.queryBuilder()
    .where('active', '==', true)
    .find({ useMasterKey: true });
  return timeTriggers.sort((a, b) => a.getPosition() - b.getPosition());
}

export async function getTimeTriggers() {
  const datas = await getTimeTriggerDatas();
  const timeTriggers: TimeTrigger[] = [];
  datas.forEach((data) => {
    try {
      timeTriggers.push(new TimeTrigger(data));
    } catch (error: any) {
      console.warn(`[WARN] [TimeTrigger] ${data.id} is invalid: ${error.message}`);
    }
  });
  return timeTriggers;
}

async function createTimeTriggerContext(ticket: Ticket): Promise<TimeTriggerContext> {
  const opsLogs = await OpsLog.queryBuilder()
    .where('ticket', '==', ticket.toPointer())
    .orderBy('createdAt', 'asc')
    .find({ useMasterKey: true });
  return new TimeTriggerContext({ ticket, opsLogs });
}

export interface Report {
  timeTriggerIds: string[];
  firedTicketIds: string[];
  skipTicketIds: string[];
}

export async function execTimeTriggers(): Promise<Report> {
  const [tickets, triggers] = await Promise.all([getOpenTickets(), getTimeTriggers()]);
  const report: Report = {
    timeTriggerIds: triggers.map((t) => t.id),
    firedTicketIds: [],
    skipTicketIds: [],
  };

  const task = async (ticket: Ticket) => {
    const ctx = await createTimeTriggerContext(ticket);
    for (const trigger of triggers) {
      await trigger.exec(ctx);
      if (trigger.fired) {
        report.firedTicketIds.push(ticket.id);
      } else {
        report.skipTicketIds.push(ticket.id);
      }
    }
  };
  const exec = throat(2);
  await Promise.allSettled(tickets.map((ticket) => exec(() => task(ticket))));

  return report;
}
