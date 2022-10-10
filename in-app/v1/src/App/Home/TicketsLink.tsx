import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { http } from '@/leancloud';
import { useRootCategory } from '@/App';

interface TicketsLinkProps {
  badge?: boolean;
}

async function fetchUnread(categoryId?: string) {
  const { data } = await http.get<boolean>(`/api/2/unread`, {
    params: {
      product: categoryId,
    },
  });
  return data;
}

function useHasUnreadTickets(categoryId?: string) {
  return useQuery({
    queryKey: ['unread', categoryId],
    queryFn: () => fetchUnread(categoryId),
  });
}

export default function TicketsLink() {
  const rootCategory = useRootCategory();
  const { t } = useTranslation();
  const { data: hasUnreadTickets } = useHasUnreadTickets(rootCategory);
  return (
    <Link className="relative p-3 -mr-3 text-[13px] leading-none text-tapBlue" to="/tickets">
      {t('ticket.record')}
      {hasUnreadTickets && (
        <div className="h-1.5 w-1.5 bg-red rounded-full absolute top-0 right-0" />
      )}
    </Link>
  );
}
