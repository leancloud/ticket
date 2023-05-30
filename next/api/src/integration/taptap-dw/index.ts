import _ from 'lodash';
import LRUCache from 'lru-cache';
import { Kafka, logLevel, KafkaConfig } from 'kafkajs';
import events from '@/events';
import { Config } from '@/model/Config';
import { Ticket } from '@/model/Ticket';
import { TicketField } from '@/model/TicketField';
import { FieldValue, TicketFieldValue } from '@/model/TicketFieldValue';
import { File } from '@/model/File';

interface TicketSnapshot {
  service: string;
  id: string;
  author: {
    id: string;
  };
  category: {
    id: string;
  };
  title: string;
  content: string;
  status: number;
  custom_fields: CustomFieldData[];
  timestamp: string;
  leancloud_app_id: string;
}

interface CustomFieldData {
  id: string;
  // 客服后台设置的字段名称
  name: string;
  type: string;
  value: string | string[];
  // 文件字段的 URL
  urls?: string[];
}

class TicketSnapshotManager {
  private ticketFieldCache: LRUCache<string, TicketField | 0>;

  constructor(readonly leancloudAppId: string, readonly serviceName: string) {
    this.ticketFieldCache = new LRUCache({
      max: 1000, // 1000 items
      ttl: 1000 * 60 * 5, // 5 mins
    });
  }

  getTicketFieldValue(ticketId: string) {
    return TicketFieldValue.queryBuilder()
      .where('ticket', '==', Ticket.ptr(ticketId))
      .first({ useMasterKey: true });
  }

  getTicketFieldsFromDB(fieldIds: string[]) {
    return TicketField.queryBuilder()
      .where('objectId', 'in', fieldIds)
      .find({ useMasterKey: true });
  }

  getTicketFieldsFromCache(fieldIds: string[]) {
    const fields: TicketField[] = [];
    const missingIds: string[] = [];
    for (const fieldId of fieldIds) {
      const field = this.ticketFieldCache.get(fieldId);
      if (field) {
        fields.push(field);
      } else if (field !== 0) {
        missingIds.push(fieldId);
      }
    }
    return [fields, missingIds] as const;
  }

  async getTicketFields(fieldIds: string[]) {
    const [cachedFields, missingIds] = this.getTicketFieldsFromCache(fieldIds);
    if (missingIds.length === 0) {
      return cachedFields;
    }

    const fields = await this.getTicketFieldsFromDB(missingIds);
    const dbMissingIds = _.differenceWith(missingIds, fields, (id, field) => id === field.id);

    for (const field of fields) {
      this.ticketFieldCache.set(field.id, field);
    }
    for (const missingId of dbMissingIds) {
      this.ticketFieldCache.set(missingId, 0);
    }

    return cachedFields.concat(fields);
  }

  getFiles(fileIds: string[]) {
    return File.queryBuilder().where('objectId', 'in', fileIds).find({ useMasterKey: true });
  }

  createCustomFieldsSnapshot(fields: TicketField[], values: FieldValue[]) {
    const customFields: CustomFieldData[] = [];
    const fieldById = _.keyBy(fields, (field) => field.id);
    for (const { field: fieldId, value } of values) {
      const field = fieldById[fieldId];
      if (field) {
        customFields.push({
          id: field.id,
          name: field.title,
          type: field.type,
          value,
        });
      }
    }
    return customFields;
  }

  async createTicketSnapshot(ticket: Ticket, timestamp: string, customFields?: FieldValue[]) {
    const snapshot: TicketSnapshot = {
      service: this.serviceName,
      id: ticket.id,
      author: {
        id: ticket.authorId,
      },
      category: {
        id: ticket.categoryId,
      },
      title: ticket.title,
      content: ticket.content,
      status: ticket.status,
      custom_fields: [],
      timestamp,
      leancloud_app_id: this.leancloudAppId,
    };

    if (!customFields) {
      const fieldValue = await this.getTicketFieldValue(ticket.id);
      if (fieldValue) {
        customFields = fieldValue.values;
      }
    }

    if (customFields) {
      const fieldIds = customFields.map((v) => v.field);
      if (fieldIds.length) {
        const fields = await this.getTicketFields(fieldIds);
        snapshot.custom_fields = this.createCustomFieldsSnapshot(fields, customFields);
        await this.fillFileFieldUrls(snapshot.custom_fields);
      }
    }

    return snapshot;
  }

  async fillFileFieldUrls(customFields: CustomFieldData[]) {
    const fileFields = customFields.filter((field) => field.type === 'file');
    const fileIds = fileFields.flatMap((field) => field.value);

    if (fileIds.length === 0) {
      return;
    }

    const files = await this.getFiles(fileIds);
    const fileById = _.keyBy(files, (file) => file.id);

    for (const customField of fileFields) {
      customField.urls = _.castArray(customField.value)
        .map((fileId) => fileById[fileId])
        .filter(Boolean)
        .map((file) => file.url);
    }
  }

  createCreatedTicketSnapshot(ticket: Ticket, customFields?: FieldValue[]) {
    return this.createTicketSnapshot(ticket, ticket.createdAt.toISOString(), customFields || []);
  }

  createUpdatedTicketSnapshot(ticket: Ticket) {
    return this.createTicketSnapshot(ticket, ticket.updatedAt.toISOString());
  }
}

interface TapTapDWConfig {
  enabled?: boolean;
  topic: string;
  kafka: KafkaConfig;
  service: string;
}

export default async function (install: Function) {
  const config: TapTapDWConfig = await Config.get('taptap_dw');
  if (!config || config.enabled === false) {
    return;
  }

  const kafka = new Kafka({
    ...config.kafka,
    logLevel: logLevel.ERROR,
  });

  const producer = kafka.producer();
  await producer.connect();

  const snapshotManager = new TicketSnapshotManager(
    process.env.LEANCLOUD_APP_ID ?? 'unknown',
    config.service
  );

  let sendedCount = 0;
  const sendSnapshot = async (snapshot: TicketSnapshot) => {
    await producer.send({
      topic: config.topic,
      messages: [
        {
          value: JSON.stringify(snapshot),
        },
      ],
    });
    sendedCount += 1;
  };

  setInterval(() => {
    if (sendedCount) {
      console.log(`[TapTap Data Warehouse] ${sendedCount} log(s) sended`);
      sendedCount = 0;
    }
  }, 1000 * 10);

  events.on('ticket:created', ({ ticket, customFields }) => {
    snapshotManager
      .createCreatedTicketSnapshot(ticket, customFields)
      .then(sendSnapshot)
      .catch((error) => console.error('[TapTap Data Warehouse]', error));
  });

  events.on('ticket:updated', ({ updatedTicket }) => {
    snapshotManager
      .createUpdatedTicketSnapshot(updatedTicket)
      .then(sendSnapshot)
      .catch((error) => console.error('[TapTap Data Warehouse]', error));
  });

  install('TapTap Data Warehouse', {});
}
