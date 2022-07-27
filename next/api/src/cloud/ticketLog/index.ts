import throat from 'throat';
import { Ticket } from '@/model/Ticket';
import { TicketLog } from '@/model/TicketLog';
import { retry } from '../utils';

const run = throat(2);

export async function syncTicketLog(from?: Date, limit = 100, skip = 0) {
  if (from === undefined) {
    const firstTicket = await Ticket.queryBuilder().orderBy('createdAt', 'asc').first({
      useMasterKey: true,
    });
    if (firstTicket === undefined) {
      console.log('no ticket insert ticket log');
      return;
    }
    from = firstTicket.createdAt;
  }
  const query = Ticket.queryBuilder().where('createdAt', '>=', from).limit(limit).skip(skip);
  const tickets = await query.find({
    useMasterKey: true,
  });
  await Promise.all(
    tickets.map((ticket) =>
      run(() =>
        retry(() =>
          TicketLog.createByTicket(ticket).catch((err) => {
            console.log(`ticket insert error: ${ticket.id} ${ticket.nid}`);
          })
        )
      )
    )
  );
  console.log(`ticket: ${limit}, ${skip} insert success`);
  if (tickets.length === limit) {
    await syncTicketLog(from, limit, limit + skip);
  }
}
