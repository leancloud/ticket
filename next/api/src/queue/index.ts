import Bull from 'bull';

const QUEUE_REDIS = process.env.REDIS_URL_QUEUE ?? 'redis://127.0.0.1:6379';

export function createQueue<T>(name: string, options?: Bull.QueueOptions): Bull.Queue<T> {
  return new Bull<T>(name, QUEUE_REDIS, options);
}
