import {
  format,
  startOfDay,
  subDays,
  startOfWeek,
  subWeeks,
  startOfMonth,
  subMonths,
  endOfDay,
  endOfWeek,
  endOfMonth,
} from 'date-fns';
import _ from 'lodash';

import { categoryService } from '@/category';
import { CreateSlackPlus } from '@/integration/slack-plus';
import { Category } from '@/model/Category';
import { Status, Ticket } from '@/model/Ticket';
import { type SumTicketStat, TicketStats } from '@/model/TicketStats';
import type { ExtractArrayType } from '@/utils/types';

interface ISimplifiedCategory {
  id: string;
  name: string;
  subCategories: { id: string; name: string }[];
}

type ProductsWithSubCategories = (ISimplifiedCategory & {
  childCategories: ISimplifiedCategory[];
})[];

const getProductsWithSubCategories = async (): Promise<ProductsWithSubCategories> => {
  const products = await Category.queryBuilder().where('alias', 'exists').find();

  return Promise.all(
    products.map(async ({ id, name }) => {
      const subCategories = await categoryService.getSubCategories(id);

      return {
        id,
        name,
        childCategories: subCategories
          .filter(({ parentId }) => parentId === id)
          .map(({ id, name }) => ({
            id,
            name,
            subCategories: subCategories
              .filter(({ parentId }) => parentId === id)
              .map(({ id, name }) => ({ id, name })),
          })),
        subCategories: subCategories.map(({ id, name }) => ({ id, name })),
      };
    })
  );
};

interface StatsForSlack
  extends Pick<
    SumTicketStat,
    | 'created'
    | 'closed'
    | 'firstReplyTime'
    | 'firstReplyCount'
    | 'replyTime'
    | 'replyTimeCount'
    | 'likeCount'
    | 'dislikeCount'
  > {
  active?: number;
  firstReplyTimeAVG?: number;
  replyTimeAVG?: number;
  lastPeriodCreated?: number;
  likeRate?: number;
}

interface CategoryStats {
  id: string;
  name: string;
  stats: StatsForSlack;
}

type PushType = 'daily' | 'weekly' | 'monthly';

const processProductStats = async (
  info: ExtractArrayType<ProductsWithSubCategories>,
  from: Date,
  to: Date
): Promise<CategoryStats & { childCategories: CategoryStats[] }> => {
  const childCategoryStats = await Promise.all(
    info.childCategories.map(async ({ subCategories, ...rest }) => {
      const stats =
        (await TicketStats.fetchTicketStats({
          from,
          to,
          categoryIds: subCategories.map(({ id }) => id),
        })) ?? {};

      const active = await Ticket.queryBuilder()
        .where(
          'category',
          'in',
          [...subCategories, { id: rest.id, name: rest.name }].map(({ id, name }) => ({
            objectId: id,
            name,
          }))
        )
        .where('status', 'in', [
          Status.NEW,
          Status.WAITING_CUSTOMER,
          Status.WAITING_CUSTOMER_SERVICE,
        ])
        .count({ useMasterKey: true });

      return {
        ...rest,
        stats: {
          ...stats,
          active,
          likeRate: stats.likeCount! / (stats.dislikeCount! + stats.likeCount!),
          firstReplyTimeAVG: stats.firstReplyTime! / stats.firstReplyCount!,
          replyTimeAVG: stats.replyTime! / stats.replyTimeCount!,
          naturalReplyTimeAVG: stats.naturalReplyTime! / stats.naturalReplyCount!,
        } as StatsForSlack,
      };
    })
  );

  const tempTotalCategoryStats = childCategoryStats.reduce<StatsForSlack>(
    (acc, cur) => _.mergeWith(acc, cur.stats, (a = 0, b = 0) => a + b),
    {} as StatsForSlack
  );

  return {
    id: info.id,
    name: info.name,
    childCategories: childCategoryStats,
    stats: {
      ...tempTotalCategoryStats,
      likeRate:
        tempTotalCategoryStats.likeCount! /
        (tempTotalCategoryStats.likeCount! + tempTotalCategoryStats.dislikeCount!),
      firstReplyTimeAVG:
        tempTotalCategoryStats.firstReplyTime! / tempTotalCategoryStats.firstReplyCount! || 0,
      replyTimeAVG: tempTotalCategoryStats.replyTime! / tempTotalCategoryStats.replyTimeCount! || 0,
    },
  };
};

const generateRate = (oldValue: number, newValue: number | undefined) =>
  (newValue !== undefined && oldValue)
    ? `${oldValue < newValue ? '↑ ' : oldValue > newValue ? '↓ ' : ''}${(
        Math.abs((newValue - oldValue) / oldValue) * 100
      ).toFixed(1)}`
    : '--';

const fieldValueWrapper = (value: number | undefined, formatter: (value: number) => string) =>
  (value !== undefined && !Number.isNaN(value)) ? formatter(value) : '--';

