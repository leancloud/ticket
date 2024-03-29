import { createQueue } from '@/queue';
import { SortItem } from '@/middleware';
import { ExportTicketTask } from '@/model/ExportTicketTask';
import exportTicket, { FilterOptions } from './ExportTicket';

export interface JobData {
  params: FilterOptions;
  sortItems?: SortItem[];
  utcOffset?: number;
  userId: string;
  date: string;
  taskId: string;
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

queue.process(async (job, done) => {
  try {
    const result = await exportTicket(job.data);
    done(null, result);
  } catch (error) {
    done(error as Error);
  }
});

queue.on('completed', async (job, result) => {
  const task = await ExportTicketTask.find(job.data.taskId, { useMasterKey: true });
  if (task) {
    await task.update(
      {
        downloadUrl: result.url,
        ticketCount: result.ticketCount,
        status: 'complete',
        completedAt: new Date(),
      },
      { useMasterKey: true }
    );
  }
});

queue.on('failed', async (job, err) => {
  console.error('[export ticket]:', job.data, err);
  const task = await ExportTicketTask.find(job.data.taskId, { useMasterKey: true });
  if (task) {
    await task.update(
      {
        status: 'failed',
      },
      { useMasterKey: true }
    );
  }
});

export async function createTicketExportJob(jobData: Omit<JobData, 'date' | 'taskId'>) {
  const task = await ExportTicketTask.create(
    {
      ACL: {},
      operatorId: jobData.userId,
      status: 'processing',
    },
    { useMasterKey: true }
  );
  await queue.add({
    ...jobData,
    date: new Date().toISOString(),
    taskId: task.id,
  });
}
