import { TicketFormItem } from '@/api/ticket-form';
import { Field } from './CustomFields';
import { FormNote } from './FormNote';

function FormItem({ item }: { item: TicketFormItem }) {
  switch (item.type) {
    case 'field':
      return <Field {...item.data} />;
    case 'note':
      return <FormNote {...item.data} />;
  }
}

export function FormItems({ items }: { items: TicketFormItem[] }) {
  return (
    <>
      {items.map((item) => (
        <FormItem key={item.data.id} item={item} />
      ))}
    </>
  );
}
