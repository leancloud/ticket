import { Model, field } from '../orm';

export class TicketField extends Model {
  @field()
  title!: string;

  @field()
  type!: string;

  @field()
  defaultLocale!: string;

  @field()
  active!: boolean;

  @field()
  required!: boolean;
}

const title = new TicketField();
// @ts-ignore
title.id = 'title';
title.type = 'text';
title.defaultLocale = 'en';
title.active = true;
title.required = true;

const descroption = new TicketField();
// @ts-ignore
descroption.id = 'description';
descroption.type = 'multi-line';
descroption.defaultLocale = 'en';
descroption.active = true;
descroption.required = true;

export const presetTicketFields = [title, descroption];
