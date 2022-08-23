import _ from 'lodash';
import { Model, field, ModifyOptions } from '@/orm';
import { TinyUserInfo } from './User';
import { Evaluation, LatestReply, Tag, Ticket } from './Ticket';

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
  ticketUpdatedAt!: number;

  static async createByTicket(ticket: Ticket, options?: ModifyOptions) {
    return TicketLog.create(
      {
        ACL: {},
        ticketId: ticket.id,
        ticketCreatedAt: ticket.createdAt,
        ticketUpdatedAt: ticket.updatedAt.getTime(),
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
      },
      options || {
        useMasterKey: true,
      }
    );
  }
}
