import { createContext, ReactNode, useCallback, useContext, useMemo } from 'react';
import _ from 'lodash';
import { useSearchParams } from '@/utils/useSearchParams';

export interface CommonFilters {
  createdAt?: string;
}

export interface NormalFilters extends CommonFilters {
  type: 'normal';
  keyword?: string;
  authorId?: string;
  assigneeId?: string[];
  groupId?: string[];
  reporterId?: string[];
  participantId?: string[];
  tagKey?: string;
  tagValue?: string;
  privateTagKey?: string;
  privateTagValue?: string;
  rootCategoryId?: string;
  status?: number[];
  star?: number;
  language?: string[];
}

export interface OptionFieldFilters extends CommonFilters {
  type: 'option';
  fieldName?: string;
  fieldValue?: string;
}

export interface FieldFilters {
  type: 'field';
  q?: string;
}

export type Filters = NormalFilters | OptionFieldFilters | FieldFilters;

const serializeFilters = (filter: Filters): Record<string, string | undefined> => {
  if (filter.type === 'field') {
    return { filterType: 'field', ..._.pick(filter, ['q']) };
  } else if (filter.type === 'option') {
    return { filterType: 'option', ..._.pick(filter, ['fieldName', 'fieldValue', 'createdAt']) };
  } else {
    return {
      ..._.omit(filter, ['type']),
      filterType: 'normal',
      assigneeId: filter.assigneeId?.map((id) => (id === null ? 'null' : id)).join(','),
      groupId: filter.groupId?.map((id) => (id === null ? 'null' : id)).join(','),
      reporterId: filter.reporterId?.map((id) => (id === null ? 'null' : id)).join(','),
      participantId: filter.participantId?.map((id) => (id === null ? 'null' : id)).join(','),
      language: filter.language?.map((id) => (id === null ? 'null' : id)).join(','),
      status: filter.status?.join(','),
      star: filter.star?.toString(),
    };
  }
};

const deserializeFilters = (
  params: Record<string, string | undefined>,
  passthrough = false
): Filters => {
  if (params.filterType === 'normal') {
    const starNum = Number(params.star);
    return {
      type: 'normal',
      ...(passthrough
        ? params
        : _.pick(params, [
            'keyword',
            'authorId',
            'tagKey',
            'tagValue',
            'privateTagKey',
            'privateTagValue',
            'createdAt',
            'rootCategoryId',
          ])),
      assigneeId: params.assigneeId?.split(','),
      groupId: params.groupId?.split(','),
      reporterId: params.reporterId?.split(','),
      participantId: params.participantId?.split(','),
      language: params.language?.split(','),
      status: params.status
        ?.split(',')
        .map((s) => parseInt(s))
        .filter((n) => !Number.isNaN(n)),
      star: Number.isNaN(starNum) ? undefined : starNum,
    };
  } else if (params.filterType === 'field') {
    return {
      type: 'field',
      ...(passthrough ? params : _.pick(params, ['q'])),
    };
  } else if (params.filterType === 'option') {
    return {
      type: 'option',
      ...(passthrough ? params : _.pick(params, ['fieldName', 'fieldValue', 'createdAt'])),
    };
  } else {
    return { type: 'normal', ...(passthrough && params) };
  }
};

const FiltersContext = createContext<[Filters, (filters: Filters) => void]>([
  { type: 'normal' },
  _.noop,
]);

export function LocalFiltersProvider({ children }: { children: ReactNode }) {
  const [params, { merge }] = useSearchParams();

  const filters = useMemo(() => deserializeFilters(params, true), [params]);

  const set = useCallback(
    (filters: Filters) => {
      merge(serializeFilters(filters));
    },
    [merge]
  );

  return <FiltersContext.Provider value={[filters, set]}>{children}</FiltersContext.Provider>;
}

export const useLocalFilters = () => useContext(FiltersContext);
