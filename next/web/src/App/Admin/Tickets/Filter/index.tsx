import { useCallback, useEffect, useMemo, useState } from 'react';
import { QueryParamConfig, StringParam, useQueryParams } from 'use-query-params';
import moment from 'moment';

import { CategoryTreeNode, useCategoryTree, useGroups, useStaffs } from 'api';
import { usePage } from 'utils/usePage';
import { Button } from 'components/Button';
import { QueryResult } from 'components/QueryResult';
import { Select } from 'components/Select';
import { STATUSES } from '../Status';

export interface FiltersData {
  assigneeIds?: string[];
  groupIds?: string[];
  createdAt?: string;
  categoryId?: string;
  status?: number[];
}

const CommaArrayParam: QueryParamConfig<string[] | undefined> = {
  encode: (data) => (data?.length ? data.join(',') : undefined),
  decode: (data) => {
    if (!data) {
      return undefined;
    }
    if (typeof data === 'string') {
      return data.split(',');
    }
    return data.filter((str) => str !== null) as string[];
  },
};

const CommaIntArrayParam: QueryParamConfig<number[] | undefined> = {
  encode: (data) => (data?.length ? data.join(',') : undefined),
  decode: (data) => CommaArrayParam.decode(data)?.map((n) => parseInt(n)),
};

export function useFiltersFromQueryParams() {
  const [, setPage] = usePage();

  const [params, setParams] = useQueryParams({
    assigneeId: CommaArrayParam,
    groupId: CommaArrayParam,
    createdAt: StringParam,
    categoryId: StringParam,
    status: CommaIntArrayParam,
  });

  const filters = useMemo<FiltersData>(
    () => ({
      assigneeIds: params.assigneeId,
      groupIds: params.groupId,
      createdAt: params.createdAt ?? undefined,
      categoryId: params.categoryId ?? undefined,
      status: params.status,
    }),
    [params]
  );

  const setFilters = useCallback(
    (filters: FiltersData) => {
      setPage(1);
      setParams({
        assigneeId: filters.assigneeIds,
        groupId: filters.groupIds,
        createdAt: filters.createdAt,
        categoryId: filters.categoryId,
        status: filters.status,
      });
    },
    [setParams]
  );

  return [filters, setFilters] as const;
}

interface FilterSelectProps<Value> {
  value?: Value;
  onChange: (value?: Value) => void;
}

const selectPlaceholder = <Select placeholder="Loading..." />;

function StaffSelect({ value, onChange }: FilterSelectProps<string[]>) {
  const result = useStaffs();
  const options = useMemo(() => {
    return result.data?.map((staff) => ({ key: staff.id, text: staff.nickname }));
  }, [result.data]);

  return (
    <QueryResult result={result} placeholder={selectPlaceholder}>
      <Select
        placeholder="任何"
        options={options}
        selected={value}
        onSelect={(id) => onChange(value ? value.concat(id) : [id])}
        onDeselect={(id) => onChange(value?.filter((v) => v !== id))}
      />
    </QueryResult>
  );
}

function GroupSelect({ value, onChange }: FilterSelectProps<string[]>) {
  const result = useGroups();
  const options = useMemo(() => {
    return result.data?.map((group) => ({ key: group.id, text: group.name }));
  }, [result.data]);

  return (
    <QueryResult result={result} placeholder={selectPlaceholder}>
      <Select
        placeholder="任何"
        options={options}
        selected={value}
        onSelect={(id) => onChange(value ? value.concat(id) : [id])}
        onDeselect={(id) => onChange(value?.filter((v) => v !== id))}
      />
    </QueryResult>
  );
}

const timeRanges = {
  any: '所有时间',
  today: '今天',
  yesterday: '昨天',
  week: '本周',
  '7d': '过去 7 天',
  month: '本月',
  '30d': '过去 30 天',
};

export function getTimeRange(value: string) {
  switch (value) {
    case 'any':
      return undefined;
    case 'today':
      return [moment().startOf('day').toDate(), moment().endOf('day').toDate()];
    case 'yesterday':
      return [
        moment().subtract(1, 'day').startOf('day').toDate(),
        moment().subtract(1, 'day').endOf('day').toDate(),
      ];
    case 'week':
      return [
        moment().weekday(1).startOf('day').toDate(),
        moment().weekday(7).endOf('day').toDate(),
      ];
    case '7d':
      return [
        moment().startOf('day').subtract(7, 'day').toDate(),
        moment().endOf('day').subtract(1, 'day').toDate(),
      ];
    case 'month':
      return [moment().startOf('month').toDate(), moment().endOf('month').toDate()];
    case '30d':
      return [
        moment().startOf('day').subtract(30, 'day').toDate(),
        moment().endOf('day').subtract(1, 'day').toDate(),
      ];
  }
}

