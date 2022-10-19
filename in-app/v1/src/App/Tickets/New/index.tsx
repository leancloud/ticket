import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'react-query';
import { pick } from 'lodash-es';

import { http } from '@/leancloud';
import { CategoryFieldSchema, useCategoryFields } from '@/api/category';
import { useSearchParams } from '@/utils/url';
import { PageContent, PageHeader } from '@/components/NewPage';
import { Button } from '@/components/Button';
import { QueryWrapper } from '@/components/QueryWrapper';
import CheckIcon from '@/icons/Check';
import { useCategory } from '../../Categories';
import { useTicketInfo } from '../..';
import NotFound from '../../NotFound';
import { CustomForm } from './CustomForm';
import { usePersistFormData } from './usePersistFormData';
import { Helmet } from 'react-helmet-async';
import { useFAQs } from '@/App/Articles/utils';
import { FAQs } from '@/App/Categories';

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
  metaData?: Record<string, any>;
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
      metaData: meta ?? undefined,
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
    <PageContent className="pt-10 flex-1" shadow>
      <div className="text-center">
        <div className="flex w-9 h-9 mx-auto rounded-full bg-tapBlue">
          <CheckIcon className="w-4 h-4 m-auto text-white" />
        </div>
        <div className="text-[#666] mt-10">{t('ticket.create.success_text')}</div>
        <Button className="inline-block w-32 mt-4" as={Link} to={`/tickets/${ticketId}`}>
          {t('ticket.detail')}
        </Button>
      </div>
    </PageContent>
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

  const { data: faqs, isLoading: FAQsIsLoading, isSuccess: FAQsIsReady } = useFAQs(category_id);

  if (!ticketId && !result.data && !result.isLoading && !result.error) {
    // Category is not exists :badbad:
    return <NotFound />;
  }
  return (
    <>
      <Helmet>{result.data?.name && <title>{result.data.name}</title>}</Helmet>
      <PageHeader>{result.data?.name ?? t('general.loading') + '...'}</PageHeader>
      {ticketId ? (
        <Success ticketId={ticketId as string} />
      ) : (
        <QueryWrapper result={result}>
          <FAQs className="mb-6" faqs={faqs} showAll={false} />
          {faqs && faqs.length && (
            <PageContent className="bg-transparent mb-3 py-0" title={t('feedback.submit')} />
          )}
          <TicketForm categoryId={category_id} onSubmit={submit} submitting={submitting} />
        </QueryWrapper>
      )}
    </>
  );
}
