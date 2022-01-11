import { Status } from '@/model/Ticket';
import { SinceUpdatedIs, SinceUpdatedLt, SinceUpdatedGt } from './sinceUpdated';

export class SinceWaitingCustomerIs extends SinceUpdatedIs {
  getCondition(): any {
    return {
      ...super.getCondition(),
      status: Status.WAITING_CUSTOMER,
    };
  }
}

export class SinceWaitingCustomerLt extends SinceUpdatedLt {
  getCondition(): any {
    return {
      ...super.getCondition(),
      status: Status.WAITING_CUSTOMER,
    };
  }
}

export class SinceWaitingCustomerGt extends SinceUpdatedGt {
  getCondition(): any {
    return {
      ...super.getCondition(),
      status: Status.WAITING_CUSTOMER,
    };
  }
}
