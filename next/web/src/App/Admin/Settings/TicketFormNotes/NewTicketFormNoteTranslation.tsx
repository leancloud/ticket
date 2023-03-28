import { useQueryClient } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateTicketFormNoteTranslation } from '@/api/ticket-form-note';
import { TicketFormNoteTranslationForm } from './TicketFormNoteTranslationForm';

export function NewTicketFormNoteTranslation() {
  const { id, language } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate, isLoading } = useCreateTicketFormNoteTranslation(id!, {
    onSuccess: () => {
      queryClient.invalidateQueries(['ticketFormNote', id]);
      navigate(`..`);
    },
  });

  return (
    <div className="p-10">
      <TicketFormNoteTranslationForm
        onSubmit={(data) => mutate({ language: language!, ...data })}
        submitting={isLoading}
      />
    </div>
  );
}
