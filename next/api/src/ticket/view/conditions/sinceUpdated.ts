import { SinceCreatedIs, SinceCreatedLt, SinceCreatedGt } from './sinceCreated';

export class SinceUpdatedIs extends SinceCreatedIs {
  getCondition(): any {
    return {
      updatedAt: super.getCondition().createdAt,
    };
  }
}

export class SinceUpdatedLt extends SinceCreatedLt {
  getCondition(): any {
    return {
      updatedAt: super.getCondition().createdAt,
    };
  }
}

export class SinceUpdatedGt extends SinceCreatedGt {
  getCondition(): any {
    return {
      updatedAt: super.getCondition().createdAt,
    };
  }
}
