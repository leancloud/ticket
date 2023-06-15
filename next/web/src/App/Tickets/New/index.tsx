import { useCreateTicket } from '@/api/ticket';
import { message } from '@/components/antd';
import { TicketData, TicketForm } from './TicketForm';

export function NewTicket() {
  const { mutate, isLoading, isSuccess } = useCreateTicket({
    onSuccess: () => {
      message.success('创建成功');
      window.postMessage('ticketCreated');
    },
  });

  const handleSubmit = (data: TicketData) => {
    mutate({
      appId: data.appId,
      authorId: data.authorId,
      organizationId: data.organizationId,
      categoryId: data.categoryId,
      title: data.title,
      content: data.content,
      fileIds: data.fileIds,
      customFields: data.customFields
        ? Object.entries(data.customFields)
            .filter(([_, value]) => value !== undefined)
            .map(([field, value]) => ({ field, value }))
        : undefined,
    });
  };

  return <TicketForm loading={isLoading} disabled={isSuccess} onSubmit={handleSubmit} />;
}
