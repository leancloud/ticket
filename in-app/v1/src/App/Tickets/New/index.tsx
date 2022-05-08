import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'react-query';
import { pick } from 'lodash-es';

import { http } from '@/leancloud';
import { CategoryFieldSchema, useCategoryFields } from '@/api/category';
import { useSearchParams } from '@/utils/url';
import { PageContent, PageHeader } from '@/components/Page';
import { Button } from '@/components/Button';
import { QueryWrapper } from '@/components/QueryWrapper';
import CheckIcon from '@/icons/Check';
import { useCategory } from '../../Categories';
import { useTicketInfo } from '../..';
import NotFound from '../../NotFound';
import { CustomForm } from './CustomForm';
import { usePersistFormData } from './usePersistFormData';

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
  metadata?: Record<string, any>;
}

interface TicketFormProps {
  categoryId: string;
  onSubmit: (data: NewTicketData) => Promise<any>;
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

  const { initData, onChange, clear } = usePersistFormData(categoryId);

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
      categoryId,
      title: title,
      content: description,
      customFields: Object.entries(fieldValues).map(([id, value]) => ({ field: id, value })),
      metadata: meta ?? undefined,
    }).then(clear);
  };

  return (
    <QueryWrapper result={result}>
      <CustomForm
        fields={fields}
        defaultValues={defaultValues}
        onChange={onChange}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
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
  } = await http.post<{ id: string }>('/api/2/tickets', data);
  return id;
}

export function NewTicket() {
  const { t } = useTranslation();
  const { category_id } = useSearchParams();
  const result = useCategory(category_id);
  const { state: ticketId } = useLocation();
  const navigate = useNavigate();

  const { mutateAsync: submit, isLoading: submitting } = useMutation({
    mutationFn: commitTicket,
    onSuccess: (ticketId: string) => navigate('', { replace: false, state: ticketId }),
    onError: (error: Error) => alert(error.message),
  });

  if (!ticketId && !result.data && !result.isLoading && !result.error) {
    // Category is not exists :badbad:
    return <NotFound />;
  }
  return (
    <>
      <PageHeader>{result.data?.name ?? t('general.loading') + '...'}</PageHeader>
      <PageContent>
        {ticketId ? (
          <Success ticketId={ticketId as string} />
        ) : (
          <QueryWrapper result={result}>
            <TicketForm categoryId={category_id} onSubmit={submit} submitting={submitting} />
          </QueryWrapper>
        )}
      </PageContent>
    </>
  );
}
