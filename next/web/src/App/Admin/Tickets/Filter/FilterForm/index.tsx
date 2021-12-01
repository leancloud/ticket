import { PropsWithChildren, useCallback, useEffect, useState } from 'react';
import cx from 'classnames';
import { isUndefined, omitBy } from 'lodash-es';

import { Button } from '@/components/antd';
import { AssigneeSelect } from './AssigneeSelect';
import { GroupSelect } from './GroupSelect';
import { CreatedAtSelect } from './CreatedAtSelect';
import { CategorySelect } from './CategorySelect';
import { StatusSelect } from './StatusSelect';
import { FilterMap } from '..';

function Field({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <div className="mt-4">
      <label className="block pb-1.5 text-[#475867] text-sm font-medium">{title}</label>
      {children}
    </div>
  );
}

export interface FilterFormProps {
  filters: FilterMap;
  onChange: (filters: FilterMap) => void;
  className?: string;
}

export function FilterForm({ filters, onChange, className }: FilterFormProps) {
  const [tempFilters, setTempFilters] = useState(filters);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setTempFilters(filters);
    setIsDirty(false);
  }, [filters]);

  const merge = useCallback((data: typeof tempFilters) => {
    setTempFilters((prev) => ({ ...prev, ...data }));
    setIsDirty(true);
  }, []);

  const handleChange = () => {
    onChange(omitBy({ ...filters, ...tempFilters }, isUndefined));
  };

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
          <AssigneeSelect
            value={tempFilters.assigneeIds}
            onChange={(assigneeIds) => merge({ assigneeIds })}
          />
        </Field>

        <Field title="客服组">
          <GroupSelect value={tempFilters.groupIds} onChange={(groupIds) => merge({ groupIds })} />
        </Field>

        <Field title="创建时间">
          <CreatedAtSelect
            value={tempFilters.createdAt}
            onChange={(createdAt) => merge({ createdAt })}
          />
        </Field>

        <Field title="分类">
          <CategorySelect
            value={tempFilters.rootCategoryId}
            onChange={(rootCategoryId) => merge({ rootCategoryId })}
          />
        </Field>

        <Field title="状态">
          <StatusSelect value={tempFilters.statuses} onChange={(statuses) => merge({ statuses })} />
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
