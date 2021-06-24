import { Redirect } from 'react-router-dom';

import { useSearchParams } from 'utils/url';
import { Page } from 'components/Page';
import { Loading } from 'components/Loading';
import { useCategory } from '../Categories';

function TicketForm() {
  return <div>{'<TicketForm />'}</div>;
}

export default function Tickets() {
  const { category_id } = useSearchParams();

  const { data: category, isLoading: isLoadingCategory, error: categoryError } = useCategory(
    category_id
  );

  if (!category) {
    if (!isLoadingCategory) {
      // Category is not exists :badbad:
      return <Redirect to="/home" />;
    }
  }

  return <Page title={category?.name}>{category ? <TicketForm /> : <Loading />}</Page>;
}
