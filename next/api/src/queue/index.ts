import Bull from 'bull';
import Redis, { Redis as IRedis } from 'ioredis';

const QUEUE_REDIS = process.env.REDIS_URL_QUEUE ?? 'redis://127.0.0.1:6379';

let client: IRedis | undefined;
let subscriber: IRedis | undefined;

export function createQueue<T>(name: string, options?: Bull.QueueOptions): Bull.Queue<T> {
  if (process.env.NODE_ENV === 'staging') {
    name += '_stg';
  }
  return new Bull<T>(name, {
    ...options,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: true,
      ...options?.defaultJobOptions,
    },
    // https://github.com/OptimalBits/bull/blob/develop/PATTERNS.md#reusing-redis-connections
    createClient: (type, redisOptions) => {
      switch (type) {
        case 'client':
          if (!client) {
            client = new Redis(QUEUE_REDIS, redisOptions);
          }
          return client;
        case 'subscriber':
          if (!subscriber) {
            subscriber = new Redis(QUEUE_REDIS, redisOptions);
          }
          return subscriber;
        case 'bclient':
          return new Redis(QUEUE_REDIS, redisOptions);
        default:
          throw new Error(`Unexpected connection type: ${type}`);
      }
    },
  });
}

export type { Queue, Job } from 'bull';
