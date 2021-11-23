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
  let title = ticket.title;
  if (title.length > 50) {
    title = title.slice(0, 47) + '...';
  }
  return `<${ticket.getUrl()}|*#${ticket.nid}: ${title}*>`;
}

export class NewTicketMessage extends Message {
  constructor(ticket: Ticket, author: User, assignee?: User) {
    let summary = `:envelope: ${author.getDisplayName()} 提交工单`;
    if (assignee) {
      summary += `给 ${assignee.getDisplayName()}`;
    }
    super(summary, `${getTicketLink(ticket)}\n\n${ticket.content}`);
  }
}

export class ChangeAssigneeMessage extends Message {
  constructor(ticket: Ticket, operator: User, assignee?: User) {
    const assigneeName = assignee ? assignee.getDisplayName() : '<未分配>';
    const summary = `:arrows_counterclockwise: ${operator.getDisplayName()} 将工单转移给 ${assigneeName}`;
    let content = getTicketLink(ticket);
    if (ticket.latestReply) {
      content += '\n\n' + ticket.latestReply.content;
    }
    super(summary, content);
  }
}

export class ReplyTicketMessage extends Message {
  constructor(ticket: Ticket, reply: Reply, author: User) {
    super(
      `:speech_balloon: ${author.getDisplayName()} 回复工单`,
      `${getTicketLink(ticket)}\n\n${reply.content}`
    );
  }
}

export class InternalReplyMessage extends Message {
  constructor(ticket: Ticket, reply: Reply, author: User) {
    super(
      `:shushing_face: ${author.getDisplayName()} 提交内部回复`,
      `${getTicketLink(ticket)}\n\n${reply.content}`
    );
    this.color = '#f2c744';
  }
}

export class CloseTicketMessage extends Message {
  constructor(ticket: Ticket, operator: User) {
    super(`:red_circle: ${operator.getDisplayName()} 关闭工单`, getTicketLink(ticket));
  }
}

export class ResolveTicketMessage extends Message {
  constructor(ticket: Ticket, operator: User) {
    super(`:white_check_mark: ${operator.getDisplayName()} 认为工单已解决`, getTicketLink(ticket));
  }
}

export class EvaluateTicketMessage extends Message {
  constructor(ticket: Ticket, operator: User) {
    const { star, content } = ticket.evaluation!;
    const emoji = star ? ':thumbsup:' : ':thumbsdown:';
    super(
      `${emoji} ${operator.getDisplayName()} 评价工单`,
      `${getTicketLink(ticket)}\n\n${content}`
    );
  }
}

export class DelayNotifyMessage extends Message {
  constructor(ticket: Ticket, assignee?: User) {
    const assigneeName = assignee ? assignee.getDisplayName() : '<未分配>';
    let content = getTicketLink(ticket);
    if (ticket.latestReply) {
      content += '\n\n' + ticket.latestReply.content;
    }
    super(`:alarm_clock: 提醒 ${assigneeName} 回复工单`, content);
  }
}
