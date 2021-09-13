import { field, Model } from '../orm';

export class File extends Model {
  static readonly className = '_File';

  @field()
  name!: string;

  @field('mime_type')
  mime!: string;

  @field()
  url!: string;
}
