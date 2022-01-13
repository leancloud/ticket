import { Vacation } from '@/model/Vacation';
import { UserResponse } from './user';

export class VacationResponse {
  constructor(readonly vacation: Vacation) {}

  toJSON() {
    const { operator, vacationer } = this.vacation;

    return {
      id: this.vacation.id,
      operator: operator ? new UserResponse(operator) : undefined,
      vacationer: vacationer ? new UserResponse(vacationer) : undefined,
      startDate: this.vacation.startDate.toISOString(),
      endDate: this.vacation.endDate.toISOString(),
      createdAt: this.vacation.createdAt.toISOString(),
    };
  }
}
