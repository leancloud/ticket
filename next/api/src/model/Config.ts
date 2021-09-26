import { Model, field } from '../orm';

export class Config extends Model {
  @field()
  key!: string;

  @field()
  value!: any;

  static async get(key: string): Promise<any> {
    try {
      const config = await this.queryBuilder()
        .where('key', '==', key)
        .first({ useMasterKey: true });
      if (config) {
        console.log(`[Config] ${key}=${config.value}`);
      }
      return config?.value;
    } catch (error) {
      // TODO: Sentry
      console.error('[Config] Get config failed', error);
    }
  }
}
