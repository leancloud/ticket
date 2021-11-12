import { Model, field } from '@/orm';

export class SlackNotification extends Model {
  @field()
  channel!: string;

  @field()
  ts!: string;

  @field()
  ticket!: {
    objectId: string;
  };

  @field()
  assignee!: {
    objectId: string;
    displayName: string;
  };
}
