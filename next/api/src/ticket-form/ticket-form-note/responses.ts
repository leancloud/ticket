import { TicketFormNote, TicketFormNoteTranslation } from './ticket-form-note.entity';

export class TicketFormNoteTranslationResponse {
  private note: TicketFormNote;

  constructor(private readonly translation: TicketFormNoteTranslation) {
    this.note = translation.note!;
  }

  toJSON() {
    return {
      id: this.note.id,
      name: this.note.name,
      defaultLanguage: this.note.defaultLanguage,
      content: this.translation.content,
      active: this.translation.active,
      createdAt: this.note.createdAt,
      updatedAt: this.translation.updatedAt,
    };
  }
}
