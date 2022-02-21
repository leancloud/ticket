import { useCallback, useMemo } from 'react';

import { useSearchParams } from '@/utils/useSearchParams';

export interface Filters {
  assigneeId?: string[];
  groupId?: string[];
  tagKey?: string;
  tagValue?: string;
  privateTagKey?: string;
  privateTagValue?: string;
  createdAt?: string;
  rootCategoryId?: string;
  status?: number[];
}

export function useLocalFilters() {
  const [
    {
      assigneeId,
      groupId,
      tagKey,
      tagValue,
      privateTagKey,
      privateTagValue,
      createdAt,
      rootCategoryId,
      status,
    },
    { merge },
  ] = useSearchParams();

  const filters = useMemo(() => {
    const filters: Filters = { tagKey, tagValue, privateTagKey, privateTagValue };

    if (assigneeId) {
      filters.assigneeId = assigneeId.split(',');
    }

    if (groupId) {
      filters.groupId = groupId.split(',');
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

    return filters;
  }, [
    assigneeId,
    groupId,
    tagKey,
    tagValue,
    privateTagKey,
    privateTagValue,
    createdAt,
    rootCategoryId,
    status,
  ]);

  const set = useCallback(
    (filters: Filters) => {
      const params: Record<string, string | undefined> = {
        ...filters,
        assigneeId: filters.assigneeId?.map((id) => (id === null ? 'null' : id)).join(','),
        groupId: filters.groupId?.map((id) => (id === null ? 'null' : id)).join(','),
        createdAt: filters.createdAt,
        rootCategoryId: filters.rootCategoryId,
        status: filters.status?.join(','),
      };
      merge(params);
    },
    [merge]
  );

  return [filters, set] as const;
}
