import { useQueryClient } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  UseTicketFormNoteTranslationKey,
  useTicketFormNoteTranslation,
  useUpdateTicketFormNoteTranslation,
} from '@/api/ticket-form-note';
import { TicketFormNoteTranslationForm } from './TicketFormNoteTranslationForm';

export function EditTicketFormNoteTranslation() {
  const { id, language } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useTicketFormNoteTranslation(id!, language!);

  const { mutate, isLoading: isUpdating } = useUpdateTicketFormNoteTranslation(id!, language!, {
    onSuccess: (data) => {
      queryClient.setQueryData([UseTicketFormNoteTranslationKey, id, language], data);
    },
  });

  return (
    <div className="p-10">
      <TicketFormNoteTranslationForm
        data={data}
        onSubmit={(data) => {
          mutate(data);
        }}
        submitting={isLoading || isUpdating}
        active={data?.active}
        onChangeActive={() => {
          mutate({ active: !data?.active });
        }}
        onCancel={() => {
          navigate('../..');
        }}
      />
    </div>
  );
}
