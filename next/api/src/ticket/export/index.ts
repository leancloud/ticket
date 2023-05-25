import { debug as d } from 'debug';
import { createQueue } from '@/queue';
import { SortItem } from '@/middleware';
import exportTicket, { FilterOptions } from './ExportTicket';
import notification from '@/notification';

const debug = d('export:queue');

export interface JobData {
  params: FilterOptions;
  sortItems?: SortItem[];
  utcOffset?: number;
  userId: string;
  date: Date;
  retryCount: number;
}

const queue = createQueue<JobData>('ticket:exported', {
  limiter: {
    max: 1,
    duration: 1000,
  },
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
  },
});

queue.process(async (jobData, done) => {
  try {
    debug('process exporting', jobData.data);
    const result = await exportTicket(jobData.data);
    done(null, result);
  } catch (error) {
    done(error as Error);
  }
});

queue.on('completed', async (jobData, result) => {
  debug('export completed', jobData.data);
  if (result && result.url) {
    debug('notify', jobData.data.userId);
    notification.notifyTicketExported({
      downloadUrl: result.url,
      userId: jobData.data.userId,
    });
  } else {
    console.error('[export ticket]: download url is required', result);
  }
});

queue.on('failed', (job, err) => {
  console.error('[export ticket]:', job.data, err);
  if (job.data.retryCount < 2) {
    queue.add({
      ...job.data,
      retryCount: job.data.retryCount + 1,
    });
  } else {
    //TODO  send email ?
    console.error(`[export ticket]: after retry`, job.data, err);
  }
});

export const createTicketExportJob = (jobData: Omit<JobData, 'date' | 'retryCount'>) => {
  return queue.add({
    ...jobData,
    retryCount: 0,
    date: new Date(),
  });
};
