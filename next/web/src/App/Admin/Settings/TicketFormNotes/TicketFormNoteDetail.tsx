import { useQueryClient } from 'react-query';
import { Link, useParams } from 'react-router-dom';
import { useTicketFormNoteDetail, useUpdateTicketFormNote } from '@/api/ticket-form-note';
import { LoadingCover } from '@/components/common';
import { EditTicketFormNoteForm } from './TicketFormNoteForm';
import { TranslationList } from '../../components/TranslationList';
import { Breadcrumb } from 'antd';

interface TicketFormNoteTranslationListProps {
  loading: boolean;
  languages?: string[];
  defaultLanguage?: string;
  onChangeDefault: (language: string) => void;
  changeDefaultLoading: boolean;
}

const TicketFormNoteTranslationList = ({
  loading,
  languages,
  defaultLanguage,
  onChangeDefault,
  changeDefaultLoading,
}: TicketFormNoteTranslationListProps) => (
  <TranslationList
    data={languages?.map((l) => ({ language: l }))}
    loading={loading}
    defaultLanguage={defaultLanguage}
    onChangeDefault={({ language }) => {
      onChangeDefault(language);
    }}
    changeDefaultLoading={changeDefaultLoading}
  />
);

export function TicketFormNoteDetail() {
  const { id } = useParams() as { id: string };
  const queryClient = useQueryClient();

  const { data, isLoading } = useTicketFormNoteDetail(id, {
    staleTime: 1000 * 10,
  });

  const { mutate, isLoading: updating } = useUpdateTicketFormNote({
    onSuccess: (data) => {
      queryClient.setQueryData(['ticketFormNote', data.id], data);
    },
  });

  return (
    <div className="p-10">
      {isLoading && <LoadingCover />}

      <div className="mb-4">
        <Breadcrumb className="grow">
          <Breadcrumb.Item>
            <Link to="../..">表单说明</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item className="text-gray-300">{data?.id}</Breadcrumb.Item>
        </Breadcrumb>
      </div>

      <EditTicketFormNoteForm
        data={data}
        onSubmit={(data) => mutate([id, data])}
        submitting={updating}
        active={data?.active}
        onChangeActive={data && (() => mutate([data.id, { active: !data.active }]))}
      >
        <TicketFormNoteTranslationList
          defaultLanguage={data?.defaultLanguage}
          languages={data?.languages}
          loading={isLoading}
          onChangeDefault={(language) => mutate([id, { defaultLanguage: language }])}
          changeDefaultLoading={updating}
        />
      </EditTicketFormNoteForm>
    </div>
  );
}