const StatsFieldText: {
  key: keyof StatsForSlack;
  name: string;
  type?: PushType[];
  formatter?: (value: number | undefined, data: StatsForSlack) => string;
}[] = [
  { key: 'created', name: '新建工单' },
  {
    key: 'lastPeriodCreated',
    name: '环比',
    type: ['monthly', 'weekly'],
    formatter: (value, data) =>
      `${fieldValueWrapper(value, (v) => generateRate(v, data.created))} %`,
  },
  { key: 'closed', name: '关单数' },
  { key: 'active', name: '活跃工单数' },
  {
    key: 'firstReplyTimeAVG',
    name: '平均首次回复时间',
    type: ['monthly', 'weekly'],
    formatter: (value) => `${fieldValueWrapper(value, (v) => (v / 3600).toFixed(2))} 小时`,
  },
  {
    key: 'replyTimeAVG',
    name: '平均回复时间',
    type: ['monthly', 'weekly'],
    formatter: (value) => `${fieldValueWrapper(value, (v) => (v / 3600).toFixed(2))} 小时`,
  },
  {
    key: 'likeRate',
    name: '好评率',
    type: ['monthly', 'weekly'],
    formatter: (value) => `${fieldValueWrapper(value, (v) => (v * 100).toFixed(1))} %`,
  },
];

const generateProductStatsTable = (stats: StatsForSlack, type: PushType) =>
  StatsFieldText.filter(({ type: fieldType }) => !fieldType || fieldType.includes(type))
    .map(
      ({ key, name, formatter }) =>
        `${name}: \`${formatter ? formatter(stats[key], stats) : stats[key] ?? '--'}\``
    )
    .join('  ');

const generateTitle = (startDate: Date, endDate: Date, type: PushType) =>
  type === 'daily'
    ? `${format(startDate, 'yyyy/M/d')} 日报`
    : type === 'monthly'
    ? `${format(startDate, 'yyyy/M')} 月报`
    : `${format(startDate, 'yyyy/M/d')} - ${format(endDate, 'yyyy/M/d')} 周报`;

const generateStatsReport = (
  stats: CategoryStats & { childCategories: CategoryStats[] },
  startDate: Date,
  endDate: Date,
  type: PushType
) => [
  `${stats.name}: \n${generateProductStatsTable(stats.stats, type)}`,
  ...stats.childCategories.map(
    ({ id, name, stats }) =>
      `• <${
        process.env.TICKET_HOST
      }/next/admin/tickets?createdAt=${startDate.toISOString()}..${endDate.toISOString()}&rootCategoryId=${id}|${name}>: ${
        type === 'daily'
          ? `\`${stats.created ?? '--'}\``
          : `环比 \`${fieldValueWrapper(stats.lastPeriodCreated, (v) =>
              generateRate(v, stats.created)
            )} %\`  上周期 \`${stats.lastPeriodCreated ?? '--'}\`  本周期 \`${
              stats.created ?? '--'
            }\``
      }`
  ),
];

const startOfPeriod = (type: PushType, date?: Date) =>
  type === 'daily'
    ? startOfDay(subDays(date ?? new Date(), 1))
    : type === 'weekly'
    ? startOfWeek(subWeeks(date ?? new Date(), 1))
    : startOfMonth(subMonths(date ?? new Date(), 1));

const endOfPeriod = (type: PushType, date?: Date) =>
  type === 'daily'
    ? endOfDay(subDays(date ?? new Date(), 1))
    : type === 'weekly'
    ? endOfWeek(subWeeks(date ?? new Date(), 1))
    : endOfMonth(subMonths(date ?? new Date(), 1));

const startOfLastPeriod = (type: PushType, date?: Date) =>
  type === 'daily'
    ? startOfDay(subDays(date ?? new Date(), 2))
    : type === 'weekly'
    ? startOfWeek(subWeeks(date ?? new Date(), 2))
    : startOfMonth(subMonths(date ?? new Date(), 2));

export const pushStatsToSlackFactory = (type: PushType) => async (date?: Date) => {
  const fromDate = startOfPeriod(type, date);
  const toDate = endOfPeriod(type, date);

  const slackInstance = await CreateSlackPlus.get();

  if (slackInstance) {
    const reports = await Promise.all(
      (await getProductsWithSubCategories()).map(async (info) => {
        const stats = await processProductStats(info, fromDate, toDate);

        if (type !== 'daily') {
          const lastStats = await processProductStats(
            info,
            startOfLastPeriod(type, date),
            startOfPeriod(type, date)
          );

          stats.stats.lastPeriodCreated = lastStats.stats.created;

          const lastChildrenStats = _.keyBy(lastStats.childCategories, ({ id }) => id);

          stats.childCategories.forEach((child) => {
            child.stats.lastPeriodCreated = lastChildrenStats[child.id].stats.created;
          });
        }

        return generateStatsReport(stats, fromDate, toDate, type).map((msg) => ({
          type: 'section',
          text: { type: 'mrkdwn', text: msg },
        }));
      })
    );

    const ts = await slackInstance.postMessage([
      {
        type: 'header',
        text: { type: 'plain_text', text: generateTitle(fromDate, toDate, type), emoji: true },
      },
    ]);

    await Promise.all(
      reports.map(async (msg) => {
        await slackInstance.postMessage(msg, ts);
      })
    );
  }
};

export const dailyPushStatsToSlack = pushStatsToSlackFactory('daily');

export const weeklyPushStatsToSlack = pushStatsToSlackFactory('weekly');

export const monthlyPushStatsToSlack = pushStatsToSlackFactory('monthly');
