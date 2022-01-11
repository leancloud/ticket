import { Status } from '@/model/Ticket';
import { SinceUpdatedIs, SinceUpdatedLt, SinceUpdatedGt } from './sinceUpdated';

export class SinceWaitingCustomerServiceIs extends SinceUpdatedIs {
  getCondition(): any {
    return {
      ...super.getCondition(),
      status: Status.WAITING_CUSTOMER_SERVICE,
    };
  }
}

export class SinceWaitingCustomerServiceLt extends SinceUpdatedLt {
  getCondition(): any {
    return {
      ...super.getCondition(),
      status: Status.WAITING_CUSTOMER_SERVICE,
    };
  }
}

export class SinceWaitingCustomerServiceGt extends SinceUpdatedGt {
  getCondition(): any {
    return {
      ...super.getCondition(),
      status: Status.WAITING_CUSTOMER_SERVICE,
    };
  }
}
