import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from 'react-query';
import i18next from 'i18next';

import { Field } from 'types';
import { useSearchParams } from 'utils/url';
import { Page } from 'components/Page';
import { Button } from 'components/Button';
import { QueryWrapper } from 'components/QueryWrapper';
import { SpaceChinese } from 'components/SpaceChinese';
import CheckIcon from 'icons/Check';
import { useCategory } from '../../Categories';
import { FieldTemplate, useForm } from './Form';
import { http } from 'leancloud';
import { useTicketInfo } from '../..';

const presetFieldCreators: Record<string, (() => FieldTemplate) | undefined> = {
  title: () => ({
    name: 'title',
    title: i18next.t('general.title'),
    type: 'text',
    required: true,
  }),
  description: () => ({
    name: 'content',
    title: i18next.t('general.description'),
    type: 'multi-line',
    rows: 4,
    maxLength: 100,
    required: true,
  }),
};

async function fetchCategoryFields(categoryId: string): Promise<FieldTemplate[]> {
  const { data } = await http.get<Field[]>(`/api/2/categories/${categoryId}/fields`);
  return data.map((field) => ({ ...field, name: field.id }));
}

function useCategoryFields(categoryId: string) {
  return useQuery({
    queryKey: ['fields', { categoryId }],
    queryFn: () => fetchCategoryFields(categoryId),
    staleTime: 1000 * 60 * 5,
  });
}

interface NewTicketData {
  category_id: string;
  title: string;
  content: string;
  file_ids?: string[];
}

interface TicketFormProps {
  categoryId: string;
  onCommit: (data: NewTicketData) => any | Promise<any>;
}

function TicketForm({ categoryId, onCommit }: TicketFormProps) {
  const { t } = useTranslation();
  const [isCommitting, setIsCommitting] = useState(false);
  const { meta, tags } = useTicketInfo();

  const result = useCategoryFields(categoryId);
  const { data: fields } = result;

  const formFields = useMemo(() => {
    if (!fields) {
      return [];
    }
    if (fields.length === 0) {
      // 没有为当期分类配置表单时, 展示 title & description.
      return Object.values(presetFieldCreators).map((creator) => creator!());
    }
    return fields.map((field) => {
      if (field.name in presetFieldCreators) {
        return presetFieldCreators[field.name]!();
      } else {
        return field;
      }
    });
  }, [fields]);
  const { element: formElement, validate, data: formData } = useForm(formFields);

  const handleCommit = async () => {
    if (!validate()) {
      return;
    }
    const { title, content, ...fieldValues } = formData;
    const data = {
      category_id: categoryId,
      title: title as string,
      content: content as string,
      form_values: Object.entries(fieldValues).map(([id, value]) => ({ field: id, value })),
      metadata: meta,
      tags,
    };
    try {
      setIsCommitting(true);
      await onCommit(data);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <QueryWrapper result={result}>
      <div className="px-5 sm:px-10 pt-7 pb-5">
        {formElement}
        <Button
          className="sm:ml-20 w-full sm:max-w-max sm:px-11"
          disabled={isCommitting}
          onClick={handleCommit}
        >
          <SpaceChinese>{t('general.commit')}</SpaceChinese>
        </Button>
      </div>
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

  const { mutateAsync: commit } = useMutation({
    mutationFn: commitTicket,
    onSuccess: setTicketId,
    onError: (error: Error) => alert(error.message),
  });

  if (!result.data && !result.isLoading && !result.error) {
    // Category is not exists :badbad:
    return <>Category is not found</>;
  }
  return (
    <Page>
      <Page.Header>{result.data?.name ?? t('general.loading') + '...'}</Page.Header>
      <Page.Content>
        <QueryWrapper result={result}>
          {ticketId ? (
            <Success ticketId={ticketId} />
          ) : (
            <TicketForm categoryId={category_id} onCommit={commit} />
          )}
        </QueryWrapper>
      </Page.Content>
      <Page.Footer />
    </Page>
  );
}
