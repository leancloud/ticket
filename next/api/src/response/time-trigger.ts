import { TimeTrigger } from '@/model/TimeTrigger';

export class TimeTriggerResponse {
  constructor(readonly automation: TimeTrigger) {}

  toJSON() {
    return {
      id: this.automation.id,
      title: this.automation.title,
      description: this.automation.description ?? '',
      conditions: this.automation.conditions,
      actions: this.automation.actions,
      position: this.automation.getPosition(),
      active: this.automation.active,
    };
  }
}
