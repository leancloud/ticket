import { Query, Object } from 'leancloud-storage';
import { Notification } from '@/model/Notification';

export const migrateNotifications = async () => {
  const notificationIterator = {
    [Symbol.asyncIterator]() {
      return new Query('notification')
        .doesNotExist('category')
        .include('ticket')
        .scan(undefined, { useMasterKey: true });
    },
  };
  console.log('Migrating lagecy notifications');
  let i = 0;
  for await (const notification of notificationIterator) {
    console.log('Start process', notification.id, ++i);
    const ticket = notification.get('ticket');
    if (ticket) {
      await Notification.fromAVObject(notification as Object).update(
        {
          categoryId: ticket.get('category').objectId,
        },
        { useMasterKey: true }
      );
    }
  }
  console.log(`${i} notifications migrated`)
};
