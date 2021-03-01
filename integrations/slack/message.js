/* eslint-disable i18n/no-chinese-character */

const moment = require('moment')
const { getTicketUrl, getUserDisplayName } = require('../../api/common')
const { isTicketOpen } = require('../../lib/common')

const ASSIGN_BOT_USERNAME = 'assign-bot'

function getMessageColor(ticket, assignee) {
  if (isTicketOpen(ticket)) {
    return assignee.get('username') === ASSIGN_BOT_USERNAME ? '#DC3545' : '#FFC107'
  } else {
    return '#198754'
  }
}

function getAssigneeDisplayName(assignee) {
  return assignee.has('slack_user_id') ? `<@${assignee.get('slack_user_id')}>` : getUserDisplayName(assignee)
}

function formatDate(date) {
  return moment(date).format('YYYY-MM-DD HH:mm:ss')
}

function basicMessage({
  messageText,
  color,
  title,
  createdAt,
  assignedTo,
  content,
  ticketNid,
  url,
  createdAtTitle = '创建时间',
  closeable = true,
}) {
  const actionButtons = [
    {
      type: 'button',
      text: {
        type: 'plain_text',
        text: '点击查看'
      },
      url
    }
  ]
  if (closeable) {
    actionButtons.push({
      type: 'button',
      text: {
        type: 'plain_text',
        text: '关闭工单'
      },
      style: 'danger',
      value: ticketNid,
      confirm: {
        style: 'danger',
        title: {
          type: 'plain_text',
          text: '要关闭工单吗？'
        },
        confirm: {
          type: 'plain_text',
          text: '确认关闭'
        },
        deny: {
          type: 'plain_text',
          text: '取消'
        }
      }
    })
  }

  return {
    text: messageText,
    attachments: [
      {
        color,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: title
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*${createdAtTitle}:*\n${createdAt}`
              },
              {
                type: 'mrkdwn',
                text: `*分配给:*\n${assignedTo}`
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*内容*:\n${content}`
            }
          },
          {
            type: 'actions',
            elements: actionButtons
          }
        ]
      }
    ]
  }
}

function newTicketMessage(ticket, assignee) {
  return basicMessage({
    messageText: '新工单',
    color: getMessageColor(ticket, assignee),
    title: ticket.get('title'),
    createdAt: formatDate(ticket.createdAt),
    assignedTo: getAssigneeDisplayName(assignee),
    content: ticket.get('content'),
    url: getTicketUrl(ticket),
    ticketNid: ticket.get('nid').toString(),
  })
}

function replyTicketMessage(ticket, assignee, reply) {
  return basicMessage({
    messageText: '用户回复工单',
    color: getMessageColor(ticket, assignee),
    title: ticket.get('title'),
    createdAtTitle: '回复时间',
    createdAt: formatDate(reply.createdAt),
    assignedTo: getAssigneeDisplayName(assignee),
    content: reply.get('content'),
    url: getTicketUrl(ticket),
    ticketNid: ticket.get('nid').toString(),
    closeable: isTicketOpen(ticket),
  })
}

function changeAssigneeMessage(ticket, assignee) {
  return basicMessage({
    messageText: '工单负责人被修改',
    color: getMessageColor(ticket, assignee),
    title: ticket.get('title'),
    createdAt: formatDate(ticket.createdAt),
    assignedTo: getAssigneeDisplayName(assignee),
    content: ticket.get('content'),
    url: getTicketUrl(ticket),
    ticketNid: ticket.get('nid').toString(),
    closeable: isTicketOpen(ticket),
  })
}

module.exports = { newTicketMessage, changeAssigneeMessage, replyTicketMessage }
