import _ from 'lodash';
import LRUCache from 'lru-cache';
import events from '@/events';
import { Ticket } from '@/model/Ticket';
import { TicketField } from '@/model/TicketField';
import { FieldValue, TicketFieldValue } from '@/model/TicketFieldValue';

interface TicketSnapshot {
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
  custom_fields: {
    [field_id: string]: {
      // 客服后台设置的字段名称
      name: string;
      type: string;
      value: string[];
    };
  };
  timestamp: string;
}

class TicketSnapshotManager {
  private ticketFieldCache: LRUCache<string, TicketField | 0>;

  constructor() {
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

  createCustomFieldsSnapshot(fields: TicketField[], values: FieldValue[]) {
    const custom_fields: TicketSnapshot['custom_fields'] = {};
    const fieldById = _.keyBy(fields, (field) => field.id);
    for (const { field: fieldId, value } of values) {
      const field = fieldById[fieldId];
      if (!field) {
        continue;
      }
      custom_fields[fieldId] = {
        name: field.title,
        type: field.type,
        value: _.castArray(value),
      };
    }
    return custom_fields;
  }

  async createTicketSnapshot(ticket: Ticket, timestamp: string, customFields?: FieldValue[]) {
    const snapshot: TicketSnapshot = {
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
      custom_fields: {},
      timestamp,
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
      }
    }

    return snapshot;
  }

  createCreatedTicketSnapshot(ticket: Ticket, customFields?: FieldValue[]) {
    return this.createTicketSnapshot(ticket, ticket.createdAt.toISOString(), customFields || []);
  }

  createUpdatedTicketSnapshot(ticket: Ticket) {
    return this.createTicketSnapshot(ticket, ticket.updatedAt.toISOString());
  }
}

export default async function (install: Function) {
  const snapshotManager = new TicketSnapshotManager();

  events.on('ticket:created', ({ ticket, customFields }) => {
    snapshotManager
      .createCreatedTicketSnapshot(ticket, customFields)
      .then((snapshot) => {
        console.log('[TapTap Data Warehouse] create');
        console.dir(snapshot, { depth: 100 });
      })
      .catch((error) => console.error('[TapTap Data Warehouse]', error));
  });

  events.on('ticket:updated', ({ updatedTicket }) => {
    snapshotManager
      .createUpdatedTicketSnapshot(updatedTicket)
      .then((snapshot) => {
        console.log('[TapTap Data Warehouse] update');
        console.dir(snapshot, { depth: 100 });
      })
      .catch((error) => console.error('[TapTap Data Warehouse]', error));
  });

  install('TapTap DW', {});
}
