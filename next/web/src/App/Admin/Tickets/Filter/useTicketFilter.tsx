import { createContext, ReactNode, useContext, useMemo } from 'react';
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
  where?: Record<string, any>;
}

export interface FieldFilters extends CommonFilters {
  type: 'field';
  fieldId?: string;
  optionValue?: string;
  textValue?: string;
}

export type Filters = NormalFilters | FieldFilters;

const serializeFilters = (filter: Filters): Record<string, string | undefined> => {
  if (filter.type === 'field') {
    return {
      filterType: 'field',
      ..._.pick(filter, ['fieldId', 'optionValue', 'createdAt', 'textValue']),
    };
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
      where: _.isEmpty(filter.where) ? undefined : JSON.stringify(filter.where),
    };
  }
};

const deserializeFilters = (params: Record<string, string | undefined>): Filters => {
  const starNum = Number(params.star);

  return {
    type:
      params.filterType === 'normal'
        ? 'normal'
        : params.filterType === 'field'
        ? 'field'
        : 'normal',
    ..._.pick(params, [
      // common
      'createdAt',

      // normal
      'keyword',
      'authorId',
      'tagKey',
      'tagValue',
      'privateTagKey',
      'privateTagValue',
      'rootCategoryId',

      // field
      'fieldId',
      'optionValue',
      'textValue',
    ]),
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
    where: params.where ? JSON.parse(params.where) : undefined,
  };
};

const FiltersContext = createContext<[Filters, (filters: Filters) => void]>([
  { type: 'normal' },
  _.noop,
]);

export function LocalFiltersProvider({ children }: { children: ReactNode }) {
  const [params, { merge }] = useSearchParams();

  const filters = useMemo(() => deserializeFilters(params), [params]);

  const set = (filters: Filters) => {
    merge(serializeFilters(filters));
  };

  return <FiltersContext.Provider value={[filters, set]}>{children}</FiltersContext.Provider>;
}

export const useLocalFilters = () => useContext(FiltersContext);
