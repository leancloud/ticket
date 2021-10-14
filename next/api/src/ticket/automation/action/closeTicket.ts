import { ActionFactory } from './common';

const closeTicket: ActionFactory = () => ({
  exec: ({ updater }) => {
    updater.operate('close');
  },
});

export default closeTicket;
