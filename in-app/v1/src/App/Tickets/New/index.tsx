import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'react-query';
import { Helmet } from 'react-helmet-async';
import { pick, cloneDeep } from 'lodash-es';

import { http } from '@/leancloud';
import { Category, useCategories } from '@/api/category';
import { FieldItem, useTicketFormItems } from '@/api/ticket-form';
import { useTicketInfo } from '@/states/ticket-info';
import { useSearchParams } from '@/utils/url';
import { PageContent, PageHeader } from '@/components/Page';
import { Button } from '@/components/Button';
import { QueryWrapper } from '@/components/QueryWrapper';
import { Loading } from '@/components/Loading';
import CheckIcon from '@/icons/Check';
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
  const { meta, fields: presetFieldValues } = useTicketInfo();

  const { data: formItems, isLoading: loadingFormItems } = useTicketFormItems(category.formId!, {
    enabled: category.formId !== undefined,
    staleTime: 1000 * 60 * 5,
  });

  const items = useMemo<CustomFormItem[]>(() => {
    if (!category.formId) {
      return DEFAULT_FIELDS.map((field) => ({ type: 'field', data: field }));
    }
    return formItems ?? [];
  }, [category.formId, formItems]);

  const fields = useMemo(() => {
    const fieldItems = items.filter((item) => item.type === 'field') as FieldItem[];
    return fieldItems.map((item) => item.data);
  }, [items]);

  const { initData, onChange, clear } = usePersistFormData(category.id);

  const defaultValues = useMemo(() => {
    const defaultValues = cloneDeep(presetFieldValues ?? {});
    if (initData && fields) {
      // 目前无法根据文件 id 恢复文件字段的状态, 所以排除文件字段
      const ids = fields.filter((f) => f.type !== 'file').map((f) => f.id);
      Object.assign(defaultValues, pick(initData, ids));
    }
    return defaultValues;
  }, [presetFieldValues, initData, fields]);

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
      items={items}
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

async function createTicket(data: NewTicketData): Promise<string> {
  const res = await http.post<{ id: string }>('/api/2/tickets', data, {
    params: {
      storeUnknownField: 1,
    },
  });
  return res.data.id;
}

export function NewTicket() {
  const { t } = useTranslation();
  const { category_id } = useSearchParams();
  const { state: ticketId, search } = useLocation();
  const navigate = useNavigate();

  const result = useCategories();
  const { data: categories } = result;
  const category = useMemo(() => {
    if (categories) {
      return categories.find((c) => c.id === category_id || c.alias === category_id);
    }
  }, [categories, category_id]);

  const { mutateAsync: submit, isLoading: submitting } = useMutation({
    mutationFn: createTicket,
    onSuccess: (ticketId: string) => {
      navigate({ pathname: '', search }, { replace: false, state: ticketId });
    },
    onError: (error: Error) => alert(error.message),
  });

  if (categories && !category) {
    return <NotFound />;
  }
  return (
    <>
      <Helmet>{category && <title>{category.name}</title>}</Helmet>
      <PageHeader>{category?.name ?? t('general.loading') + '...'}</PageHeader>
      <PageContent>
        {ticketId ? (
          <Success ticketId={ticketId as string} />
        ) : (
          <QueryWrapper result={result}>
            <TicketForm category={category!} onSubmit={submit} submitting={submitting} />
          </QueryWrapper>
        )}
      </PageContent>
    </>
  );
}
