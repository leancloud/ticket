import { Status } from '@/model/Ticket';
import { SinceUpdatedIs, SinceUpdatedLt, SinceUpdatedGt } from './sinceUpdated';

export class SinceFulfilledIs extends SinceUpdatedIs {
  getCondition(): any {
    return {
      ...super.getCondition(),
      status: Status.FULFILLED,
    };
  }
}

export class SinceFulfilledLt extends SinceUpdatedLt {
  getCondition(): any {
    return {
      ...super.getCondition(),
      status: Status.FULFILLED,
    };
  }
}

export class SinceFulfilledGt extends SinceUpdatedGt {
  getCondition(): any {
    return {
      ...super.getCondition(),
      status: Status.FULFILLED,
    };
  }
}
