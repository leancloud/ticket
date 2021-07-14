import AV from 'leancloud-storage';

import { redis } from '../../cache';

const cacheKey = 'categories';
// TODO(sdjdd): 刷新缓存功能实现后将该值调大
const cacheTTL = 1000 * 60 * 5; // 5 min

export interface Category {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  qTemplate: string;
  order: number;
  faqIds: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export const INVALID_CATEGORY: Category = {
  id: '',
  name: '(UNKNOWK)',
  description: '(This category may be deleted)',
  qTemplate: '',
  order: Number.MAX_SAFE_INTEGER,
  faqIds: [],
  createdAt: new Date(0),
  updatedAt: new Date(0),
  deletedAt: new Date(0),
};

export function encode(category: Category) {
  return {
    ...category,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
    deletedAt: category.deletedAt?.toISOString(),
  };
}

export function decode(data: ReturnType<typeof encode>): Category {
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    deletedAt: data.deletedAt ? new Date(data.deletedAt) : undefined,
  };
}

export async function getAllFromStorage(): Promise<Category[]> {
  const query = new AV.Query<AV.Object>('Category');
  const objects = await query.find();
  return objects.map((obj) => {
    const parent: AV.Object | null = obj.get('parent');
    const faqs: AV.Object[] | null = obj.get('FAQs');
    return {
      id: obj.id!,
      name: obj.get('name'),
      description: obj.get('description') ?? '',
      parentId: parent?.id! ?? undefined,
      qTemplate: obj.get('qTemplate') ?? '',
      order: obj.get('order') ?? obj.createdAt!.getTime(),
      faqIds: faqs?.map((o) => o.id!) ?? [],
      createdAt: obj.createdAt!,
      updatedAt: obj.updatedAt!,
      deletedAt: obj.get('deletedAt') ?? undefined,
    };
  });
}

export async function getAllFromCache(): Promise<Category[] | null> {
  const categories = await redis.hvals(cacheKey);
  if (categories.length === 0) {
    return null;
  }
  return categories.map((data) => decode(JSON.parse(data)));
}

async function setAllToCache(categories: Category[]) {
  await redis
    .pipeline()
    .hdel(cacheKey)
    .hset(cacheKey, ...categories.map((c) => [c.id, JSON.stringify(encode(c))]))
    .expire(cacheKey, cacheTTL)
    .exec();
}

export interface GetAllOptions {
  ignoreCache?: boolean;
}

export async function getAll(options?: GetAllOptions): Promise<Category[]> {
  if (!options?.ignoreCache) {
    const cached = await getAllFromCache();
    if (cached) {
      return cached;
    }
  }
  const catecories = await getAllFromStorage();
  setAllToCache(catecories).catch((error) => {
    // TODO(sdjdd): Sentry
    console.error(`[Cache] Set ${cacheKey}:`, error);
  });
  return catecories;
}

export async function getSomeFromCache(ids: Iterable<string>): Promise<Category[] | null> {
  const id_set = new Set(ids);
  if (id_set.size === 0) {
    return [];
  }
  const categories = await redis.hmget(cacheKey, ...id_set);
  const filteredCategories = categories.filter((c) => c !== null) as string[];
  if (filteredCategories.length === 0) {
    return null;
  }
  return filteredCategories.map((str) => decode(JSON.parse(str)));
}

export async function getSome(ids: Iterable<string>): Promise<Category[]> {
  const id_set = new Set(ids);
  if (id_set.size === 0) {
    return [];
  }
  const cached = await getSomeFromCache(ids);
  if (cached) {
    const missing = cached.some((c) => !id_set.has(c.id));
    if (!missing) {
      return cached;
    }
  }
  const categories = await getAll({ ignoreCache: true });
  return categories.filter((c) => id_set.has(c.id));
}
