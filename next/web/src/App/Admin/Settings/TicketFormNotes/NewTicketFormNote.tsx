import { useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useCreateTicketFormNote } from '@/api/ticket-form-note';
import { TicketFormNoteForm } from './TicketFormNoteForm';

export function NewTicketFormNote() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate, isLoading } = useCreateTicketFormNote({
    onSuccess: (data) => {
      queryClient.setQueryData(['ticketFormNote', data.id], data);
      navigate(`../${data.id}`);
    },
  });

  return (
    <div className="p-10">
      <TicketFormNoteForm onSubmit={mutate} submitting={isLoading} />
    </div>
  );
}
