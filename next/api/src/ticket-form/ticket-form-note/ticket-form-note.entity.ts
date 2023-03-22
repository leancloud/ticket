import { Model, field, pointTo, pointerId, serialize } from '@/orm';

export class TicketFormNote extends Model {
  @field()
  @serialize()
  name!: string;

  @field()
  @serialize()
  active!: boolean;

  @field()
  @serialize()
  defaultLanguage!: string;

  @serialize()
  languages?: string[];
}

export class TicketFormNoteTranslation extends Model {
  @field()
  @serialize()
  content!: string;

  @pointerId(() => TicketFormNote)
  noteId!: string;

  @pointTo(() => TicketFormNote)
  note?: TicketFormNote;

  @field()
  @serialize()
  language!: string;

  @field()
  @serialize()
  active!: boolean;
}
