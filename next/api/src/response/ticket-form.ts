import { TicketForm } from '@/model/TicketForm';

export class TicketFormResponse {
  constructor(readonly form: TicketForm) {}

  toJSON() {
    return {
      id: this.form.id,
      title: this.form.title,
      fieldIds: this.form.fieldIds,
      createdAt: this.form.createdAt,
      updatedAt: this.form.updatedAt,
    };
  }
}
