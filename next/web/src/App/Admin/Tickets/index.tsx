import { ComponentPropsWithoutRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { BsLayoutSidebarReverse } from 'react-icons/bs';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import cx from 'classnames';

import { useSearchParams } from '../../../utils/useSearchParams';
import { TicketItem } from './TicketItem';
import { Filter } from './Filter';
import { Ticket, useTickets } from './api';

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  active?: boolean;
}

function Button({ active, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={cx(
        'border border-gray-300 rounded h-8 px-2 transition-colors duration-200 text-gray-600',
        {
          'shadow-inner bg-gray-200': active,
          'hover:bg-gray-200': !disabled,
          'opacity-40 cursor-not-allowed': disabled,
        },
        props.className
      )}
    ></button>
  );
}

interface TopbarProps {
  showFilterPanel?: boolean;
  onClickFilterButton: () => void;
  currentRange: [number, number];
  totalCount: number;
  onClickPrevPage: () => void;
  onClickNextPage: () => void;
  hasPrefPage?: boolean;
  hasNextPage?: boolean;
}

function Topbar({
  showFilterPanel,
  onClickFilterButton,
  currentRange,
  totalCount,
  onClickPrevPage,
  onClickNextPage,
  hasPrefPage,
  hasNextPage,
}: TopbarProps) {
  return (
    <div className="flex-shrink-0 bg-gray-50 h-16 flex flex-row-reverse items-center px-6 border-b border-gray-200">
      <div className="flex items-center gap-2">
        <div className="text-sm text-gray-500 mx-1">
          {currentRange[0]} - {currentRange[1]} / {totalCount}
        </div>
        <div>
          <Button className="rounded-r-none" onClick={onClickPrevPage} disabled={!hasPrefPage}>
            <HiChevronLeft className="w-4 h-4" />
          </Button>
          <Button className="rounded-l-none" onClick={onClickNextPage} disabled={!hasNextPage}>
            <HiChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button active={showFilterPanel} onClick={onClickFilterButton}>
          <BsLayoutSidebarReverse className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

interface TicketListProps {
  tickets: Ticket[];
}

function TicketList({ tickets }: TicketListProps) {
  return (
    <div className="h-full p-3 flex-grow flex flex-col gap-2 overflow-y-auto">
      {tickets.map((ticket) => (
        <TicketItem
          key={ticket.id}
          title={ticket.title}
          nid={ticket.nid}
          author={ticket.author.name || ticket.author.username}
          status={ticket.status}
          createdAt={ticket.createdAt}
          updatedAt={ticket.updatedAt}
        />
      ))}
    </div>
  );
}

export default function Tickets() {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const params = useSearchParams();
  const page = parseInt(params.page || '1');
  const { data } = useTickets({
    page,
    params: {
      sort: 'createdAt-desc',
    },
  });
  const history = useHistory();
  const prevPage = () => history.push({ search: `page=${page - 1}` });
  const nextPage = () => history.push({ search: `page=${page + 1}` });

  return (
    <div className="h-full flex flex-col">
      <Topbar
        showFilterPanel={showFilterPanel}
        onClickFilterButton={() => setShowFilterPanel(!showFilterPanel)}
        currentRange={[(page - 1) * 20 + 1, Math.min(page * 20, data?.totalCount || 0)]}
        totalCount={data?.totalCount || 0}
        onClickPrevPage={prevPage}
        onClickNextPage={nextPage}
        hasPrefPage={page > 1}
        hasNextPage={page < (data?.totalCount || 0) / 20}
      />
      <div className="bg-gray-100 flex-grow flex overflow-hidden">
        {data && <TicketList tickets={data.tickets} />}
        {showFilterPanel && <Filter />}
      </div>
    </div>
  );
}
