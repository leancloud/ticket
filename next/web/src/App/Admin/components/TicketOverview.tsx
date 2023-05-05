import moment from 'moment';

import { useTicketOverview } from '@/api/ticket';
import { LoadingCover } from '@/components/common';
import { TicketStatus } from '@/App/Admin/components/TicketStatus';

interface TicketOverviewProps {
  ticketId: string;
}

export function TicketOverview({ ticketId }: TicketOverviewProps) {
  const { data: ticket, isLoading } = useTicketOverview(ticketId, {
    staleTime: Infinity,
    cacheTime: 1000 * 60,
  });

  return (
    <div className="w-[500px] min-h-[160px] p-4 bg-white rounded border shadow-xl">
      {isLoading && <LoadingCover />}
      {ticket && (
        <>
          <div className="flex items-center">
            <TicketStatus status={ticket.status} />
            <div className="ml-4">工单 #{ticket.nid}</div>
          </div>

          <div className="font-semibold mt-4">{ticket.title}</div>
          <div className="break-words mt-2">{truncate(ticket.content, 300)}</div>

          {ticket.latestReply && (
            <>
              <div className="border-b mt-4 pb-2">最新评论</div>
              <div className="flex items-center mt-2">
                <div className="font-semibold grow">{ticket.latestReply.author.nickname}</div>
                <div>{moment(ticket.latestReply.createdAt).fromNow()}</div>
              </div>
              <div className="break-words mt-2">{truncate(ticket.latestReply.content, 300)}</div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function truncate(content: string, maxLength: number) {
  if (content.length <= maxLength - 3) {
    return content;
  }
  return content.slice(0, maxLength) + '...';
}
