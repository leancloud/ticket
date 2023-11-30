import ALY from 'aliyun-sdk';
import { Job } from 'bull';
import _ from 'lodash';

import { Config } from '@/config';
import { createQueue } from '@/queue';
import { Ticket } from '@/model/Ticket';
import { TicketFieldVariant } from '@/model/TicketFieldVariant';
import { ticketService } from '@/service/ticket';
import { TicketForm } from '@/model/TicketForm';
import { TicketField } from '@/model/TicketField';
import { FieldValue, TicketFieldValue } from '@/model/TicketFieldValue';

interface TicketLog {
  id: string;
  title: string;
  content: string;
  category: {
    id: string;
    path: string[];
  };
  fields: {
    id: string;
    title: string;
    value: any;
  }[];
  replies: {
    id: string;
    isCustomerService: boolean;
    content: string;
    createdAt: string;
  }[];
  createdAt: string;
}

async function createTicketLogs(tickets: Ticket[]) {
  const logs: TicketLog[] = [];

  const fieldValues = await TicketFieldValue.queryBuilder()
    .where(
      'ticket',
      'in',
      tickets.map((ticket) => ticket.toPointer())
    )
    .find({ useMasterKey: true });

  const ticketsByCategoryId = _.groupBy(tickets, (t) => t.categoryId);
  const ticketFieldValueByTicketId = _.keyBy(fieldValues, (v) => v.ticketId);

  for (const tickets of Object.values(ticketsByCategoryId)) {
    const firstTicket = tickets[0];
    const categoryPath = await firstTicket.loadCategoryPath();
    const category = _.last(categoryPath);

    const fieldVariantMap: Record<string, TicketFieldVariant> = {};
    if (category && category.formId) {
      const form = await TicketForm.find(category.formId, { useMasterKey: true });
      if (form) {
        const fieldVariants = await form.getFieldVariants();
        for (const variant of fieldVariants) {
          fieldVariantMap[variant.fieldId] = variant;
        }
      }
    }

    for (const ticket of tickets) {
      const log: TicketLog = {
        id: ticket.id,
        title: ticket.title,
        content: ticket.content,
        category: {
          id: ticket.categoryId,
          path: categoryPath.map((c) => c.name),
        },
        fields: [],
        replies: [],
        createdAt: ticket.createdAt.toISOString(),
      };

      const fieldValue = ticketFieldValueByTicketId[ticket.id];
      if (fieldValue) {
        await fillFields(log, fieldVariantMap, fieldValue);
      }

      await fillReplies(log, ticket);

      logs.push(log as TicketLog);
    }
  }
  return logs;
}

function getHumanReadableFieldValue(
  field: TicketField,
  variant: TicketFieldVariant,
  value: FieldValue
) {
  switch (field.type) {
    case 'text':
    case 'multi-line':
    case 'date':
    case 'dropdown':
    case 'number':
      return value.value;
    case 'multi-select':
    case 'radios':
      if (variant.options && Array.isArray(value.value)) {
        const options = variant.options;
        return value.value.map((v) => {
          const option = options.find((options) => options.value === v);
          return option ? option.title : v;
        });
      }
      break;
  }
}

async function fillFields(
  log: TicketLog,
  fieldVariants: Record<string, TicketFieldVariant>,
  fieldValue: TicketFieldValue
) {
  fieldValue.values.forEach((value) => {
    const variant = fieldVariants[value.field];
    if (variant && variant.field) {
      const humanReadableValue = getHumanReadableFieldValue(variant.field, variant, value);
      if (humanReadableValue !== undefined) {
        log.fields.push({
          id: value.field,
          title: variant.title,
          value: value.value,
        });
      }
    }
  });
}

async function fillReplies(log: TicketLog, ticket: Ticket) {
  const replies = await ticketService.getReplies(ticket.id, {
    limit: 100,
  });
  replies.forEach((reply) => {
    log.replies.push({
      id: reply.id,
      isCustomerService: reply.isCustomerService,
      content: reply.content,
      createdAt: reply.createdAt.toISOString(),
    });
  });
}

let writeLogs: (logs: TicketLog[]) => Promise<any> = async () => {
  throw new Error('writeLogs is undefined');
};

async function processTickets(tickets: Ticket[]) {
  const logs = await createTicketLogs(tickets);
  await writeLogs(logs);
}

type JobData = {
  type: 'sync';
  startTime: string;
  endTime?: string;
  size?: number;
  delay?: number;
};

async function processJob(job: Job<JobData>) {
  const {
    data: { startTime, endTime, size = 50, delay = 1000 },
  } = job;

  const query = Ticket.queryBuilder();
  query.where('createdAt', '>', new Date(startTime));
  if (endTime) {
    query.where('createdAt', '<', new Date(endTime));
  }
  query.limit(size);
  query.orderBy('createdAt', 'asc');

  const tickets = await query.find({ useMasterKey: true });

  if (tickets.length === 0) {
    console.log('[Intelligent Operation] Sync finish');
    return;
  }

  await processTickets(tickets);

  const firstTicket = tickets[0];
  const lastTicket = tickets[tickets.length - 1];
  console.log(`[Intelligent Operation] ${tickets.length} tickets synced, `, {
    startTime: firstTicket.createdAt,
    endTime: lastTicket.createdAt,
  });

  await job.queue.add(
    {
      ...job.data,
      startTime: lastTicket.createdAt.toISOString(),
    },
    {
      delay,
    }
  );
}

interface IntelligentOperationConfig {
  enabled: boolean;
  accessKeyId: string;
  accessKeySecret: string;
  endpoint: string;
  projectName: string;
  logstoreName: string;
}

export default async function (install: Function) {
  const config: IntelligentOperationConfig = await Config.get('intelligent_operation');
  if (!config || !config.enabled) {
    return;
  }

  const { accessKeyId, accessKeySecret, endpoint, projectName, logstoreName } = config;

  const sls = new ALY.SLS({
    accessKeyId,
    secretAccessKey: accessKeySecret,
    endpoint,
    apiVersion: '2015-06-01',
  });

  writeLogs = async (ticketLogs) => {
    const time = Math.floor(Date.now() / 1000);
    const logs = ticketLogs.map((ticketLog) => {
      const contents = Object.entries(ticketLog).map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      }));
      return { time, contents };
    });

    const param = {
      projectName,
      logStoreName: logstoreName,
      logGroup: { logs },
    };

    return new Promise((resolve, reject) => {
      sls.putLogs(param, (err: any, data: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  };

  const queue = createQueue<JobData>('intelligent_operation', {
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: true,
    },
  });

  queue.process(processJob);

  install('Intelligent Operation');
}
