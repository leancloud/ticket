import { field, Model } from '@/orm';

export class File extends Model {
  protected static className = '_File';

  @field()
  name!: string;

  @field('mime_type')
  mime!: string;

  @field()
  url!: string;

  @field()
  metaData?: {
    [key: string]: any;
    owner?: string;
    external?: boolean;
  };
}
