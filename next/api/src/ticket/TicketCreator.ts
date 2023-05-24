import _ from 'lodash';
import { Detector, LangCodeISO6391 } from '@notevenaneko/whatlang-node';

import events from '@/events';
import { ACLBuilder } from '@/orm';
import htmlify from '@/utils/htmlify';
import { Category } from '@/model/Category';
import { Group } from '@/model/Group';
import { OpsLogCreator } from '@/model/OpsLog';
import { Organization } from '@/model/Organization';
import { Ticket } from '@/model/Ticket';
import { FieldValue, TicketFieldValue } from '@/model/TicketFieldValue';
import { User, systemUser } from '@/model/User';
import { TicketLog } from '@/model/TicketLog';
import { allowedTicketLanguages } from '@/utils/locale';
import { durationMetricService } from './services/duration-metric';

const detector = Detector.withAllowlist(allowedTicketLanguages);

export class TicketCreator {
  private author?: User;
  private reporter?: User;
  private organization?: Organization;
  private category?: Category;
  private title?: string;
  private content?: string;
  private contentHTML?: string;
  private fileIds?: string[];
  private metaData?: Record<string, any>;
  private customFields?: FieldValue[];
  private assignee?: User;
  private group?: Group;
  private language?: LangCodeISO6391;
  private channel?: string;

  private aclBuilder: ACLBuilder;

  constructor() {
    this.aclBuilder = new ACLBuilder().allowCustomerService('read', 'write').allowStaff('read');
  }

  getRawACL() {
    return this.aclBuilder.toJSON();
  }

  setAuthor(author: User): this {
    this.author = author;
    this.aclBuilder.allow(author, 'read', 'write');
    return this;
  }

  setReporter(reporter: User): this {
    this.reporter = reporter;
    return this;
  }

  setOrganization(organization: Organization): this {
    this.organization = organization;
    this.aclBuilder.allowOrgMember(organization, 'read', 'write');
    return this;
  }

  setCategory(category: Category): this {
    this.category = category;
    return this;
  }

  setTitle(title: string): this {
    this.title = title;
    return this;
  }

  setContent(content: string): this {
    this.content = content;
    this.contentHTML = htmlify(content);
    return this;
  }

  setFileIds(fileIds: string[]): this {
    if (fileIds.length) {
      this.fileIds = fileIds;
    }
    return this;
  }

  setMetaData(metaData: Record<string, any>): this {
    this.metaData = metaData;
    return this;
  }

  appendMetaData(metaData: Record<string, any>): this {
    if (this.metaData) {
      Object.assign(this.metaData, metaData);
      return this;
    }
    return this.setMetaData(metaData);
  }

  setCustomFields(customFields: FieldValue[]): this {
    if (customFields.length) {
      this.customFields = customFields;
    }
    return this;
  }

  setAssignee(assignee: User): this {
    this.assignee = assignee;
    this.aclBuilder.allow(assignee, 'read', 'write');
    return this;
  }

  setGroup(group: Group): this {
    this.group = group;
    return this;
  }

  setChannel(channel: string) {
    this.channel = channel;
    return this;
  }

  check(): boolean {
    return (
      this.author !== undefined &&
      this.category !== undefined &&
      this.title !== undefined &&
      this.content !== undefined &&
      this.contentHTML !== undefined
    );
  }

  private async selectAssignee() {
    if (this.assignee) return;

    let category = this.category;
    if (!category) {
      throw new Error('The category is required for select assignee');
    }

    const customerServices = await User.getCustomerServicesOnDuty();
    if (customerServices.length === 0) {
      return;
    }

    while (category) {
      const categoryId = category.id;
      const candidates = customerServices.filter((u) => u.categoryIds?.includes(categoryId));
      if (candidates.length) {
        this.setAssignee(_.sample(candidates)!);
        break;
      }
      if (!category.parentId) {
        break;
      }
      category = await category.load('parent');
    }
  }

  private async selectGroup() {
    if (this.group) return;

    let category = this.category;
    if (!category) {
      throw new Error('The category is required for select group');
    }

    while (category) {
      if (category.groupId) {
        const group = await category.load('group', { useMasterKey: true });
        if (group) {
          this.setGroup(group);
        }
        break;
      }
      if (!category.parentId) {
        break;
      }
      category = await category.load('parent');
    }
  }

  private async saveCustomFields(ticket: Ticket) {
    if (!this.customFields) {
      return;
    }
    await TicketFieldValue.create(
      {
        ACL: {},
        ticketId: ticket.id,
        values: this.customFields,
      },
      { useMasterKey: true }
    );
  }

  private assignRelatedInstance(ticket: Ticket) {
    ticket.author = this.author;
    ticket.organization = this.organization;
    ticket.assignee = this.assignee;
    ticket.group = this.group;
  }

  private async createOpsLogs(ticket: Ticket) {
    const olc = new OpsLogCreator(ticket);
    if (this.assignee) {
      olc.selectAssignee(this.assignee);
    }
    if (this.group) {
      olc.changeGroup(this.group, systemUser);
    }
    await olc.create();
  }

  private async detectLanguage() {
    const lang = this.content && detector.detect(this.content);

    // sometimes output lang code does not exist in allowlist
    if (lang && lang.isReliable && allowedTicketLanguages.includes(lang.lang.codeISO6391)) {
      this.language = lang.lang.codeISO6391;
    }
  }

  async create(operator: User): Promise<Ticket> {
    if (!this.check()) {
      throw new Error('Missing some required attributes');
    }

    try {
      await this.selectAssignee();
    } catch (error) {
      // TODO: Sentry
      console.error('[ERROR] Select assignee failed:', error);
    }
    try {
      await this.selectGroup();
    } catch (error) {
      // TODO: Sentry
      console.error('[ERROR] Select group failed:', error);
    }

    try {
      await this.detectLanguage();
    } catch (error) {
      console.log('[ERROR] Language detect failed', error);
    }

    const ticket = await Ticket.create(
      {
        ACL: this.getRawACL(),
        authorId: this.author!.id,
        reporterId: this.reporter?.id,
        organizationId: this.organization?.id,
        category: this.category,
        title: this.title,
        content: this.content,
        contentHTML: this.contentHTML,
        fileIds: this.fileIds,
        metaData: this.metaData,
        assigneeId: this.assignee?.id,
        groupId: this.group?.id,
        status: Ticket.Status.NEW,
        language: this.language,
        channel: this.channel,
      },
      {
        useMasterKey: true,
        ignoreBeforeHook: true,
        ignoreAfterHook: true,
      }
    );

    try {
      await this.saveCustomFields(ticket);
    } catch (error) {
      // TODO: Sentry
      console.error('[ERROR] Save custom field failed, error:', error);
    }

    this.assignRelatedInstance(ticket);

    this.createOpsLogs(ticket).catch((error) => {
      // TODO: Sentry
      console.error('[ERROR] save OpsLog failed, error:', error);
    });

    TicketLog.createByTicket(ticket).catch((error) => {
      console.error('[ERROR] save TicketLog failed, error:', error);
    });

    events.emit('ticket:created', {
      ticket,
      currentUserId: operator.id,
      customFields: this.customFields,
    });

    await durationMetricService.createMetric(ticket);

    return ticket;
  }
}
