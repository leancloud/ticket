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

const descroiption = new TicketField();
// @ts-ignore
descroiption.id = 'description';
descroiption.type = 'multi-line';
descroiption.defaultLocale = 'en';
descroiption.active = true;
descroiption.required = true;

export const presetTicketFields = [title, descroiption];
