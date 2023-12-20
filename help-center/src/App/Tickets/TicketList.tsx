import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Radio } from '@/components/antd';
import { useInfiniteQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import { InView } from 'react-intersection-observer';
import { flatten } from 'lodash-es';
import { Helmet } from 'react-helmet-async';
import { auth, http } from '@/leancloud';
import { useRootCategory } from '@/states/root-category';
import { TicketListItem } from '@/types';
import { Time } from '@/components/Time';
import { Loading, LoadingHint } from '@/components/Loading';
import { NoData } from '@/components/NoData';
import { TicketStatus, TicketResolvedStatus } from './Ticket';

const TICKETS_PAGE_SIZE = 20;

async function fetchTickets({
  categoryId,
  page,
  status,
}: {
  categoryId?: string;
  page?: number;
  status?: TicketResolvedStatus;
}): Promise<TicketListItem[]> {
  const { data } = await http.get<any[]>('/api/2/tickets', {
    params: {
      authorId: auth.currentUser?.id,
      product: categoryId,
      page,
      pageSize: TICKETS_PAGE_SIZE,
      orderBy: 'latestCustomerServiceReplyAt-desc',
      include: 'unreadCount',
      status,
    },
  });
  return data.map((ticket) => ({
    id: ticket.id,
    nid: ticket.nid,
    title: ticket.title,
    status: ticket.status,
    unreadCount: ticket.unreadCount,
    files: ticket.files,
    evaluation: ticket.evaluation,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  }));
}

export function useTickets(status: TicketResolvedStatus) {
  const category = useRootCategory();
  return useInfiniteQuery<TicketListItem[], Error>({
    queryKey: ['tickets', { status }],
    queryFn: ({ pageParam = 1 }) =>
      fetchTickets({ categoryId: category.id, page: pageParam, status }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === TICKETS_PAGE_SIZE) {
        return allPages.length + 1;
      }
    },
  });
}

interface TicketItemProps {
  ticket: TicketListItem;
}

function TicketItem({ ticket }: TicketItemProps) {
  const { t } = useTranslation();

  return (
    <div className="flex justify-between items-center border-b  p-4">
      <div className="overflow-hidden">
        <div className="text-neutral-600">
          <TicketStatus className="mr-3" status={ticket.status} />
          <span className="whitespace-nowrap">
            {t('general.update_time')}: <Time value={new Date(ticket.updatedAt)} />
          </span>
        </div>
        <div className="mt-1.5 truncate text-[16px]">{ticket.title}</div>
      </div>
      {ticket.unreadCount > 0 && (
        <div className="shrink-0 ml-2 w-[18px] leading-[18px] px-1 min-w-min bg-red rounded-full text-white text-xs text-center">
          {ticket.unreadCount}
        </div>
      )}
    </div>
  );
}

const TicketResults = ({ status }: { status: TicketResolvedStatus }) => {
  const { t } = useTranslation();
  const result = useTickets(status);
  const { data, hasNextPage, fetchNextPage, isLoading } = result;
  const noData = useMemo(() => !data?.pages[0]?.length, [data]);
  const tickets = useMemo(() => flatten(data?.pages), [data]);

  if (noData && isLoading) {
    return <Loading />;
  }

  if (noData) {
    return <NoData className="py-8" />;
  }

  return (
    <div>
      {tickets.map((ticket) => (
        <Link key={ticket.id} className="block active:bg-gray-50" to={`/tickets/${ticket.id}`}>
          <TicketItem ticket={ticket} />
        </Link>
      ))}
      <InView
        className="flex justify-center items-center w-full h-12 text-neutral-600"
        onChange={(inView) => inView && fetchNextPage()}
      >
        {hasNextPage ? <LoadingHint /> : t('ticket.no_more_record')}
      </InView>
    </div>
  );
};

const TYPES = ['unResolved', 'resolved'];

export default function TicketList() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const type = TYPES.includes(searchParams.get('type') || '') ? searchParams.get('type') : TYPES[0];

  return (
    <div className="content">
      <Helmet>
        <title>{t('ticket.record')}</title>
      </Helmet>
      <div className="text-xl text-center">{t('ticket.record')}</div>
      <div className="mt-6 mb-3">
        <Radio.Group
          value={type}
          onChange={(e) => {
            searchParams.set('type', e.target.value);
            setSearchParams(searchParams);
          }}
        >
          <Radio.Button value="unResolved">{t('ticket.unResolved')}</Radio.Button>
          <Radio.Button value="resolved">{t('ticket.resolved')}</Radio.Button>
        </Radio.Group>
      </div>
      <div className="bg-background rounded-md">
        <TicketResults
          status={
            type === 'unResolved' ? TicketResolvedStatus.unResolved : TicketResolvedStatus.resolved
          }
        />
      </div>
    </div>
  );
}
