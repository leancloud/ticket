import { TagMetadata } from '@/model/TagMetadata';

export class TagMetadtaResponse {
  constructor(readonly tagMetadata: TagMetadata) {}

  toJSON() {
    return {
      id: this.tagMetadata.id,
      key: this.tagMetadata.key,
      type: this.tagMetadata.type,
      values: this.tagMetadata.values,
      private: this.tagMetadata.isPrivate,
    };
  }
}
