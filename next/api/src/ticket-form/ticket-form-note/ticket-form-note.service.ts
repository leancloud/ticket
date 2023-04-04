import { Cache, RedisStore } from '@/cache';
import { NotFoundError } from '@/common/http';
import { TicketFormNote, TicketFormNoteTranslation } from './ticket-form-note.entity';
import {
  CreateTicketFormNoteData,
  CreateTicketFormNoteTranslationData,
  ListTicketFormNoteOptions,
  UpdateTicketFormNoteData,
  UpdateTicketFormNoteTranslationData,
} from './types';
import { LocaleMatcher, matchLocale } from '@/utils/locale';
import _ from 'lodash';

const totalCountCache = new Cache([
  new RedisStore({
    prefix: 'cache:TicketFormNote:count',
    ttl: 60 * 60, // 1 hour
  }),
]);

class TicketFormNoteService {
  list({ page, pageSize, active }: ListTicketFormNoteOptions) {
    const qb = TicketFormNote.queryBuilder();
    if (active !== undefined) {
      qb.where('active', '==', active);
    }
    return qb.paginate(page, pageSize).find({ useMasterKey: true });
  }

  async getTotalCount(options: { active?: boolean } = {}) {
    const cached = await totalCountCache.get<number>(options);
    if (cached !== undefined) {
      return cached;
    }

    const qb = TicketFormNote.queryBuilder();
    if (options.active !== undefined) {
      qb.where('active', '==', options.active);
    }
    const totalCount = await qb.count({ useMasterKey: true });

    await totalCountCache.set(options, totalCount);

    return totalCount;
  }

  async create(data: CreateTicketFormNoteData) {
    const note = await TicketFormNote.create(
      {
        name: data.name,
        defaultLanguage: data.language,
        ACL: {},
        active: true,
      },
      { useMasterKey: true }
    );

    const translation = await TicketFormNoteTranslation.create(
      {
        noteId: note.id,
        content: data.content,
        language: data.language,
        active: true,
      },
      { useMasterKey: true }
    );

    await totalCountCache.del([{ active: true }, { active: undefined }]);

    note.languages = [translation.language];

    return note;
  }

  async createTranslation(id: string, data: CreateTicketFormNoteTranslationData) {
    const note = await this.mustGet(id);
    const translation = await TicketFormNoteTranslation.create(
      {
        ...data,
        noteId: note.id,
        active: true,
      },
      { useMasterKey: true }
    );

    return translation;
  }

  get(id: string) {
    return TicketFormNote.find(id, { useMasterKey: true });
  }

  async mustGetWithLanguages(id: string) {
    const note = await this.mustGet(id);

    if (note) {
      const translations = await this.getTranslations(id);

      note.languages = translations.map(({ language }) => language);
    }

    return note;
  }

  getTranslations(id: string, active?: boolean) {
    const qb = TicketFormNoteTranslation.queryBuilder().where('note', '==', TicketFormNote.ptr(id));

    if (active !== undefined) {
      qb.where('active', '==', active);
    }

    return qb.find({ useMasterKey: true });
  }

  getTranslation(id: string, language: string) {
    return TicketFormNoteTranslation.queryBuilder()
      .where('note', '==', TicketFormNote.ptr(id))
      .where('language', '==', language)
      .first({ useMasterKey: true });
  }

  async getByPreferredLanguage(id: string, matcher: LocaleMatcher) {
    const note = await this.get(id);

    if (note) {
      const translations = await this.getTranslations(id, true);

      const matched = matchLocale(translations, (t) => t.language, matcher, note.defaultLanguage);

      if (matched) {
        matched.note = note;
      }

      return matched;
    }
  }

  async getSomeByPreferredLanguage(
    ids: string[] | TicketFormNote[],
    matcher: LocaleMatcher
  ): Promise<TicketFormNoteTranslation[]> {
    if (ids.length === 0) return [];
    const notes =
      typeof ids[0] === 'string'
        ? await this.getSome(ids as string[], true)
        : (ids as TicketFormNote[]);
    const translations = await TicketFormNoteTranslation.queryBuilder()
      .where(
        'note',
        'in',
        notes.map((note) => note.toPointer())
      )
      .where('active', '==', true)
      .find({ useMasterKey: true });

    const notesById = _.keyBy(notes, (note) => note.id);

    return _(translations)
      .groupBy((t) => t.noteId)
      .mapValues((translations, id) =>
        matchLocale(translations, (t) => t.language, matcher, notesById[id].defaultLanguage)
      )
      .values()
      .compact()
      .value()
      .map((t) => {
        t.note = notesById[t.noteId];
        return t;
      });
  }

  getSome(ids: string[], active?: boolean) {
    const qb = TicketFormNote.queryBuilder().where('objectId', 'in', ids);

    if (active !== undefined) {
      qb.where('active', '==', active);
    }

    return qb.find({ useMasterKey: true });
  }

  async mustGet(id: string) {
    const note = await this.get(id);
    if (!note) {
      throw new NotFoundError(`ticket form note ${id} does not exist`);
    }
    return note;
  }

  async mustGetTranslation(id: string, language: string) {
    const translation = await this.getTranslation(id, language);
    if (!translation) {
      throw new NotFoundError(`${language} translation of ticket form note ${id} does not exist`);
    }
    return translation;
  }

  async mustGetByPreferredLanguage(id: string, matcher: LocaleMatcher) {
    const translation = await this.getByPreferredLanguage(id, matcher);
    if (!translation) {
      throw new NotFoundError(`ticket form note ${id} does not exist`);
    }
    return translation;
  }

  async update(id: string, data: UpdateTicketFormNoteData) {
    const note = await this.mustGet(id);
    await note.update(data, { useMasterKey: true });
    if (data.active !== undefined) {
      await totalCountCache.del([{ active: true }, { active: false }, { active: undefined }]);
    }
  }

  async updateTranslation(id: string, language: string, data: UpdateTicketFormNoteTranslationData) {
    const translation = await this.mustGetTranslation(id, language);

    await translation.update(data, { useMasterKey: true });
  }
}

export default new TicketFormNoteService();
