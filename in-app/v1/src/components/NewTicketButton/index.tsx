import { Link } from 'react-router-dom';
import { Button } from '../Button';

export function NewTicketButton({ categoryId }: { categoryId: string }) {
  return (
    <Button
      as={Link}
      secondary
      to={`/tickets/new?category_id=${categoryId}`}
      className="inline-block px-8 text-tapBlue"
    >
      联系客服
    </Button>
  );
}
