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
title.title = 'title';
title.type = 'text';
title.defaultLocale = 'en';
title.active = true;
title.required = true;
// @ts-ignore
title.createdAt = new Date(0);
// @ts-ignore
title.updatedAt = new Date(0);

const descroiption = new TicketField();
// @ts-ignore
descroiption.id = 'description';
descroiption.title = 'description';
descroiption.type = 'multi-line';
descroiption.defaultLocale = 'en';
descroiption.active = true;
descroiption.required = true;
// @ts-ignore
descroiption.createdAt = new Date(0);
// @ts-ignore
descroiption.updatedAt = new Date(0);

export const presetTicketFields = [title, descroiption];
