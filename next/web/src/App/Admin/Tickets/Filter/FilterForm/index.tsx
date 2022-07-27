import React, { PropsWithChildren, useCallback, useEffect, useState } from 'react';
import cx from 'classnames';

import { Button, Input, Tooltip } from '@/components/antd';
import { UserSelect } from '@/components/common';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Filters } from '../useTicketFilter';
import { AssigneeSelect } from './AssigneeSelect';
import { GroupSelect } from './GroupSelect';
import { TagSelect } from './TagSelect';
import { CreatedAtSelect } from './CreatedAtSelect';
import { CategorySelect } from './CategorySelect';
import { StatusSelect } from './StatusSelect';
import { EvaluationStarSelect } from './EvaluationStarSelect';

function Field({ title, children }: PropsWithChildren<{ title: React.ReactNode }>) {
  return (
    <div className="mt-4">
      <label className="block pb-1.5 text-[#475867] text-sm font-medium">{title}</label>
      {children}
    </div>
  );
}

export interface FilterFormProps {
  className?: string;
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function FilterForm({ className, filters, onChange }: FilterFormProps) {
  const [tempFilters, setTempFilters] = useState(filters);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setTempFilters(filters);
    setIsDirty(false);
  }, [filters]);

  const merge = useCallback((filters: Filters) => {
    setTempFilters((prev) => ({ ...prev, ...filters }));
    setIsDirty(true);
  }, []);

  const handleChange = () => {
    onChange(tempFilters);
  };

  const {
    keyword,
    authorId,
    assigneeId,
    groupId,
    tagKey,
    tagValue,
    privateTagKey,
    privateTagValue,
    createdAt,
    rootCategoryId,
    status,
    star,
  } = tempFilters;

  return (
    <div
      className={cx(
        'flex flex-col bg-[#f5f7f9] w-[320px] border-l border-[#cfd7df] overflow-y-auto',
        className
      )}
    >
      <div className="grow p-4">
        <Field
          title={
            <>
              <span className="mr-1">关键词</span>
              <Tooltip title="实时统计忽略此字段">
                <QuestionCircleOutlined />
              </Tooltip>
            </>
          }
        >
          <Input
            autoFocus
            value={keyword}
            onChange={(e) => merge({ keyword: e.target.value || undefined })}
            onKeyDown={(e) => e.key === 'Enter' && handleChange()}
          />
        </Field>

        <Field title="用户">
          <UserSelect
            allowClear
            className="w-full"
            value={authorId}
            onChange={(authorId) => merge({ authorId: authorId as string })}
          />
        </Field>

        <Field title="客服">
          <AssigneeSelect value={assigneeId} onChange={(assigneeId) => merge({ assigneeId })} />
        </Field>

        <Field title="客服组">
          <GroupSelect value={groupId} onChange={(groupId) => merge({ groupId })} />
        </Field>

        <Field title="标签">
          <TagSelect
            value={{ tagKey, tagValue, privateTagKey, privateTagValue }}
            onChange={merge}
          />
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

        <Field title="评价">
          <EvaluationStarSelect value={star} onChange={(star) => merge({ star })} />
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
