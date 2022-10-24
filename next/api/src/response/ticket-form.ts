import { TicketForm } from '@/model/TicketForm';

export class TicketFormResponse {
  constructor(readonly form: TicketForm) {}

  toJSON() {
    const form = this.form;

    const fieldIds = form.items
      ? form.items.filter((item) => item.type === 'field').map((item) => item.id)
      : form.fieldIds;

    return {
      id: form.id,
      title: form.title,
      fieldIds,
      items: form.getItems(),
      createdAt: this.form.createdAt,
      updatedAt: this.form.updatedAt,
    };
  }
}
