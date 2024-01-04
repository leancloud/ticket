import { Client } from '@elastic/elasticsearch';
import { Queue } from 'bull';
import esb from 'elastic-builder';
import _ from 'lodash';

import {
  SearchTicketOptions,
  SyncTicketSearchDocumentJobData,
  TicketSearchDocument,
} from '@/interfaces/ticket';
import { Ticket } from '@/model/Ticket';
import { TicketFieldValue } from '@/model/TicketFieldValue';
import { createQueue } from '@/queue';

export class SearchTicketService {
  private esClient?: Client;
  private indexName: string;
  private syncQueue?: Queue<SyncTicketSearchDocumentJobData>;

  constructor() {
    const { ELASTICSEARCH_URL_SEARCH, ENABLE_SEARCH_V2, LEANCLOUD_APP_ID } = process.env;
    if (ELASTICSEARCH_URL_SEARCH && ENABLE_SEARCH_V2) {
      this.esClient = new Client({
        node: ELASTICSEARCH_URL_SEARCH,
      });

      this.syncQueue = createQueue('ticket_search', {
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: true,
        },
        limiter: {
          max: 10,
          duration: 1000,
        },
      });

      this.syncQueue.process(async (job) => {
        switch (job.data.type) {
          case 'syncById':
            await this.syncTicketsById(job.data.ids);
            break;
          case 'syncByRange':
            await this.processSyncByRangeJob(job.data);
            break;
        }
      });
    }

