import { Status } from '@/model/Ticket';
import { SinceUpdatedIs, SinceUpdatedLt, SinceUpdatedGt } from './sinceUpdated';

export class SinceNewIs extends SinceUpdatedIs {
  getCondition(): any {
    return {
      ...super.getCondition(),
      status: Status.NEW,
    };
  }
}

export class SinceNewLt extends SinceUpdatedLt {
  getCondition(): any {
    return {
      ...super.getCondition(),
      status: Status.NEW,
    };
  }
}

export class SinceNewGt extends SinceUpdatedGt {
  getCondition(): any {
    return {
      ...super.getCondition(),
      status: Status.NEW,
    };
  }
}
