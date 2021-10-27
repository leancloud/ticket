import { Action } from '.';

const closeTicketSingleton: Action = {
  exec: ({ updater }) => {
    updater.operate('close');
  },
};

export function closeTicket() {
  return closeTicketSingleton;
}