    this.indexName = `ticket-${LEANCLOUD_APP_ID!.slice(0, 8).toLowerCase()}`;
  }

  createSearchDocument(ticket: Ticket, fieldValue?: TicketFieldValue) {
    const doc: TicketSearchDocument = {
      objectId: ticket.id,
      title: ticket.title,
      content: ticket.content,
      categoryId: ticket.categoryId,
      authorId: ticket.authorId,
      reporterId: ticket.reporterId,
      assigneeId: ticket.assigneeId,
      groupId: ticket.groupId,
      status: ticket.status,
      evaluation: ticket.evaluation && {
        star: ticket.evaluation.star,
        ts: ticket.evaluation.ts?.toISOString(),
      },
      language: ticket.language,
      tags: ticket.tags,
      privateTags: ticket.privateTags,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    };
    if (ticket.joinedCustomerServices) {
      const ids = _.uniq(ticket.joinedCustomerServices.map((cs) => cs.objectId));
      if (ids.length) {
        doc.joinedCustomerServiceIds = ids;
      }
    }
    if (ticket.metaData) {
      const metaData = Object.entries(ticket.metaData).reduce((data, [key, value]) => {
        switch (typeof value) {
          case 'string':
            data.push({ key, value });
            break;
          case 'number':
            data.push({ key, value: value.toString() });
            break;
        }
        return data;
      }, [] as { key: string; value: string }[]);
      if (!_.isEmpty(metaData)) {
        doc.metaData = metaData;
      }
    }
    if (fieldValue?.values.length) {
      doc.fields = fieldValue.values.map(({ field, value }) => ({ id: field, value }));
    }
    return doc;
  }

  async syncTickets(tickets: Ticket[]) {
    if (!this.esClient) return;

    const ticketPointerChunks = _.chunk(
      tickets.map((t) => t.toPointer()),
      50
    );
    const fieldValues: TicketFieldValue[] = [];
    for (const ticketPointers of ticketPointerChunks) {
      const _fieldValues = await TicketFieldValue.queryBuilder()
        .where('ticket', 'in', ticketPointers)
        .find({ useMasterKey: true });
      fieldValues.push(..._fieldValues);
    }
    const fieldValueByTicketId = _.keyBy(fieldValues, (v) => v.ticketId);
    const docs = tickets.map((ticket) =>
      this.createSearchDocument(ticket, fieldValueByTicketId[ticket.id])
    );

    await this.esClient.bulk({
      body: docs.flatMap((doc) => [{ index: { _index: this.indexName, _id: doc.objectId } }, doc]),
    });
  }

  async syncTicketsById(ids: string[]) {
    if (!this.esClient) return;
    const tickets = await Ticket.queryBuilder()
      .where('objectId', 'in', ids)
      .find({ useMasterKey: true });
    await this.syncTickets(tickets);
  }

  async addSyncJob(ids: string[]) {
    await this.syncQueue?.add({ type: 'syncById', ids });
  }

  private async processSyncByRangeJob(
    data: Extract<SyncTicketSearchDocumentJobData, { type: 'syncByRange' }>
  ) {
    const { start, end, limit = 100, delay = 1000 } = data;
    const query = Ticket.queryBuilder();
    if (start) {
      query.where('createdAt', '>', new Date(start));
    }
    if (end) {
      query.where('createdAt', '<', new Date(end));
    }
    const tickets = await query.orderBy('createdAt').limit(limit).find({ useMasterKey: true });
    if (tickets.length === 0) {
      console.log('[SearchTicketService] Sync job is done');
      return;
    }
    await this.syncTickets(tickets);
    const lastCreatedAt = tickets[tickets.length - 1].createdAt.toISOString();
    console.log(
      `[SearchTicketService] Sync ${
        tickets.length
      } tickets, (${tickets[0].createdAt.toISOString()},${lastCreatedAt})`
    );
    await this.syncQueue?.add(
      {
        ...data,
        start: lastCreatedAt,
      },
      {
        delay,
      }
    );
  }

  async search({
    filters,
    sortField = 'createdAt',
    order = 'desc',
    skip = 0,
    limit = 10,
  }: SearchTicketOptions) {
    if (!this.esClient) return;

    const boolQuery = esb.boolQuery();

    const addNullableTermsQuery = (field: string, terms: (string | null)[]) => {
      const nonNullTerms = _.compact(terms);
      if (nonNullTerms.length === terms.length) {
        boolQuery.filter(esb.termsQuery(field, nonNullTerms));
      } else {
        boolQuery.filter(
          esb.boolQuery().should([esb.termsQuery(field, nonNullTerms), esb.cookMissingQuery(field)])
        );
      }
    };

    const addRangeQuery = (field: string, from?: string, to?: string) => {
      if (!from && !to) return;
      const rangeQuery = esb.rangeQuery(field);
      if (from) {
        rangeQuery.gte(from);
      }
      if (to) {
        rangeQuery.lte(to);
      }
      boolQuery.filter(rangeQuery);
    };

    if (filters.authorId) {
      boolQuery.filter(esb.termQuery('authorId', filters.authorId));
    }
    if (filters.assigneeId) {
      addNullableTermsQuery('assigneeId', filters.assigneeId);
    }
    if (filters.categoryId) {
      boolQuery.filter(esb.termsQuery('categoryId', filters.categoryId));
    }
    if (filters.groupId) {
      addNullableTermsQuery('groupId', filters.groupId);
    }
    if (filters.reporterId) {
      addNullableTermsQuery('reporterId', filters.reporterId);
    }
    if (filters.joinedCustomerServiceId) {
      boolQuery.filter(esb.termsQuery('joinedCustomerServiceIds', filters.joinedCustomerServiceId));
    }
    if (filters.status) {
      boolQuery.filter(esb.termsQuery('status', filters.status));
    }
    if (filters.evaluationStar !== undefined) {
      boolQuery.filter(esb.termQuery('evaluation.star', filters.evaluationStar));
    }
    if (filters.evaluationTs) {
      addRangeQuery('evaluation.ts', filters.evaluationTs.from, filters.evaluationTs.to);
    }
    if (filters.createdAt) {
      addRangeQuery('createdAt', filters.createdAt.from, filters.createdAt.to);
    }
    if (filters.tags) {
      boolQuery.filter(
        esb
          .boolQuery()
          .must(
            filters.tags.flatMap(({ key, value }) => [
              esb.termQuery('tags.key', key),
              esb.termQuery('tags.value', value),
            ])
          )
      );
    }
    if (filters.privateTags) {
      boolQuery.filter(
        esb
          .boolQuery()
          .must(
            filters.privateTags.flatMap(({ key, value }) => [
              esb.termQuery('privateTags.key', key),
              esb.termQuery('privateTags.value', value),
            ])
          )
      );
    }
    if (filters.metaData) {
      boolQuery.filter(
        esb
          .boolQuery()
          .must(
            filters.metaData.flatMap(({ key, value }) => [
              esb.termQuery('metaData.key', key),
              esb.termQuery('metaData.value', value),
            ])
          )
      );
    }
    if (filters.language) {
      boolQuery.filter(esb.termsQuery('language', filters.language));
    }
    if (filters.fields) {
      boolQuery.filter(
        esb
          .boolQuery()
          .must(
            filters.fields.flatMap(({ id, value }) => [
              esb.termQuery('fields.id', id),
              esb.termQuery('fields.value', value),
            ])
          )
      );
    }
    if (filters.keyword) {
      boolQuery.filter(
        esb.multiMatchQuery(['title', 'content', 'fields.value'], filters.keyword).operator('and')
      );
    }

    const body = esb
      .requestBodySearch()
      .query(boolQuery)
      .sort(esb.sort(sortField, order))
      .from(skip)
      .size(limit)
      .source(false)
      .toJSON();

    const res = await this.esClient.search({
      index: this.indexName,
      body,
    });

    const ids = res.body.hits.hits.map((t: any) => t._id) as string[];
    const totalCount = res.body.hits.total.value as number;
    return { ids, totalCount };
  }
}

export const searchTicketService = new SearchTicketService();
