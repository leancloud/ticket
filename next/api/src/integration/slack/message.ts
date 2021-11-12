import type { Reply } from '@/model/Reply';
import type { Ticket } from '@/model/Ticket';
import type { User } from '@/model/User';

export class Message {
  readonly content: string;

  protected color?: string;

  constructor(readonly summary: string, content: string) {
    if (content.length > 1000) {
      content = content.slice(0, 1000) + '...';
    }
    this.content = content;
  }

  toJSON() {
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: this.content,
        },
      },
    ];
    return {
      text: this.summary,
      attachments: [{ color: this.color, blocks }],
    };
  }
}

function getTicketLink(ticket: Ticket): string {
  return `<${ticket.getUrl()}|#${ticket.nid}>`;
}

export class NewTicketMessage extends Message {
  constructor(ticket: Ticket, author: User, assignee?: User) {
    let summary = `:envelope: ${author.getDisplayName()} 提交工单 ${getTicketLink(ticket)}`;
    if (assignee) {
      summary += ` 给 ${assignee.getDisplayName()}`;
    }
    super(summary, ticket.title + '\n\n' + ticket.content);
  }
}

export class ChangeAssigneeMessage extends Message {
  constructor(ticket: Ticket, operator: User, assignee?: User) {
    const assigneeName = assignee ? assignee.getDisplayName() : '<未分配>';
    const summary = `:arrows_counterclockwise: ${operator.getDisplayName()} 转移工单 ${getTicketLink(
      ticket
    )} 给 ${assigneeName}`;
    let content = ticket.title;
    if (ticket.latestReply) {
      content += '\n\n' + ticket.latestReply.content;
    }
    super(summary, content);
  }
}

export class ReplyTicketMessage extends Message {
  constructor(ticket: Ticket, reply: Reply, author: User) {
    super(
      `:speech_balloon: ${author.getDisplayName()} 回复工单 ${getTicketLink(ticket)}`,
      ticket.title + '\n\n' + reply.content
    );
  }
}

export class InternalReplyMessage extends Message {
  constructor(ticket: Ticket, reply: Reply, author: User) {
    super(
      `:shushing_face: ${author.getDisplayName()} 为工单 ${getTicketLink(ticket)} 添加内部回复`,
      ticket.title + '\n\n' + reply.content
    );
    this.color = '#f2c744';
  }
}

export class CloseTicketMessage extends Message {
  constructor(ticket: Ticket, operator: User) {
    super(
      `:red_circle: ${operator.getDisplayName()} 关闭了工单 ${getTicketLink(ticket)}`,
      ticket.title
    );
  }
}

export class ResolveTicketMessage extends Message {
  constructor(ticket: Ticket, operator: User) {
    super(
      `:white_check_mark: ${operator.getDisplayName()} 认为工单 ${getTicketLink(ticket)} 已解决`,
      ticket.title
    );
  }
}

export class EvaluateTicketMessage extends Message {
  constructor(ticket: Ticket, operator: User) {
    const { star, content } = ticket.evaluation!;
    const emoji = star ? ':thumbsup:' : ':thumbsdown:';
    super(
      `${emoji} ${operator.getDisplayName()} 评价工单 ${getTicketLink(ticket)}`,
      ticket.title + '\n\n' + content
    );
  }
}

export class DelayNotifyMessage extends Message {
  constructor(ticket: Ticket, assignee?: User) {
    const assigneeName = assignee ? assignee.getDisplayName() : '<未分配>';
    let content = ticket.title;
    if (ticket.latestReply) {
      content += '\n\n' + ticket.latestReply.content;
    }
    super(`:alarm_clock: 提醒 ${assigneeName} 回复工单 ${getTicketLink(ticket)}`, content);
  }
}
