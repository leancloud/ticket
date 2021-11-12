import { Ticket } from '@/model/Ticket';

enum COLOR {
  RED = '#DC3545',
  YELLOW = '#FFC107',
  ORANGE = '#FD7E14',
  GREEN = '#198754',
}

function getColor(ticket: Ticket, hasJiraIssue: boolean): COLOR {
  if (ticket.isClosed()) {
    return COLOR.GREEN;
  }
  if (hasJiraIssue) {
    return COLOR.ORANGE;
  }
  if (ticket.assigneeId) {
    return COLOR.YELLOW;
  }
  return COLOR.RED;
}

interface Action {
  type: 'actions';
  elements: any[];
}

function getAction(ticket: Ticket): Action {
  const action: Action = {
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '查看工单',
        },
        url: ticket.getUrl(),
      },
    ],
  };
  if (!ticket.isClosed()) {
    action.elements.push({
      type: 'button',
      text: {
        type: 'plain_text',
        text: '关闭工单',
      },
      style: 'danger',
      value: ticket.id,
      confirm: {
        style: 'danger',
        title: {
          type: 'plain_text',
          text: '要关闭工单吗？',
        },
        confirm: {
          type: 'plain_text',
          text: '确认关闭',
        },
        deny: {
          type: 'plain_text',
          text: '取消',
        },
      },
    });
  }
  return action;
}

function formatDate(date: Date): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  const unixTime = Math.floor(date.getTime() / 1000);
  return `<!date^${unixTime}^{date_num} {time_secs}|${date.toISOString()}>`;
}

export function message(ticket: Ticket, assigneeName: string, hasJiraIssue = false) {
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: ticket.title,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*创建时间:*\n${formatDate(ticket.createdAt)}`,
        },
        {
          type: 'mrkdwn',
          text: `*负责人:*\n${assigneeName}`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*内容*:\n${ticket.content}`,
      },
    },
  ];

  if (ticket.latestReply) {
    const { author } = ticket.latestReply;
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*最新回复*:\n> _${author.name || author.username} 于 ${formatDate(
          ticket.latestReply.createdAt
        )}_\n${ticket.latestReply.content}`,
      },
    });
  }

  return {
    attachments: [
      {
        color: getColor(ticket, hasJiraIssue),
        blocks: [...blocks, getAction(ticket)],
      },
    ],
  };
}
