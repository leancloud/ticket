import { Model, field } from '@/orm';


export class Config extends Model {
  @field()
  key!: string;

  @field()
  value!: string | number | Array<any> | Record<any, any> | boolean;
  static async get(key: string): Promise<any> {
    try {
      const config = await this.queryBuilder()
        .where('key', '==', key)
        .first({ useMasterKey: true });
      if (config) {
        console.log(`[Config] ${key} = ${config.value}`);
      }
      return config?.value;
    } catch (error) {
      // TODO: Sentry
      console.error('[Config] Get config failed', error);
    }
  }

  static async set(key: string, value: any): Promise<any> {
    const config = await this.queryBuilder()
      .where('key', '==', key)
      .first({ useMasterKey: true });
    if (config) {
      return config.update({
        value
      }, { useMasterKey: true })
    } else {
      return Config.create({
        ACL: {},
        key,
        value
      }, { useMasterKey: true })
    }
  }
}
