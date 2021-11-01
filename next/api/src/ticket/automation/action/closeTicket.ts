import { Action } from '.';

const closeTicketSingleton: Action = {
  exec: (ctx) => {
    ctx.closeTicket();
  },
};

export default function () {
  return closeTicketSingleton;
}
