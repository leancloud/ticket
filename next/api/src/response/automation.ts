import { Automation } from '@/model/Automation';

export class AutomationResponse {
  constructor(readonly automation: Automation) {}

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
