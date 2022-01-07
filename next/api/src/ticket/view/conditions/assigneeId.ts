import { User } from '@/model/User';

export class AssigneeIdIs {
  protected value: string | null;

  constructor({ value }: { value: string | null }) {
    this.value = value;
  }

  getCondition(): any {
    return {
      assignee:
        this.value === null
          ? {
              $exists: false,
            }
          : User.ptr(this.value),
    };
  }
}

export class AssigneeIdIsNot extends AssigneeIdIs {
  getCondition(): any {
    return {
      assignee:
        this.value === null
          ? {
              $exists: true,
            }
          : {
              $ne: User.ptr(this.value),
            },
    };
  }
}
