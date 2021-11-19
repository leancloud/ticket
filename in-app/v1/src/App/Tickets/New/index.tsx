import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'react-query';

import { CategoryFieldSchema, useCategoryFields } from '@/api/category';
import { useSearchParams } from 'utils/url';
import { PageContent, PageHeader } from 'components/Page';
import { Button } from 'components/Button';
import { QueryWrapper } from 'components/QueryWrapper';
import CheckIcon from 'icons/Check';
import { useCategory } from '../../Categories';
import { http } from 'leancloud';
import { useTicketInfo } from '../..';
import NotFound from '../../NotFound';
import { CustomForm } from './CustomForm';

const presetFields: CategoryFieldSchema[] = [
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
  category_id: string;
  title: string;
  content: string;
  file_ids?: string[];
  form_values?: {
    field: string;
    value: string | string[];
  }[];
  tags?: {
    key: string;
    value: string;
  }[];
  metadata?: Record<string, any>;
}

interface TicketFormProps {
  categoryId: string;
  onSubmit: (data: NewTicketData) => void;
  submitting?: boolean;
}

function TicketForm({ categoryId, onSubmit, submitting }: TicketFormProps) {
  const { meta } = useTicketInfo();
  const result = useCategoryFields(categoryId);
  const fields = useMemo(() => {
    if (!result.data) {
      return [];
    }
    if (result.data.length === 0) {
      // 没有为当前分类配置自定义表单时展示预设字段
      return presetFields;
    }
    return result.data;
  }, [result.data]);

  const handleSubmit = (data: Record<string, any>) => {
    const { title, description, ...fieldValues } = data;
    onSubmit({
      category_id: categoryId,
      title: title,
      content: description,
      form_values: Object.entries(fieldValues).map(([id, value]) => ({ field: id, value })),
      metadata: meta ?? undefined,
    });
  };

  return (
    <QueryWrapper result={result}>
      <CustomForm fields={fields} onSubmit={handleSubmit} submitting={submitting} />
    </QueryWrapper>
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
  } = await http.post<{ id: string }>('/api/1/tickets', data);
  return id;
}

export function NewTicket() {
  const { t } = useTranslation();
  const { category_id } = useSearchParams();
  const result = useCategory(category_id);
  const [ticketId, setTicketId] = useState<string>();

  const { mutateAsync: submit, isLoading: submitting } = useMutation({
    mutationFn: commitTicket,
    onSuccess: setTicketId,
    onError: (error: Error) => alert(error.message),
  });

  if (!result.data && !result.isLoading && !result.error) {
    // Category is not exists :badbad:
    return <NotFound />;
  }
  return (
    <>
      <PageHeader>{result.data?.name ?? t('general.loading') + '...'}</PageHeader>
      <PageContent>
        <QueryWrapper result={result}>
          {ticketId ? (
            <Success ticketId={ticketId} />
          ) : (
            <TicketForm categoryId={category_id} onSubmit={submit} submitting={submitting} />
          )}
        </QueryWrapper>
      </PageContent>
    </>
  );
}
