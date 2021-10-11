import { Model, field } from '@/orm';

export interface Filters {
  assigneeIds?: string[];
  groupIds?: string[];
  createdAt?: string;
  rootCategoryId?: string;
  statuses?: number[];
}

export class TicketFilter extends Model {
  @field()
  name!: string;

  @field()
  userIds?: string[];

  @field()
  groupIds?: string[];

  @field()
  filters!: Filters;
}
