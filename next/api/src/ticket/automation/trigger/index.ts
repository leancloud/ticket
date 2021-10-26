import { systemUser } from '@/model/User';
import { Action, Condition, Context } from '..';

export class Trigger {
  constructor(private condition: Condition, private actions: Action[]) {}

  async exec(ctx: Context) {
    if (await this.condition.test(ctx)) {
      for (const action of this.actions) {
        await action.exec(ctx);
      }
      // TODO: ignore trigger
      await ctx.updater.update(systemUser);
    }
  }
}
