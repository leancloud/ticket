import { Status } from '@/model/Ticket';
import { SinceUpdatedIs, SinceUpdatedLt, SinceUpdatedGt } from './sinceUpdated';

export class SincePreFulfilledIs extends SinceUpdatedIs {
  getCondition(): any {
    return {
      ...super.getCondition(),
      status: Status.PRE_FULFILLED,
    };
  }
}

export class SincePreFulfilledLt extends SinceUpdatedLt {
  getCondition(): any {
    return {
      ...super.getCondition(),
      status: Status.PRE_FULFILLED,
    };
  }
}

export class SincePreFulfilledGt extends SinceUpdatedGt {
  getCondition(): any {
    return {
      ...super.getCondition(),
      status: Status.PRE_FULFILLED,
    };
  }
}
