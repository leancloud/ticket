import notification from '@/notification';

export default function (install: Function) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  notification.on('newTicket', ({ ticket, from, to }) => {
    console.log(
      `[DEBUG] ${from.getDisplayName()} 提交工单 #${ticket.nid} 给 ${to?.getDisplayName()}`
    );
  });

  notification.on('replyTicket', ({ ticket, reply, from, to }) => {
    console.log(
      `[DEBUG] ${from.getDisplayName()} 回复工单 #${ticket.nid} 给 ${to?.getDisplayName()}\n  ${
        reply.content
      }`
    );
  });

  notification.on('changeAssignee', ({ ticket, from, to }) => {
    console.log(
      `[DEBUG] ${from.getDisplayName()} 将工单 #${
        ticket.nid
      } 的负责人修改为 ${to?.getDisplayName()}`
    );
  });

  notification.on('changeStatus', ({ ticket, originalStatus, status, from }) => {
    console.log(
      `[DEBUG] ${from.getDisplayName()} 将工单 #${
        ticket.nid
      } 的状态修改为 ${originalStatus} => ${status}`
    );
  });

  notification.on('ticketEvaluation', ({ ticket, from }) => {
    console.log(`[DEBUG] ${from.getDisplayName()} 评价工单:`, ticket.evaluation);
  });

  install('Debug', {});
}
