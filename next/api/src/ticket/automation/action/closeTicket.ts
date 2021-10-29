import { Action } from '.';

const closeTicketSingleton: Action = {
  exec: (ctx) => {
    ctx.closeTicket();
  },
};

export function closeTicket() {
  return closeTicketSingleton;
}
