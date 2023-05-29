import React, { FC, PropsWithChildren, useCallback, useEffect, useState } from 'react';
import cx from 'classnames';

import { Button, Input, Tabs } from '@/components/antd';
import { UserSelect } from '@/components/common';
import { FieldFilters, Filters, NormalFilters, OptionFieldFilters } from '../useTicketFilter';
import { AssigneeSelect } from './AssigneeSelect';
import { GroupSelect } from './GroupSelect';
import { TagSelect } from './TagSelect';
import { CreatedAtSelect } from './CreatedAtSelect';
import { CategorySelect } from './CategorySelect';
import { StatusSelect } from './StatusSelect';
import { EvaluationStarSelect } from './EvaluationStarSelect';
import { FieldSelect } from './FieldSelect';
import { LocaleSelect } from '@/App/Admin/components/LocaleSelect';
import { TicketLanguages } from '@/i18n/locales';

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

interface FilterFormItemProps<Filter extends Filters> {
  filters: Filter;
  merge: (filters: Omit<Filter, 'type'>) => void;
  onSubmit?: () => void;
}

const NormalFieldForm = ({ filters, merge, onSubmit }: FilterFormItemProps<NormalFilters>) => {
  const {
    keyword,
    rootCategoryId,
    groupId,
    assigneeId,
    reporterId,
    authorId,
    participantId,
    privateTagKey,
    privateTagValue,
    language,
    star,
    status,
    tagKey,
    tagValue,
    createdAt,
  } = filters;

  return (
    <>
      <Field title="创建时间">
        <CreatedAtSelect value={createdAt} onChange={(createdAt) => merge({ createdAt })} />
      </Field>
      <Field title="关键词">
        <Input
          autoFocus
          value={keyword}
          onChange={(e) => merge({ keyword: e.target.value || undefined })}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
        />
      </Field>

      <Field title="分类">
        <CategorySelect
          value={rootCategoryId}
          onChange={(rootCategoryId) => merge({ rootCategoryId })}
        />
      </Field>

      <Field title="客服组">
        <GroupSelect value={groupId} onChange={(groupId) => merge({ groupId })} />
      </Field>

      <Field title="负责人">
        <AssigneeSelect
          includeCollaborators
          value={assigneeId}
          onChange={(assigneeId) => merge({ assigneeId })}
        />
      </Field>

      <Field title="参与的客服">
        <AssigneeSelect
          value={participantId}
          onChange={(participantId) => merge({ participantId })}
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

      <Field title="代提单客服">
        <AssigneeSelect value={reporterId} onChange={(reporterId) => merge({ reporterId })} />
      </Field>

      <Field title="状态">
        <StatusSelect value={status} onChange={(status) => merge({ status })} />
      </Field>

      <Field title="评价">
        <EvaluationStarSelect value={star} onChange={(star) => merge({ star })} />
      </Field>

      <Field title="标签">
        <TagSelect value={{ tagKey, tagValue, privateTagKey, privateTagValue }} onChange={merge} />
      </Field>

      <Field title="语言">
        <LocaleSelect
          className="w-full"
          locales={TicketLanguages}
          value={language}
          hasUnknown
          mode="multiple"
          onChange={(language) => {
            merge({ language });
          }}
        />
      </Field>
    </>
  );
};

const FieldSearchForm = ({ filters, merge, onSubmit }: FilterFormItemProps<FieldFilters>) => {
  const { q } = filters;

  return (
    <Field title="根据自定义字段搜索工单">
      <Input.Search
        placeholder="根据自定义字段搜索工单"
        value={q}
        onSearch={(value) => merge({ q: value.trim() })}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
      />
    </Field>
  );
};

const OptionFieldForm = ({ filters, merge }: FilterFormItemProps<OptionFieldFilters>) => {
  const { fieldName, fieldValue, createdAt } = filters;

  return (
    <>
      <Field title="创建时间">
        <CreatedAtSelect value={createdAt} onChange={(createdAt) => merge({ createdAt })} />
      </Field>
      <Field title="工单选项字段">
        <FieldSelect
          value={fieldName && fieldValue ? { name: fieldName, value: fieldValue } : undefined}
          onChange={({ name, value }) => merge({ fieldName: name, fieldValue: value })}
        />
      </Field>
    </>
  );
};

export const FilterForm: FC<FilterFormProps> = ({ className, filters, onChange }) => {
  const [tempFilters, setTempFilters] = useState(filters);
  const [isDirty, setIsDirty] = useState(false);
  const [active, setActive] = useState<Filters['type']>('normal');

  useEffect(() => {
    setTempFilters(filters);
    setIsDirty(false);
  }, [filters]);

  const merge = useCallback((filters: Omit<Filters, 'type'>) => {
    setTempFilters((prev) => ({ ...prev, ...filters }));
    setIsDirty(true);
  }, []);

  const handleChange = () => {
    onChange({ ...tempFilters, type: active });
  };

  return (
    <div
      className={cx(
        'flex flex-col bg-[#f5f7f9] w-[320px] border-l border-[#cfd7df] overflow-y-auto',
        className
      )}
    >
      <div className="grow p-4">
        <Tabs activeKey={active} centered onChange={(key) => setActive(key as Filters['type'])}>
          <Tabs.TabPane tab="标准" key="normal">
            <NormalFieldForm
              filters={filters as NormalFilters}
              merge={merge}
              onSubmit={handleChange}
            />
          </Tabs.TabPane>
          <Tabs.TabPane tab="选项" key="option">
            <OptionFieldForm filters={filters as OptionFieldFilters} merge={merge} />
          </Tabs.TabPane>
          <Tabs.TabPane tab="自定义字段" key="field">
            <FieldSearchForm
              filters={filters as FieldFilters}
              merge={merge}
              onSubmit={handleChange}
            />
          </Tabs.TabPane>
        </Tabs>
      </div>

      <div className="sticky bottom-0 px-4 pb-2 bg-[#f5f7f9]">
        <div className="pt-4 border-t border-[#ebeff3]">
          <Button
            className="w-full"
            type="primary"
            disabled={!(tempFilters.type !== active) && !isDirty}
            onClick={handleChange}
          >
            应用
          </Button>
        </div>
      </div>
    </div>
  );
};
