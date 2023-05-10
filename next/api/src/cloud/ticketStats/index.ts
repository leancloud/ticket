import throat from 'throat';
import {
  addDays,
  differenceInSeconds,
  getDay,
  isAfter,
  isBefore,
  isSameDay,
  set,
  format,
  startOfHour,
  endOfHour,
  subHours,
} from 'date-fns';
import _ from 'lodash';

import { CreateData } from '@/orm/model';
import { Config } from '@/config';
import { Status, Ticket } from '@/model/Ticket';
import { TicketStats } from '@/model/TicketStats';
import { TicketStatusStats } from '@/model/TicketStatusStats';
import {
  getTicketStatIds,
  getTicketDataById,
  parseTicketData,
  mergeData,
  MERGE_SEPARATOR,
} from './utils';

const AUTH_OPTIONS = { useMasterKey: true };

type WeekdayDuration = Record<'hours' | 'minutes' | 'seconds', number>;
const getReplyTimeConfig = async () => {
  const config = {
    workTime: 0,
    days: [] as Day[],
    from: {
      hours: 0,
      minutes: 0,
      seconds: 0,
    } as WeekdayDuration,
    to: {
      hours: 19,
      minutes: 59,
      seconds: 59,
    } as WeekdayDuration,
  };
  const weekday: Day[] | undefined = await Config.get('weekday');
  if (!weekday) {
    throw new Error('未设置工作日，请先设置工作日后再进行统计。');
  }
  const weekdayDateRange: Record<'from' | 'to', WeekdayDuration> | undefined = await Config.get(
    'work_time'
  );
  if (!weekdayDateRange) {
    throw new Error('未设置工作时间范围，请先设置工作时间范围后再进行统计。');
  }
  config.days = weekday;
  config.from = weekdayDateRange.from;
  config.to = weekdayDateRange.to;
  const tmpDate = new Date();
  config.workTime = differenceInSeconds(set(tmpDate, config.to), set(tmpDate, config.from));
  return config;
};
type ReplyConfig = Awaited<ReturnType<typeof getReplyTimeConfig>>;
const getRelyTimeFuc = (config: ReplyConfig) => (replyDate: Date, askDate: Date) => {
  let time = 0;
  if (config.days.includes(getDay(askDate))) {
    const from = set(askDate, config.from);
    const to = set(askDate, config.to);
    if (isBefore(askDate, from)) {
      time = config.workTime;
    } else if (isAfter(askDate, to)) {
      time = 0;
    } else {
      time = differenceInSeconds(to, askDate);
    }
  }
  while (!isSameDay(replyDate, askDate)) {
    askDate = addDays(askDate, 1);
    if (config.days.includes(getDay(askDate))) {
      time = time + config.workTime;
    }
  }
  if (config.days.includes(getDay(replyDate))) {
    const replyFrom = set(replyDate, config.from);
    const replyTo = set(replyDate, config.to);
    if (isBefore(replyDate, replyFrom)) {
      time = time - config.workTime;
    } else {
      if (isBefore(replyDate, replyTo)) {
        time = time - differenceInSeconds(replyTo, replyDate);
      }
    }
  }
  return time > 0 ? time : 0;
};

function getTicketCurrentStatus() {
  return Promise.all(
    [
      Status.NEW,
      Status.WAITING_CUSTOMER,
      Status.WAITING_CUSTOMER_SERVICE,
      Status.PRE_FULFILLED,
      Status.FULFILLED,
      Status.CLOSED,
    ].map((status) => Ticket.queryBuilder().where('status', '==', status).count(AUTH_OPTIONS))
  ).then(
    ([notProcessed, waitingCustomer, waitingCustomerService, preFulfilled, fulfilled, closed]) => {
      return {
        notProcessed,
        waitingCustomer,
        waitingCustomerService,
        preFulfilled,
        fulfilled,
        closed,
      };
    }
  );
}

async function getTicketStatByDateRange(from: Date, to: Date) {
  const config = await getReplyTimeConfig();
  const getRelyTime = getRelyTimeFuc(config);
  const ids = await getTicketStatIds(from, to);
  if (ids.length === 0) {
    return [];
  }
  const run = throat(2);
  let results: ReturnType<typeof mergeData> = {
    customerService: {},
    category: {},
    customerServiceCategory: {},
    details: [],
  };
  await Promise.all(
    ids.map((id) =>
      run(() =>
        getTicketDataById(id, to).then((value) => {
          if (!value) {
            return;
          }
          results = mergeData(results, parseTicketData(value, from, getRelyTime));
        })
      )
    )
  );
  if (!results.ticket) {
    return [];
  }
  const ticketStats: CreateData<TicketStats>[] = [
    results.ticket,
    ...Object.entries(results.category).map(([categoryId, statData]) => ({
      ...statData,
      categoryId,
      replyDetails: results.details
        .filter((v) => v.categoryId === categoryId)
        .map((value) => _.omit(value, 'categoryId', 'authorId')),
    })),
    ...Object.entries(results.customerService).map(([customerServiceId, statData]) => ({
      ...statData,
      customerServiceId,
      replyDetails: results.details
        .filter((v) => v.authorId === customerServiceId)
        .map((value) => _.omit(value, 'categoryId', 'authorId')),
    })),
    ...Object.entries(results.customerServiceCategory).map(
      ([customerServiceCategory, statData]) => {
        const [customerServiceId, categoryId] = customerServiceCategory.split(MERGE_SEPARATOR);
        return {
          ...statData,
          categoryId,
          customerServiceId,
          replyDetails: results.details
            .filter((v) => v.authorId === customerServiceId && v.categoryId === categoryId)
            .map((value) => _.omit(value, 'categoryId', 'authorId')),
        };
      }
    ),
  ];
  return ticketStats;
}

// 正常调用不需要传递时间，云函数调用永远统计的是当前时间上一个小时的数据。
export async function hourlyTicketStats(date?: Date) {
  date = date ? date : subHours(new Date(), 1);
  const from = startOfHour(date);
  const to = endOfHour(date);
  try {
    const currentStatus = await getTicketCurrentStatus();
    TicketStatusStats.create(
      {
        ACL: {},
        date: from,
        ...currentStatus,
      },
      AUTH_OPTIONS
    );
    const statDataList = await getTicketStatByDateRange(from, to).then((list) =>
      list.map((v) => {
        return {
          ...v,
          ACL: {},
          date: from,
        };
      })
    );
    const batchSize = 10;
    if (statDataList.length > 0) {
      const batchNumber = Math.ceil(statDataList.length / batchSize);
      for (let index = 0; index < batchNumber; index++) {
        await TicketStats.createSome(
          statDataList.slice(index * batchSize, (index + 1) * batchSize),
          AUTH_OPTIONS
        );
      }
    }
    console.log('[completed] :', format(from, 'yyyy-MM-dd HH'));
  } catch (error) {
    console.log(
      '[ticketStat error]',
      `${format(from, 'yyyy-MM-dd HH')} to  ${format(to, 'yyyy-MM-dd HH')} error`,
      error
    );
  }
}
