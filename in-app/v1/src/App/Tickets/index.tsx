import { useMemo, Fragment } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { InView } from 'react-intersection-observer';
import { flatten } from 'lodash-es';
import { Helmet } from 'react-helmet-async';
import { Tab } from '@headlessui/react';
import classNames from 'classnames';

import { TicketListItem } from '@/types';
import { QueryWrapper } from '@/components/QueryWrapper';
import { PageContent, PageHeader } from '@/components/Page';
import { Time } from '@/components/Time';
import { LoadingHint } from '@/components/Loading';
import { useAppState } from '@/states/app';
import TicketDetail, { TicketStatus, TicketResolvedStatus } from './Ticket';
import { NewTicket } from './New';
import styles from './index.module.css';
import { useTickets } from './hooks/useTickets';

interface TicketItemProps {
  ticket: TicketListItem;
}

function TicketItem({ ticket }: TicketItemProps) {
  const { t } = useTranslation();

  return (
    <div className="h-[68px] flex justify-between items-center border-b border-gray-100">
      <div className="overflow-hidden">
        <div className="text-sm">
          <TicketStatus className="mr-3" status={ticket.status} />
          <span className="text-[#BFBFBF] whitespace-nowrap">
            {t('general.update_time')}: <Time value={new Date(ticket.updatedAt)} />
          </span>
        </div>
        <div className="mt-1.5 truncate text-[13px]">{ticket.title}</div>
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
  const result = useTickets({ status });
  const { data, hasNextPage, fetchNextPage } = result;
  const noData = useMemo(() => !data?.pages[0]?.length, [data]);
  const tickets = useMemo(() => flatten(data?.pages), [data]);
  return (
    <QueryWrapper result={result} noData={noData}>
      <div className="-my-3">
        {tickets.map((ticket) => (
          <Link key={ticket.id} className="block active:bg-gray-50" to={`/tickets/${ticket.id}`}>
            <TicketItem ticket={ticket} />
          </Link>
        ))}
        <InView
          className="flex justify-center items-center w-full h-12 text-[#BFBFBF] text-[13px]"
          onChange={(inView) => inView && fetchNextPage()}
        >
          {hasNextPage ? <LoadingHint /> : t('ticket.no_more_record')}
        </InView>
      </div>
    </QueryWrapper>
  );
};

export function TicketList() {
  const { t } = useTranslation();
  const [{ historyIndex }, setAppState] = useAppState();

  return (
    <>
      <Helmet>
        <title>{t('ticket.record')}</title>
      </Helmet>
      <PageHeader>{t('ticket.record')}</PageHeader>
      <PageContent shadow>
        <Tab.Group
          selectedIndex={historyIndex}
          onChange={(historyIndex) => setAppState((p) => ({ ...p, historyIndex }))}
        >
          <Tab.List className="flex -mx-4 px-4 border-b border-gray-100 text-base text-[#888]">
            <Tab as={Fragment}>
              {({ selected }) => (
                <button className={classNames(styles.tab, selected && styles.active)}>
                  {t('ticket.unResolved')}
                </button>
              )}
            </Tab>
            <Tab as={Fragment}>
              {({ selected }) => (
                <button className={classNames(styles.tab, selected && styles.active)}>
                  {t('ticket.resolved')}
                </button>
              )}
            </Tab>
          </Tab.List>
          <div className="mt-3">
            <TicketResults
              status={
                historyIndex === 0 ? TicketResolvedStatus.unResolved : TicketResolvedStatus.resolved
              }
            />
          </div>
        </Tab.Group>
      </PageContent>
    </>
  );
}

export default function Tickets() {
  return (
    <Routes>
      <Route index element={<TicketList />} />
      <Route path="new" element={<NewTicket />} />
      <Route path=":id" element={<TicketDetail />} />
    </Routes>
  );
}