const timeRangeOptions = Object.entries(timeRanges).map(([key, text]) => ({ key, text }));

function CreatedAtSelect({ value, onChange }: FilterSelectProps<string>) {
  return (
    <Select
      closeOnChange
      options={timeRangeOptions}
      selected={value || 'any'}
      onSelect={(key) => onChange(key === 'any' ? undefined : key)}
    />
  );
}

function CategorySelect({
  categories,
  path,
  onChange,
}: {
  categories: CategoryTreeNode[];
  path: (string | undefined)[];
  onChange: (id: string) => void;
}) {
  const options = useMemo(
    () => [
      { key: 'any', text: '任何' },
      ...categories.map((c) => ({
        key: c.id,
        text: c.name + (c.active ? '' : ' (停用)'),
      })),
    ],
    [categories]
  );

  const currentId = path[0] ?? 'any';

  const current = useMemo(() => {
    return categories.find((c) => c.id === currentId);
  }, [categories, currentId]);

  return (
    <>
      <Select closeOnChange options={options} selected={currentId} onSelect={onChange} />
      {current && current.children && (
        <CategorySelect
          categories={current.children}
          path={path.slice(1)}
          onChange={(id) => onChange(id === 'any' ? current.id : id)}
        />
      )}
    </>
  );
}

function CategorySelectGroup({ value, onChange }: FilterSelectProps<string>) {
  const result = useCategoryTree();

  const current = useMemo(() => {
    if (!result.data || !value) {
      return;
    }
    const queue = result.data.slice();
    while (queue.length) {
      const front = queue.shift()!;
      if (front.id === value) {
        return front;
      }
      if (front.children) {
        queue.push(...front.children);
      }
    }
  }, [result.data, value]);

  const path = useMemo(() => {
    const path: (string | undefined)[] = [];
    for (let p = current; p; p = p.parent) {
      path.unshift(p.id);
    }
    return path;
  }, [current]);

  return (
    <QueryResult result={result} placeholder={selectPlaceholder}>
      {(categories) => (
        <div className="flex flex-col gap-2">
          <CategorySelect
            categories={categories}
            path={path}
            onChange={(id) => onChange(id === 'any' ? undefined : id)}
          />
        </div>
      )}
    </QueryResult>
  );
}

const statusOptions = STATUSES.map((status) => ({ key: status.value, text: status.title }));

function StatusSelect({ value, onChange }: FilterSelectProps<number[]>) {
  return (
    <Select
      placeholder="任何"
      options={statusOptions}
      selected={value}
      onSelect={(status) => onChange(value ? value.concat(status) : [status])}
      onDeselect={(status) => onChange(value?.filter((v) => v !== status))}
    />
  );
}

export interface FiltersPanelProps {
  filters: FiltersData;
  onChange: (filters: FiltersData) => void;
}

export function FiltersPanel({ filters, onChange }: FiltersPanelProps) {
  const [tmpFilters, setTmpFilters] = useState<FiltersData>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setTmpFilters(filters);
    setDirty(false);
  }, [filters]);

  const merge = useCallback((filters: FiltersData) => {
    setTmpFilters((prev) => ({ ...prev, ...filters }));
    setDirty(true);
  }, []);

  const apply = () => onChange(tmpFilters);

  return (
    <div className="w-80 border-l border-gray-300 text-gray-700 overflow-y-auto flex flex-col">
      <div className="flex-grow overflow-y-auto px-4 pt-4">
        <div className="text-sm">过滤</div>

        <div className="mt-6">
          <label className="block mb-1 text-sm">客服</label>
          <StaffSelect
            value={tmpFilters.assigneeIds}
            onChange={(ids) => merge({ assigneeIds: ids })}
          />
        </div>

        <div className="mt-4">
          <label className="block mb-1 text-sm">组</label>
          <GroupSelect value={tmpFilters.groupIds} onChange={(groupIds) => merge({ groupIds })} />
        </div>

        <div className="mt-4">
          <label className="block mb-1 text-sm">创建时间</label>
          <CreatedAtSelect
            value={tmpFilters.createdAt}
            onChange={(createdAt) => merge({ createdAt })}
          />
        </div>

        <div className="mt-4">
          <label className="block mb-1 text-sm">分类</label>
          <CategorySelectGroup
            value={tmpFilters.categoryId}
            onChange={(categoryId) => merge({ categoryId })}
          />
        </div>

        <div className="mt-4">
          <label className="block mb-1 text-sm">状态</label>
          <StatusSelect value={tmpFilters.status} onChange={(status) => merge({ status })} />
        </div>
      </div>

      <div className="border-t mx-4 py-4">
        <Button className="w-full py-1" variant="primary" disabled={!dirty} onClick={apply}>
          应用
        </Button>
      </div>
    </div>
  );
}
