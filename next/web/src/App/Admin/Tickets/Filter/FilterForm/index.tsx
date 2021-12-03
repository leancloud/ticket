import { PropsWithChildren, useCallback, useEffect, useState } from 'react';
import cx from 'classnames';

import { Button } from '@/components/antd';
import { Filters } from '../../useTicketFilter';
import { AssigneeSelect } from './AssigneeSelect';
import { GroupSelect } from './GroupSelect';
import { CreatedAtSelect } from './CreatedAtSelect';
import { CategorySelect } from './CategorySelect';
import { StatusSelect } from './StatusSelect';

function Field({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <div className="mt-4">
      <label className="block pb-1.5 text-[#475867] text-sm font-medium">{title}</label>
      {children}
    </div>
  );
}

interface TempFilters extends Filters {
  assigneeId?: string[];
  groupId?: string[];
}

type NewFilters = { [K in keyof Required<Filters>]: Filters[K] };

function decodeTempFilters(filters: Filters): TempFilters {
  return {
    ...filters,
    assigneeId: filters.assigneeId?.map((id) => (id === null ? '' : id)),
    groupId: filters.groupId?.map((id) => (id === null ? '' : id)),
  };
}

function encodeTempFilters(tempFilters: TempFilters): NewFilters {
  return {
    assigneeId: tempFilters.assigneeId?.map((id) => (id === '' ? null : id)),
    groupId: tempFilters.groupId?.map((id) => (id === '' ? null : id)),
    createdAt: tempFilters.createdAt,
    rootCategoryId: tempFilters.rootCategoryId,
    status: tempFilters.status,
  };
}

export interface FilterFormProps {
  className?: string;
  filters: Filters;
  onChange: (filters: NewFilters) => void;
}

export function FilterForm({ className, filters, onChange }: FilterFormProps) {
  const [tempFilters, setTempFilters] = useState<TempFilters>({});
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setTempFilters(decodeTempFilters(filters));
    setIsDirty(false);
  }, [filters]);

  const merge = useCallback((filters: TempFilters) => {
    setTempFilters((prev) => ({ ...prev, ...filters }));
    setIsDirty(true);
  }, []);

  const handleChange = () => {
    onChange(encodeTempFilters(tempFilters));
  };

  const { assigneeId, groupId, createdAt, rootCategoryId, status } = tempFilters;

  return (
    <div
      className={cx(
        'flex flex-col bg-[#f5f7f9] w-[320px] border-l border-[#cfd7df] overflow-y-auto',
        className
      )}
    >
      <div className="flex-grow p-4">
        <div className="h-7 text-sm font-medium">过滤</div>

        <Field title="客服">
          <AssigneeSelect value={assigneeId} onChange={(assigneeId) => merge({ assigneeId })} />
        </Field>

        <Field title="客服组">
          <GroupSelect value={groupId} onChange={(groupId) => merge({ groupId })} />
        </Field>

        <Field title="创建时间">
          <CreatedAtSelect value={createdAt} onChange={(createdAt) => merge({ createdAt })} />
        </Field>

        <Field title="分类">
          <CategorySelect
            value={rootCategoryId}
            onChange={(rootCategoryId) => merge({ rootCategoryId })}
          />
        </Field>

        <Field title="状态">
          <StatusSelect value={status} onChange={(status) => merge({ status })} />
        </Field>
      </div>

      <div className="sticky bottom-0 px-4 pb-2 bg-[#f5f7f9]">
        <div className="pt-4 border-t border-[#ebeff3]">
          <Button className="w-full" type="primary" disabled={!isDirty} onClick={handleChange}>
            应用
          </Button>
        </div>
      </div>
    </div>
  );
}
