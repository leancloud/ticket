import { useMemo, useState } from 'react';
import { Link, Redirect } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon } from '@heroicons/react/solid';
import { useMutation, useQuery } from 'react-query';
import i18next from 'i18next';

import { Field } from 'types';
import { useSearchParams } from 'utils/url';
import { useUpload } from 'utils/useUpload';
import { Page } from 'components/Page';
import { Button } from 'components/Button';
import { Uploader } from 'components/Uploader';
import { QueryWrapper } from 'components/QueryWrapper';
import { SpaceChinese } from 'components/SpaceChinese';
import { useCategory } from '../../Categories';
import { FieldTemplate, FormGroup, useForm } from './Form';
import { http } from 'leancloud';

const PRESET_FORM_FIELDS_HEAD: FieldTemplate[] = [
  {
    name: 'title',
    title: i18next.t('general.title'),
    type: 'text',
    required: true,
  },
];

const PRESET_FORM_FIELDS_FOOT: FieldTemplate[] = [
  {
    name: 'content',
    title: i18next.t('general.description'),
    type: 'multi-line',
    rows: 4,
    maxLength: 100,
    required: true,
  },
];

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
  file_ids: string[];
}

interface TicketFormProps {
  categoryId: string;
  onCommit: (data: NewTicketData) => any | Promise<any>;
}

function TicketForm({ categoryId, onCommit }: TicketFormProps) {
  const { t } = useTranslation();
  const { files, upload, remove, isUploading } = useUpload();
  const [isCommitting, setIsCommitting] = useState(false);

  const { data: fields, isLoading: isLoadingFields } = useCategoryFields(categoryId);
  const formFields = useMemo(() => {
    return [...PRESET_FORM_FIELDS_HEAD, ...(fields ?? []), ...PRESET_FORM_FIELDS_FOOT];
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
      file_ids: files.map((file) => file.id!),
      form_values: Object.entries(fieldValues).map(([id, value]) => ({ field: id, value })),
    };
    try {
      setIsCommitting(true);
      await onCommit(data);
    } catch {
      setIsCommitting(false);
    }
  };

  return (
    <div className="p-4 sm:px-8 sm:py-6">
      {formElement}
      <FormGroup controlId="ticket_file" title={t('general.attachment')}>
        <Uploader
          files={files}
          onUpload={(files) => upload(files[0])}
          onDelete={({ key }) => remove(key)}
        />
      </FormGroup>
      <Button
        className="sm:ml-20 w-full sm:max-w-max sm:px-11"
        disabled={isLoadingFields || isCommitting || isUploading}
        onClick={handleCommit}
      >
        <SpaceChinese>{t('general.commit')}</SpaceChinese>
      </Button>
    </div>
  );
}

interface SuccessProps {
  ticketId: string;
}

function Success({ ticketId }: SuccessProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col justify-center items-center h-full">
      <CheckCircleIcon className="w-12 h-12 text-tapBlue-600" />
      <div className="text-gray-500 mt-8">{t('ticket.create.success_text')}</div>
      <Button className="mt-4 px-12" as={Link} to={`/tickets/${ticketId}`}>
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
    <Page title={result.data?.name}>
      <QueryWrapper result={result}>
        {ticketId ? (
          <Success ticketId={ticketId} />
        ) : (
          <TicketForm categoryId={category_id} onCommit={commit} />
        )}
      </QueryWrapper>
    </Page>
  );
}
