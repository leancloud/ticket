import { createContext, ReactNode, useCallback, useContext, useMemo } from 'react';
import _ from 'lodash';
import { useSearchParams } from '@/utils/useSearchParams';

export interface Filters {
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
  createdAt?: string;
  rootCategoryId?: string;
  status?: number[];
  star?: number;
  fieldName?: string;
  fieldValue?: string;
}
const FiltersContext = createContext<[Filters, (filters: Filters) => void]>([{}, _.noop]);

export function LocalFiltersProvider({ children }: { children: ReactNode }) {
  const [params, { merge }] = useSearchParams();

  const filters = useMemo(() => {
    const {
      assigneeId,
      groupId,
      reporterId,
      participantId,
      createdAt,
      rootCategoryId,
      status,
      star,
    } = params;

    const filters: Filters = _.pick(params, [
      'keyword',
      'authorId',
      'tagKey',
      'tagValue',
      'privateTagKey',
      'privateTagValue',
      'fieldName',
      'fieldValue',
    ]);

    if (assigneeId) {
      filters.assigneeId = assigneeId.split(',');
    }

    if (groupId) {
      filters.groupId = groupId.split(',');
    }

    if (reporterId) {
      filters.reporterId = reporterId.split(',');
    }

    if (participantId) {
      filters.participantId = participantId.split(',');
    }

    if (createdAt) {
      filters.createdAt = createdAt;
    }

    if (rootCategoryId) {
      filters.rootCategoryId = rootCategoryId;
    }

    if (status) {
      filters.status = status
        .split(',')
        .map((s) => parseInt(s))
        .filter((n) => !Number.isNaN(n));
    }

    if (star) {
      const starNum = parseInt(star);
      if (!Number.isNaN(starNum)) {
        filters.star = starNum;
      }
    }

    return filters;
  }, [params]);

  const set = useCallback(
    (filters: Filters) => {
      const params: Record<string, string | undefined> = {
        ...filters,
        assigneeId: filters.assigneeId?.map((id) => (id === null ? 'null' : id)).join(','),
        groupId: filters.groupId?.map((id) => (id === null ? 'null' : id)).join(','),
        reporterId: filters.reporterId?.map((id) => (id === null ? 'null' : id)).join(','),
        participantId: filters.participantId?.map((id) => (id === null ? 'null' : id)).join(','),
        createdAt: filters.createdAt,
        rootCategoryId: filters.rootCategoryId,
        status: filters.status?.join(','),
        star: filters.star?.toString(),
        page: undefined,
      };
      merge(params);
    },
    [merge]
  );

  return <FiltersContext.Provider value={[filters, set]}>{children}</FiltersContext.Provider>;
}

export const useLocalFilters = () => useContext(FiltersContext);
