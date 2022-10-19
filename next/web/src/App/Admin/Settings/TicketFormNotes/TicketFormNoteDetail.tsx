import { useQueryClient } from 'react-query';
import { useParams } from 'react-router-dom';
import { useTicketFormNote, useUpdateTicketFormNote } from '@/api/ticket-form-note';
import { LoadingCover } from '@/components/common';
import { TicketFormNoteForm } from './TicketFormNoteForm';

export function TicketFormNoteDetail() {
  const { id } = useParams() as { id: string };
  const queryClient = useQueryClient();

  const { data, isLoading } = useTicketFormNote(id, {
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
      <TicketFormNoteForm
        data={data}
        onSubmit={(data) => mutate([id, data])}
        submitting={updating}
        active={data?.active}
        onChangeActive={data && (() => mutate([data.id, { active: !data.active }]))}
      />
    </div>
  );
}
