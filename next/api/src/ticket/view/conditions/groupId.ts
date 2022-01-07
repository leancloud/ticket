import { Group } from '@/model/Group';

export class GroupIdIs {
  protected value: string | null;

  constructor({ value }: { value: string | null }) {
    this.value = value;
  }

  getCondition(): any {
    return {
      group:
        this.value === null
          ? {
              $exists: false,
            }
          : Group.ptr(this.value),
    };
  }
}

export class GroupIdIsNot extends GroupIdIs {
  getCondition(): any {
    return {
      group:
        this.value === null
          ? {
              $exists: true,
            }
          : {
              $ne: Group.ptr(this.value),
            },
    };
  }
}
