import { Model, field } from '@/orm';

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
title.id = 'title';
title.title = 'title';
title.type = 'text';
title.defaultLocale = 'en';
title.active = true;
title.required = true;
title.createdAt = new Date(0);
title.updatedAt = new Date(0);

const description = new TicketField();
description.id = 'description';
description.title = 'description';
description.type = 'multi-line';
description.defaultLocale = 'en';
description.active = true;
description.required = true;
description.createdAt = new Date(0);
description.updatedAt = new Date(0);

export const presetTicketFields = [title, description];
