import { Link } from 'react-router-dom';
import { Button } from '../Button';
import { useTranslation } from 'react-i18next';

export function NewTicketButton({ categoryId }: { categoryId: string }) {
  const { t } = useTranslation();
  return (
    <Button
      as={Link}
      secondary
      to={`/tickets/new?category_id=${categoryId}`}
      className="inline-block px-8 text-tapBlue"
    >
      {t('ticket.contact')}
    </Button>
  );
}
