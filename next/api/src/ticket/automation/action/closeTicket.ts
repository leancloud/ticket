import { ActionFactory } from '.';

const closeTicket: ActionFactory = () => ({
  exec: ({ updater }) => {
    updater.operate('close');
  },
});

export default closeTicket;
