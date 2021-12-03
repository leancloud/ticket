import { useCallback, useMemo } from 'react';
import { mapValues } from 'lodash';

import { TicketFilterSchema, useTicketFilter as _useTicketFilter } from '@/api/ticket-filter';
import { useSearchParams } from '@/utils/useSearchParams';

const presetFilters: TicketFilterSchema[] = [
  {
    id: '',
    name: '所有工单',
    filters: {},
  },
  {
    id: 'unResolvedTickets',
    name: '所有未解决的工单',
    filters: {
      status: [50, 120, 160],
    },
  },
];

export interface Filters {
  assigneeId?: (string | null)[];
  groupId?: (string | null)[];
  createdAt?: string;
  rootCategoryId?: string;
  status?: number[];
}

export function useLocalFilters(remoteFilters?: Filters) {
  const [{ assigneeId, groupId, createdAt, rootCategoryId, status }, { merge }] = useSearchParams();

  const filters = useMemo(() => {
    const filters: Filters = {};

    if (assigneeId !== undefined) {
      if (assigneeId === '') {
        filters.assigneeId = undefined;
      } else {
        filters.assigneeId = assigneeId.split(',').map((id) => (id === 'null' ? null : id));
      }
    }

    if (groupId !== undefined) {
      if (groupId === '') {
        filters.groupId = undefined;
      } else {
        filters.groupId = groupId.split(',').map((id) => (id === 'null' ? null : id));
      }
    }

    if (createdAt !== undefined) {
      if (createdAt === '') {
        filters.createdAt = undefined;
      } else {
        filters.createdAt = createdAt;
      }
    }

    if (rootCategoryId !== undefined) {
      if (rootCategoryId === '') {
        filters.rootCategoryId = undefined;
      } else {
        filters.rootCategoryId = rootCategoryId;
      }
    }

    if (status !== undefined) {
      if (status === '') {
        filters.status = undefined;
      } else {
        filters.status = status
          .split(',')
          .map((s) => parseInt(s))
          .filter((n) => !Number.isNaN(n));
      }
    }

    return filters;
  }, [assigneeId, groupId, createdAt, rootCategoryId, status]);

  const set = useCallback(
    (filters: Filters) => {
      let params = {
        assigneeId: filters.assigneeId?.map((id) => (id === null ? 'null' : id)).join(','),
        groupId: filters.groupId?.map((id) => (id === null ? 'null' : id)).join(','),
        createdAt: filters.createdAt,
        rootCategoryId: filters.rootCategoryId,
        status: filters.status?.join(','),
      };
      if (remoteFilters) {
        params = mapValues(params, (value, key) => {
          if (value === undefined && remoteFilters[key as keyof Filters] !== undefined) {
            return '';
          }
          return value;
        });
      }
      merge(params);
    },
    [merge, remoteFilters]
  );

  return [filters, set] as const;
}

export interface UseTicketFilterResult {
  filter?: TicketFilterSchema;
  isLoading: boolean;
  isPresetFilter: boolean;
}

export function useTicketFilter(id?: string): UseTicketFilterResult {
  const presetFilter = useMemo(() => {
    if (!id) {
      return presetFilters[0];
    }
    return presetFilters.find((f) => f.id === id);
  }, [id]);

  const { data, isLoading } = _useTicketFilter(id!, {
    queryOptions: {
      enabled: !!id && !presetFilter,
      keepPreviousData: true,
      staleTime: Infinity,
    },
  });

  return {
    filter: presetFilter ?? data,
    isLoading,
    isPresetFilter: !!presetFilter,
  };
}
