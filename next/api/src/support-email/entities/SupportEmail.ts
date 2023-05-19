import { Category } from '@/model/Category';
import { Model, field, pointerId } from '@/orm';

export class SupportEmail extends Model {
  @field()
  name!: string;

  @field()
  email!: string;

  @field()
  auth!: {
    username: string;
    password: string;
  };

  @field()
  smtp!: {
    host: string;
    port: number;
    secure: boolean;
  };

  @field()
  imap!: {
    host: string;
    port: number;
    secure: boolean;
  };

  @field()
  mailbox?: string;

  @field()
  lastUid!: number;

  @pointerId(() => Category)
  categoryId!: string;

  @field()
  receipt!: {
    enabled: boolean;
    subject: string;
    text: string;
  };
}
