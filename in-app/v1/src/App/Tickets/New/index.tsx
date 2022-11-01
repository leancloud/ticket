import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'react-query';
import { Helmet } from 'react-helmet-async';
import { pick } from 'lodash-es';

import { http } from '@/leancloud';
import { FieldItem, useTicketFormItems } from '@/api/ticket-form';
import { useSearchParams } from '@/utils/url';
import { PageContent, PageHeader } from '@/components/Page';
import { Button } from '@/components/Button';
import { QueryWrapper } from '@/components/QueryWrapper';
import { Loading } from '@/components/Loading';
import CheckIcon from '@/icons/Check';
import { Category } from '@/types';
import { useCategory } from '../../Categories';
import { useTicketInfo } from '../..';
import NotFound from '../../NotFound';
import { CustomForm, CustomFieldConfig, CustomFormItem } from './CustomForm';
import { usePersistFormData } from './usePersistFormData';

const DEFAULT_FIELDS: CustomFieldConfig[] = [
  {
    id: 'title',
    type: 'text',
    title: 'title',
    required: true,
  },
  {
    id: 'description',
    type: 'multi-line',
    title: 'description',
    required: true,
  },
];

interface NewTicketData {
  categoryId: string;
  title: string;
  content: string;
  fileIds?: string[];
  customFields?: {
    field: string;
    value: string | string[];
  }[];
  tags?: {
    key: string;
    value: string;
  }[];
  metaData?: Record<string, any>;
}

interface TicketFormProps {
  category: Category;
  onSubmit: (data: NewTicketData) => Promise<any>;
  submitting?: boolean;
}

function TicketForm({ category, onSubmit, submitting }: TicketFormProps) {
  const { meta } = useTicketInfo();

  const { data: formItems, isLoading: loadingFormItems } = useTicketFormItems(category.formId!, {
    enabled: category.formId !== undefined,
    staleTime: 1000 * 60 * 5,
  });

  const _items = useMemo<CustomFormItem[]>(() => {
    if (!category.formId) {
      return DEFAULT_FIELDS.map((field) => ({ type: 'field', data: field }));
    }
    return formItems ?? [];
  }, [category.formId, formItems]);

  const fields = useMemo(() => {
    const fieldItems = _items.filter((item) => item.type === 'field') as FieldItem[];
    return fieldItems.map((item) => item.data);
  }, [_items]);

  const { initData, onChange, clear } = usePersistFormData(category.id);

  const defaultValues = useMemo(() => {
    if (initData && fields) {
      return pick(
        initData,
        fields.filter((f) => f.type !== 'file').map((f) => f.id)
      );
    }
  }, [initData, fields]);

  const handleSubmit = (data: Record<string, any>) => {
    const { title, description, ...fieldValues } = data;
    onSubmit({
      categoryId: category.id,
      title: title,
      content: description,
      customFields: Object.entries(fieldValues).map(([id, value]) => ({ field: id, value })),
      metaData: meta ?? undefined,
    }).then(clear);
  };

  if (loadingFormItems) {
    return <Loading />;
  }

  return (
    <CustomForm
      items={_items}
      defaultValues={defaultValues}
      onChange={onChange}
      onSubmit={handleSubmit}
      submitting={submitting}
    />
  );
}

interface SuccessProps {
  ticketId: string;
}

function Success({ ticketId }: SuccessProps) {
  const { t } = useTranslation();

  return (
    <div className="text-center mt-12 sm:m-auto">
      <div className="flex w-9 h-9 mx-auto rounded-full bg-tapBlue">
        <CheckIcon className="w-4 h-4 m-auto text-white" />
      </div>
      <div className="text-[#666] mt-10">{t('ticket.create.success_text')}</div>
      <Button className="inline-block w-32 mt-4" as={Link} to={`/tickets/${ticketId}`}>
        {t('ticket.detail')}
      </Button>
    </div>
  );
}

async function commitTicket(data: NewTicketData): Promise<string> {
  const {
    data: { id },
  } = await http.post<{ id: string }>('/api/2/tickets', data);
  return id;
}

export function NewTicket() {
  const { t } = useTranslation();
  const { category_id } = useSearchParams();
  const result = useCategory(category_id);
  const { state: ticketId, search } = useLocation();
  const navigate = useNavigate();

  const { mutateAsync: submit, isLoading: submitting } = useMutation({
    mutationFn: commitTicket,
    onSuccess: (ticketId: string) =>
      navigate({ pathname: '', search }, { replace: false, state: ticketId }),
    onError: (error: Error) => alert(error.message),
  });

  if (!ticketId && !result.data && !result.isLoading && !result.error) {
    // Category is not exists :badbad:
    return <NotFound />;
  }
  return (
    <>
      <Helmet>{result.data?.name && <title>{result.data.name}</title>}</Helmet>
      <PageHeader>{result.data?.name ?? t('general.loading') + '...'}</PageHeader>
      <PageContent>
        {ticketId ? (
          <Success ticketId={ticketId as string} />
        ) : (
          <QueryWrapper result={result}>
            {(category) => (
              <TicketForm category={category} onSubmit={submit} submitting={submitting} />
            )}
          </QueryWrapper>
        )}
      </PageContent>
    </>
  );
}
