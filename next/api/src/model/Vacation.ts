import { Model, field, pointTo, pointerId } from '@/orm';
import { User } from './User';

export class Vacation extends Model {
  @field()
  startDate!: Date;

  @field()
  endDate!: Date;

  @pointerId(() => User)
  operatorId!: string;

  @pointTo(() => User)
  operator?: User;

  @pointerId(() => User)
  vacationerId!: string;

  @pointTo(() => User)
  vacationer?: User;

  static async getVacationerIds(): Promise<string[]> {
    const now = new Date();
    const vacations = await Vacation.queryBuilder()
      .where('startDate', '<', now)
      .where('endDate', '>', now)
      .find({ useMasterKey: true });
    return vacations.map((v) => v.vacationerId);
  }
}
