import React, { FC, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import cx from 'classnames';

import { Button, Divider, Input } from '@/components/antd';
import { UserSelect } from '@/components/common';
import { Filters } from '../useTicketFilter';
import { AssigneeSelect } from './AssigneeSelect';
import { GroupSelect } from './GroupSelect';
import { TagSelect } from './TagSelect';
import { CreatedAtSelect } from './CreatedAtSelect';
import { CategorySelect } from './CategorySelect';
import { StatusSelect } from './StatusSelect';
import { EvaluationStarSelect } from './EvaluationStarSelect';
import { FieldSelect } from './FieldSelect';
import { useSorterLimited } from '../useSorterLimited';

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

export const FilterForm: FC<FilterFormProps> = ({ className, filters, onChange }) => {
  const [tempFilters, setTempFilters] = useState(filters);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setTempFilters(filters);
    setIsDirty(false);
  }, [filters]);

  const {
    keyword,
    authorId,
    assigneeId,
    groupId,
    reporterId,
    participantId,
    tagKey,
    tagValue,
    privateTagKey,
    privateTagValue,
    createdAt,
    rootCategoryId,
    status,
    star,
    fieldName,
    fieldValue,
  } = tempFilters;

  const merge = useCallback((filters: Filters) => {
    setTempFilters((prev) => ({ ...prev, ...filters }));
    setIsDirty(true);
  }, []);

  const handleChange = () => {
    onChange(tempFilters);
  };

  const { setLimitedSorter } = useSorterLimited();

  const [normalDisabled, fieldDisabled] = useMemo(() => {
    const { fieldName, fieldValue, createdAt, ...normalFields } = tempFilters;

    const normalDisabled = !!fieldName && !!fieldValue;

    setLimitedSorter(normalDisabled);

    return [
      normalDisabled,
      Object.values(normalFields).some((v) => (Array.isArray(v) ? v.length : !!v)) &&
        !(fieldName && fieldValue),
    ];
  }, [tempFilters, setLimitedSorter]);

  return (
    <div
      className={cx(
        'flex flex-col bg-[#f5f7f9] w-[320px] border-l border-[#cfd7df] overflow-y-auto',
        className
      )}
    >
      <div className="grow p-4">
        <Divider plain>通用字段</Divider>

        <Field title="创建时间">
          <CreatedAtSelect value={createdAt} onChange={(createdAt) => merge({ createdAt })} />
        </Field>

        <Divider plain>
          普通筛选
          {normalDisabled && <p className="text-[#ffae4a]">不能与工单字段值筛选同时使用</p>}
        </Divider>

        <Field title="关键词">
          <Input
            autoFocus
            value={keyword}
            onChange={(e) => merge({ keyword: e.target.value || undefined })}
            onKeyDown={(e) => e.key === 'Enter' && handleChange()}
            disabled={normalDisabled}
          />
        </Field>

        <Field title="分类">
          <CategorySelect
            value={rootCategoryId}
            onChange={(rootCategoryId) => merge({ rootCategoryId })}
            disabled={normalDisabled}
          />
        </Field>

        <Field title="客服组">
          <GroupSelect
            value={groupId}
            onChange={(groupId) => merge({ groupId })}
            disabled={normalDisabled}
          />
        </Field>

        <Field title="负责人">
          <AssigneeSelect
            includeCollaborators
            value={assigneeId}
            onChange={(assigneeId) => merge({ assigneeId })}
            disabled={normalDisabled}
          />
        </Field>

        <Field title="参与的客服">
          <AssigneeSelect
            value={participantId}
            onChange={(participantId) => merge({ participantId })}
            disabled={normalDisabled}
          />
        </Field>

        <Field title="用户">
          <UserSelect
            allowClear
            className="w-full"
            value={authorId}
            onChange={(authorId) => merge({ authorId: authorId as string })}
            disabled={normalDisabled}
          />
        </Field>

        <Field title="代提单客服">
          <AssigneeSelect
            value={reporterId}
            onChange={(reporterId) => merge({ reporterId })}
            disabled={normalDisabled}
          />
        </Field>

        <Field title="状态">
          <StatusSelect
            value={status}
            onChange={(status) => merge({ status })}
            disabled={normalDisabled}
          />
        </Field>

        <Field title="评价">
          <EvaluationStarSelect
            value={star}
            onChange={(star) => merge({ star })}
            disabled={normalDisabled}
          />
        </Field>

        <Field title="标签">
          <TagSelect
            value={{ tagKey, tagValue, privateTagKey, privateTagValue }}
            onChange={merge}
            disabled={normalDisabled}
          />
        </Field>

        <Divider plain>
          工单选项字段值筛选
          {fieldDisabled && <p className="text-[#ffae4a]">不能与普通筛选同时使用</p>}
        </Divider>

        <Field title="工单选项字段">
          <FieldSelect
            value={fieldName && fieldValue ? { name: fieldName, value: fieldValue } : undefined}
            onChange={({ name, value }) => merge({ fieldName: name, fieldValue: value })}
            disabled={fieldDisabled}
          />
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
};
