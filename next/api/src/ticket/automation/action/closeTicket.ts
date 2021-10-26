import { Action } from '.';

const closeTicket: Action = {
  exec: ({ updater }) => {
    updater.operate('close');
  },
};

export default function (): Action {
  return closeTicket;
}
