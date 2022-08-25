import { Ticket } from '@/model/Ticket';
import _ from 'lodash';
import { TicketLog, getLogDataByTicket } from '@/model/TicketLog';
import { retry } from '../utils';
import { ClickHouse } from '@/orm/clickhouse';

const getFromDate = async () => {
  try {
    const lastTicketLog = await new ClickHouse()
      .from('TicketLog')
      .select('ticketCreatedAt')
      .orderBy(['ticketCreatedAt', 'desc'])
      .limit(1)
      .find();
    if (lastTicketLog && lastTicketLog.length > 0) {
      return new Date(lastTicketLog[0].ticketCreatedAt);
    }
  } catch (error) {
    console.log('ticketLog no data');
  }

  const firstTicket = await Ticket.queryBuilder().orderBy('createdAt', 'asc').first({
    useMasterKey: true,
  });
  if (firstTicket) {
    return firstTicket.createdAt;
  }
  return;
};

async function syncTicketLogToClickHouse(from?: Date, limit = 50, skip = 0) {
  if (!from) {
    console.log('no ticket insert ticket log');
    return;
  }
  const query = Ticket.queryBuilder().where('createdAt', '>=', from).limit(limit).skip(skip);
  const tickets = await query.find({
    useMasterKey: true,
  });
  const logs = tickets.map((ticket) => getLogDataByTicket(ticket));
  retry(() => {
    return TicketLog.createSome(logs, {
      useMasterKey: true,
    });
  });
  console.log(`ticket: ${skip} - ${skip + limit} insert success`);
  if (tickets.length === limit) {
    await syncTicketLogToClickHouse(from, limit, limit + skip);
  }
}

export async function syncTicketLog() {
  const from = await getFromDate();
  const count = await Ticket.queryBuilder().where('createdAt', '>=', from).count({
    useMasterKey: true,
  });
  if (count > 2000) {
    // 转为异步 理论上每个独立部署只会同步一次，不值的专门建立一个 class 用日志即可
    syncTicketLogToClickHouse(from);
    return {
      msg: '同步进行中,请在云引擎日志中检查同步进程。',
    };
  } else {
    await syncTicketLogToClickHouse(from);
    return {
      msg: '同步完成',
    };
  }
}
