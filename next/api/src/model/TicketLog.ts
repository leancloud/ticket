import _ from 'lodash';
import { Model, field, ModifyOptions } from '@/orm';
import { TinyUserInfo } from './User';
import { Evaluation, LatestReply, Tag, Ticket } from './Ticket';

export function getLogDataByTicket(ticket: Ticket) {
  return {
    ACL: {},
    ticketId: ticket.id,
    ticketCreatedAt: ticket.createdAt,
    ticketUpdatedTime: ticket.updatedAt.getTime(),
    privateTags: ticket.privateTags || [],
    ..._.pick(
      ticket,
      'assigneeId',
      'authorId',
      'categoryId',
      'evaluation',
      'firstCustomerServiceReplyAt',
      'groupId',
      'joinedCustomerServices',
      'latestCustomerServiceReplyAt',
      'latestReply',
      'nid',
      'replyCount',
      'status',
      'tags',
      'metaData',
      'title',
      'organizationId'
    ),
  };
}

export class TicketLog extends Model {
  @field()
  ticketId!: string;

  @field()
  assigneeId!: string;

  @field()
  authorId!: string;

  @field()
  categoryId!: string;

  @field()
  evaluation?: Evaluation;

  @field()
  firstCustomerServiceReplyAt?: Date;

  @field()
  groupId?: string;

  @field()
  joinedCustomerServices?: TinyUserInfo[];

  @field()
  latestCustomerServiceReplyAt?: Date;

  @field()
  latestReply?: LatestReply;

  @field()
  metaData?: Record<string, any>;

  @field()
  nid!: number;

  @field()
  organizationId?: string;

  @field()
  privateTags?: Tag[];

  @field()
  replyCount?: number;

  @field()
  status!: number;

  @field()
  tags?: Tag[];

  @field()
  title!: string;

  @field()
  ticketCreatedAt!: Date;

  @field()
  ticketUpdatedTime!: number;

  static async createByTicket(ticket: Ticket, options?: ModifyOptions) {
    return TicketLog.create(
      getLogDataByTicket(ticket),
      options || {
        useMasterKey: true,
      }
    );
  }
}
