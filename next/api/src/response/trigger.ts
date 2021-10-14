import { Trigger } from '@/model/Trigger';

export class TriggerResponse {
  constructor(readonly trigger: Trigger) {}

  toJSON() {
    return {
      id: this.trigger.id,
      title: this.trigger.title,
      description: this.trigger.description ?? '',
      conditions: this.trigger.conditions,
      actions: this.trigger.actions,
      position: this.trigger.getPosition(),
      active: this.trigger.active,
    };
  }
}
