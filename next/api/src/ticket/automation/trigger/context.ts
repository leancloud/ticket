import { Ticket } from '@/model/Ticket';

import { Context } from '../context';

export type TriggerEvent = 'created' | 'updated' | 'replied';

export interface TriggerContextConfig {
  ticket: Ticket;
  event: TriggerEvent;
  currentUserId: string;
}

export class TriggerContext extends Context {
  readonly event: TriggerEvent;
  readonly currentUserId: string;

  constructor(config: TriggerContextConfig) {
    super(config.ticket);
    this.event = config.event;
    this.currentUserId = config.currentUserId;
  }
}
