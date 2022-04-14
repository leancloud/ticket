

import { format, startOfHour, endOfHour, subHours } from 'date-fns';
import { getTicketCurrentStatus, getTicketStatByDateRange } from './ticketStats';
import { TicketStats } from '@/model/TicketStats';
import { TicketStatusStats } from '@/model/TicketStatusStats';



const AUTH_OPTIONS = { useMasterKey: true };
// 正常调用不需要传递时间，云函数调用永远统计的是当前时间上一个小时的数据。
export async function hourlyTicketStats(date?: Date) {
  date = date ? date : subHours(new Date(), 1)
  const from = startOfHour(date)
  const to = endOfHour(date)
  try {
    const currentStatus = await getTicketCurrentStatus();
    TicketStatusStats.create({
      ACL: {},
      date: from,
      ...currentStatus,
    }, AUTH_OPTIONS)
    const statDataList = await getTicketStatByDateRange(from, to).then(list => list.map(v => {
      return {
        ...v,
        ACL: {},
        date: from
      }
    }))
    if (statDataList.length > 0) {
      const batchNumber = Math.ceil(statDataList.length / 50)
      for (let index = 0; index < batchNumber; index++) {
        await TicketStats.createSome(statDataList.slice(index * 50, (index + 1) * 50), AUTH_OPTIONS)
      }
    }
    console.log('[completed] :', format(from, 'yyyy-MM-dd HH'))
  } catch (error) {
    console.log('[ticketStat error]', `${format(from, 'yyyy-MM-dd HH')} to  ${format(to, 'yyyy-MM-dd HH')} error`, error)
  }
}
