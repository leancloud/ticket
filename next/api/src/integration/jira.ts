import JiraApi from 'jira-client';
import axios from 'axios';
import Router from '@koa/router';
import { z } from 'zod';
import _ from 'lodash';

import events from '@/events';
import { auth, customerServiceOnly } from '@/middleware';
import { Config, config } from '@/config';
import { Model, field } from '@/orm';
import { Ticket } from '@/model/Ticket';

interface JiraConfig {
  host: string;
  accessToken: string;
  projectId: string;
  issueTypeId: string;
  customFields?: Record<string, any>;
  componentIds?: string[];
  categoryAssignees?: Record<string, any>;
}

interface Field {
  id: string;
}

interface IssueFields {
  [key: string]: any;
  project: Field;
  issuetype: Field;
  summary: string;
  description: string;
  labels: string[];
  components?: Field[];
}

interface CreateIssueResult {
  key: string;
}

interface IssueCreatedContext {
  issueKey: string;
  ticket: Ticket;
}

declare module '@/events' {
  interface EventTypes {
    'jira/issue:created': (ctx: IssueCreatedContext) => void;
  }
}

class JiraIssue extends Model {
  @field()
  key!: string;

  @field()
  ticket!: { objectId: string };
}

class JiraIntegration {
  private config: JiraConfig;
  private jira: JiraApi;

  constructor(config: JiraConfig) {
    this.config = config;
    this.jira = new JiraApi({
      protocol: 'https',
      host: config.host,
      bearer: config.accessToken,
      apiVersion: '2',
      strictSSL: true,
    });
  }

  private async getCategoryName(ticket: Ticket): Promise<string> {
    const categories = await ticket.loadCategoryPath();
    return categories.map((c) => c.name).join('/');
  }

  private getIssueDescription(ticket: Ticket): string {
    let desc = `h3. *用户描述:*\n${ticket.content}`;
    if (ticket.metaData && !_.isEmpty(ticket.metaData)) {
      desc += '\n\nh3. *Metadata:*\n||Key||Value||';
      Object.entries(ticket.metaData).forEach(([key, value]) => {
        desc += `\n|${key}|${value || '-'}|`;
      });
    }
    const url = ticket.getUrl();
    desc += `\n\nh3. *工单链接:*\n${url}`;
    return desc;
  }

  private async getIssueFields(ticket: Ticket): Promise<IssueFields> {
    const { projectId, issueTypeId, customFields, componentIds, categoryAssignees } = this.config;
    const categoryName = await this.getCategoryName(ticket);
    const description = this.getIssueDescription(ticket);

    const fields: IssueFields = {
      ...customFields,
      project: { id: projectId },
      issuetype: { id: issueTypeId },
      summary: ticket.title,
      description,
      // XXX: Jira 标签不能包含空白
      labels: [categoryName.replace(/\s/g, '')],
      components: componentIds?.map((id) => ({ id })),
    };

    const assignee = categoryAssignees?.[ticket.categoryId];
    if (assignee) {
      fields.assignee = assignee;
    }

    return fields;
  }

  private async getFileUrls(ticket: Ticket): Promise<string[] | undefined> {
    const files = await ticket.load('files');
    if (files) {
      return files.map((file) => file.url);
    }
  }

  private async addAttachmants(issueId: string, ticket: Ticket) {
    const fileUrls = await this.getFileUrls(ticket);
    if (!fileUrls || fileUrls.length === 0) {
      return;
    }
    for (const url of fileUrls) {
      try {
        const { data } = await axios.get(url, { responseType: 'stream' });
        await this.jira.addAttachmentOnIssue(issueId, data);
      } catch (error: any) {
        // TODO: Sentry
        console.error('[Jira] Upload file failed', error);
      }
    }
  }

  async createIssue(ticket: Ticket): Promise<CreateIssueResult> {
    const fields = await this.getIssueFields(ticket);
    const result = await this.jira.addNewIssue({ fields });
    if (ticket.fileIds) {
      this.addAttachmants(result.id, ticket);
    }
    events.emit('jira/issue:created', { issueKey: result.key, ticket });
    await JiraIssue.create(
      {
        ACL: {},
        key: result.key,
        ticket: { objectId: ticket.id },
      },
      { useMasterKey: true }
    );
    return { key: result.key };
  }

  getIssueUrl(key: string): string {
    return `https://${this.config.host}/browse/${key}`;
  }
}

async function getJiraConfig(): Promise<JiraConfig | undefined> {
  const data = await Config.get('jira');
  if (!data) {
    return;
  }
  const requiredKeys: (keyof JiraConfig)[] = ['host', 'accessToken', 'issueTypeId', 'projectId'];
  const missingKeys = requiredKeys.filter((key) => data[key] === undefined);
  if (missingKeys.length) {
    console.warn('[Jira] Missing config:', missingKeys.join(', '));
    return;
  }
  return data;
}

export default async function (install: Function) {
  const jiraConfig = await getJiraConfig();
  if (!jiraConfig) {
    return;
  }

  const jira = new JiraIntegration(jiraConfig);
  const router = new Router({ prefix: '/integrations/jira' }).use(auth, customerServiceOnly);

  const issueFiltersSchema = z.object({
    ticketId: z.string().optional(),
  });
  router.get('/issues', async (ctx) => {
    const filters = issueFiltersSchema.parse(ctx.query);
    const query = JiraIssue.queryBuilder();

    if (filters.ticketId) {
      query.where('ticket.objectId', '==', filters.ticketId);
    }

    const issues = await query.find({ useMasterKey: true });
    ctx.body = issues.map((issue) => ({
      key: issue.key,
      ticketId: issue.ticket.objectId,
      url: jira.getIssueUrl(issue.key),
    }));
  });

  const createIssueSchema = z.object({
    ticketId: z.string(),
  });
  router.post('/issues', async (ctx) => {
    const { ticketId } = createIssueSchema.parse(ctx.request.body);

    const _issue = await JiraIssue.queryBuilder()
      .where('ticket.objectId', '==', ticketId)
      .first({ useMasterKey: true });
    if (_issue) {
      return ctx.throw(409, `Issue for ticket ${ticketId} already exists`);
    }

    const ticket = await Ticket.find(ticketId, { useMasterKey: true });
    if (!ticket) {
      return ctx.throw(400, `Ticket ${ticketId} does not exist`);
    }

    const issue = await jira.createIssue(ticket);
    ctx.body = {
      key: issue.key,
      url: jira.getIssueUrl(issue.key),
    };
  });

  install('Jira', { router });
}
