import {
  ComponentPropsWithoutRef,
  PropsWithChildren,
  useCallback,
  useEffect,
  useState,
} from 'react';
import cx from 'classnames';
import { QueryParamConfig, useQueryParams } from 'use-query-params';

import { usePage } from 'utils/usePage';
import Button from 'components/Button';
import { AssigneeSelect } from './AssigneeSelect';
import { GroupSelect } from './GroupSelect';
import { CreatedAtSelect } from './CreatedAtSelect';
import { CategorySelect } from './CategorySelect';
import { StatusSelect } from './StatusSelect';

const CsvParam: QueryParamConfig<string[] | undefined> = {
  encode: (data) => {
    if (data && data.length) {
      return data.join(',');
    }
  },
  decode: (data) => {
    if (typeof data === 'string') {
      return data.split(',');
    }
  },
};

const StrParam: QueryParamConfig<string | undefined> = {
  encode: (data) => data,
  decode: (data) => {
    if (typeof data === 'string') {
      return data;
    }
  },
};

const CsvIntParam: QueryParamConfig<number[] | undefined> = {
  encode: (data) => CsvParam.encode(data?.map((item) => item.toString())),
  decode: (data) => CsvParam.decode(data)?.map((item) => parseInt(item)),
};

export function useTicketSearchParams() {
  return useQueryParams({
    assigneeId: CsvParam,
    groupId: CsvParam,
    createdAt: StrParam,
    categoryId: StrParam,
    status: CsvIntParam,
  });
}

function Field({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <div className="mt-4">
      <label className="block pb-1.5 font-medium text-sm text-[#314d66]">{title}</label>
      {children}
    </div>
  );
}

export interface FilterProps extends ComponentPropsWithoutRef<'div'> {}

export function Filter(props: FilterProps) {
  const [, setPage] = usePage();
  const [data, setData] = useTicketSearchParams();
  const [tempData, setTempData] = useState(data);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setTempData(data);
    setDirty(false);
  }, [data]);

  const merge = useCallback((newData: Partial<typeof data>) => {
    setTempData((prev) => ({ ...prev, ...newData }));
    setDirty(true);
  }, []);

  const apply = () => {
    setData(tempData);
    setPage(1);
  };

  return (
    <div
      {...props}
      className={cx(
        'flex flex-col bg-[#f5f7f9] w-[320px] border-l border-[#cfd7df] overflow-y-auto',
        props.className
      )}
    >
      <div className="flex-grow p-4">
        <div className="h-7 text-sm font-medium">过滤</div>

        <Field title="客服">
          <AssigneeSelect
            value={tempData.assigneeId}
            onChange={(assigneeId) => merge({ assigneeId })}
          />
        </Field>

        <Field title="客服组">
          <GroupSelect value={tempData.groupId} onChange={(groupId) => merge({ groupId })} />
        </Field>

        <Field title="创建时间">
          <CreatedAtSelect
            value={tempData.createdAt}
            onChange={(createdAt) => merge({ createdAt })}
          />
        </Field>

        <Field title="分类">
          <CategorySelect
            value={tempData.categoryId}
            onChange={(categoryId) => merge({ categoryId })}
          />
        </Field>

        <Field title="状态">
          <StatusSelect value={tempData.status} onChange={(status) => merge({ status })} />
        </Field>
      </div>

      <div className="sticky bottom-0 px-4 pb-2 bg-[#f5f7f9]">
        <div className="pt-4 border-t border-[#ebeff3]">
          <Button className="w-full" variant="primary" disabled={!dirty} onClick={apply}>
            应用
          </Button>
        </div>
      </div>
    </div>
  );
}
