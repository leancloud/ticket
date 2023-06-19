import { ComponentPropsWithoutRef, forwardRef, useEffect, useMemo, useState } from 'react';
import { BsFunnel } from 'react-icons/bs';
import {
  HiAdjustments,
  HiChevronLeft,
  HiChevronRight,
  HiOutlineChartPie,
  HiOutlineRefresh,
  HiOutlineDownload,
} from 'react-icons/hi';
import { useQueryClient } from 'react-query';
import cx from 'classnames';

import { Badge, Checkbox, InputNumber, Radio, Select, Tooltip } from '@/components/antd';
import { useOrderBy as _useOrderBy } from '@/utils/useOrderBy';
import { useCurrentUserIsCustomerService } from '@/leancloud';
import styles from './index.module.css';
import { BatchUpdateDialog } from './BatchUpdateDialog';
import { BatchOperationMenu } from './BatchOperateMenu';
import { BatchUpdateData, BatchUpdateError, batchUpdate } from './batchUpdate';
import { SortDropdown } from './SortDropdown';
import { useLocalFilters } from '../Filter';
import { Exporter } from './Exporter';
import { some, omit } from 'lodash-es';
import { useTicketSwitchType } from '../useTicketSwitchType';

export { useOrderBy } from './SortDropdown';

interface NavButtonProps extends ComponentPropsWithoutRef<'button'> {
  active?: boolean;
}

const NavButton = forwardRef<HTMLButtonElement, NavButtonProps>(({ active, ...props }, ref) => {
  return (
    <button
      {...props}
      ref={ref}
      className={cx(
        'border border-gray-300 rounded transition-colors text-gray-600 hover:bg-gray-200 disabled:hover:bg-transparent disabled:cursor-default disabled:opacity-40',
        {
          'shadow-inner bg-gray-200': active,
        },
        props.className
      )}
    />
  );
});

interface BatchOperationsProps {
  checkedTicketIds: string[];
  disabled?: boolean;
  onSuccess: () => void;
}

function BatchOperations({ checkedTicketIds, disabled, onSuccess }: BatchOperationsProps) {
  const [batchUpdateOpen, setBatchUpdateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (data: BatchUpdateData) => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);
    try {
      await batchUpdate(checkedTicketIds, data);
      // TODO(sdjdd): 整个好看的 toast :wise-me:
      alert(`${checkedTicketIds.length} 个工单更新成功`);
      setBatchUpdateOpen(false);
      onSuccess();
      queryClient.invalidateQueries('tickets');
    } catch (error) {
      const errors = (error as BatchUpdateError).errors;
      console.error(errors);
      alert(`${errors.length} 个子任务执行失败，请打开控制台查看详细信息`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <NavButton
        className="inline-flex items-center px-2 py-1"
        disabled={disabled || isLoading}
        onClick={() => setBatchUpdateOpen(!batchUpdateOpen)}
      >
        <HiOutlineRefresh className="inline w-[14px] h-[14px] mr-1" />
        批量更新
      </NavButton>

      <BatchOperationMenu
        className="ml-1"
        trigger={
          <NavButton
            className="inline-flex items-center px-2 py-1"
            disabled={disabled || isLoading}
          >
            <HiAdjustments className="inline w-[14px] h-[14px] mr-1" />
            批量操作
          </NavButton>
        }
        onOperate={(operation) => handleSubmit({ operation })}
      />

      <BatchUpdateDialog
        open={batchUpdateOpen}
        onClose={() => !isLoading && setBatchUpdateOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}

interface PaginationProps {
  className?: string;
  page: number;
  pageSize: number;
  onChangePage: (page: number) => void;
  onChangePageSize: (pageSize: number) => void;
  count?: number;
  totalCount?: number;
  isLoading?: boolean;
}

function Pagination({
  className,
  page,
  pageSize,
  onChangePage,
  onChangePageSize,
  count,
  totalCount,
  isLoading,
}: PaginationProps) {
  const [text, setText] = useState('');
  const [noMorePages, setNoMorePages] = useState(false);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    if (!isLoading && count !== undefined && totalCount !== undefined) {
      const starts = (page - 1) * pageSize;
      const ends = starts + count;
      if (count) {
        setText(`${starts + 1} - ${ends} / ${totalCount}`);
      } else {
        setText(`-- / ${totalCount}`);
      }
      setNoMorePages(ends === totalCount);
      setOverflow(ends > totalCount);
    }
  }, [page, pageSize, count, totalCount, isLoading]);

  return (
    <div className={cx('flex items-center', className)}>
      <span className="text-[#6f7c87]">{text || 'Loading...'}</span>
      <NavButton
        className="ml-2.5 px-[7px] py-[7px] rounded-r-none"
        disabled={isLoading || page === 1}
        onClick={() => (overflow ? onChangePage(1) : onChangePage(page - 1))}
      >
        <HiChevronLeft className="w-4 h-4" />
      </NavButton>
      <InputNumber
        className="!w-14 !border-x-0 !rounded-none"
        type="number"
        size="small"
        min={1}
        max={Math.ceil((totalCount ?? Number.MAX_SAFE_INTEGER) / pageSize)}
        value={page}
        onChange={(v) => {
          if (v !== null) {
            onChangePage(v)
          }
        }}
      />
      <NavButton
        className="px-[7px] py-[7px] rounded-l-none"
        disabled={isLoading || noMorePages || overflow}
        onClick={() => onChangePage(page + 1)}
      >
        <HiChevronRight className="w-4 h-4" />
      </NavButton>
      <Select
        size="small"
        options={[
          {
            label: '20 条/页',
            value: 20,
          },
          {
            label: '50 条/页',
            value: 50,
          },
          {
            label: '100 条/页',
            value: 100,
          },
        ]}
        value={pageSize}
        onChange={onChangePageSize}
        style={{ width: 100, marginLeft: 8 }}
      />
    </div>
  );
}

export interface TopbarProps extends ComponentPropsWithoutRef<'div'> {
  showFilter?: boolean;
  onChangeShowFilter?: (value: boolean) => void;
  showStatsPanel?: boolean;
  onChangeShowStatsPanel?: (value: boolean) => void;
  page: number;
  pageSize: number;
  onChangePage: (page: number) => void;
  onChangePageSize: (pageSize: number) => void;
  count?: number;
  totalCount?: number;
  isLoading?: boolean;
  checkedTicketIds?: string[];
  onCheckedChange: (checked: boolean) => void;
}

export function Topbar({
  showFilter,
  onChangeShowFilter,
  page,
  pageSize,
  onChangePage,
  onChangePageSize,
  count,
  totalCount,
  isLoading,
  checkedTicketIds,
  onCheckedChange,
  showStatsPanel,
  onChangeShowStatsPanel,
  ...props
}: TopbarProps) {
  const [localFilters] = useLocalFilters();
  const [type, setType] = useTicketSwitchType();
  const indeterminate = useMemo(() => {
    if (checkedTicketIds !== undefined && count !== undefined) {
      if (checkedTicketIds.length > 0 && checkedTicketIds.length !== count) {
        return true;
      }
    }
    return false;
  }, [checkedTicketIds, count]);

  const isCustomerService = useCurrentUserIsCustomerService();

  return (
    <div
      {...props}
      className={cx(
        styles.topbar,
        'flex items-center h-14 bg-[#f4f7f9] px-4 border-b border-[#cfd7df]',
        props.className
      )}
    >
      <div className="flex grow items-center">
        <span className="mr-4">
          <Checkbox
            indeterminate={indeterminate}
            disabled={isLoading}
            checked={!!(checkedTicketIds && count && checkedTicketIds.length === count)}
            onChange={(e) => onCheckedChange(e.target.checked)}
          />
        </span>

        {!checkedTicketIds || checkedTicketIds.length === 0 ? (
          <SortDropdown disabled={isLoading} />
        ) : (
          <BatchOperations
            checkedTicketIds={checkedTicketIds}
            disabled={isLoading || !isCustomerService}
            onSuccess={() => onCheckedChange(false)}
          />
        )}
      </div>

      <Pagination
        className="ml-4"
        page={page}
        pageSize={pageSize}
        onChangePage={onChangePage}
        onChangePageSize={onChangePageSize}
        count={count}
        totalCount={totalCount}
        isLoading={isLoading}
      />

      {isCustomerService && (
        <Radio.Group
          onChange={(e) => {
            setType(e.target.value);
          }}
          value={type}
          className="!ml-2 px-[7px] py-[7px]"
          size="small"
        >
          <Tooltip title="待处理工单为状态为新工单或者等待客服处理的，被分配到用户或者被分配到用户所在客服组内且无人负责的工单">
            <Radio.Button value="processable">待处理工单</Radio.Button>
          </Tooltip>
          <Radio.Button value="all">全部工单</Radio.Button>
        </Radio.Group>
      )}

      {isCustomerService && (
        <Tooltip title="分析">
          <NavButton
            className="ml-2 px-[7px] py-[7px]"
            disabled={
              count === 0 ||
              !!(localFilters.type === 'normal' && localFilters.keyword) ||
              localFilters.type === 'field' ||
              type === 'processable'
            }
            active={showStatsPanel}
            onClick={() => onChangeShowStatsPanel?.(!showStatsPanel)}
          >
            <HiOutlineChartPie className="w-4 h-4" />
          </NavButton>
        </Tooltip>
      )}

      {isCustomerService && (
        <Exporter
          trigger={
            <NavButton
              className="ml-2 px-[7px] py-[7px]"
              disabled={
                totalCount === 0 ||
                !!(localFilters.type === 'normal' && localFilters.keyword) ||
                localFilters.type === 'field' ||
                type === 'processable'
              }
            >
              <HiOutlineDownload className="w-4 h-4" />
            </NavButton>
          }
        />
      )}

      <Badge dot={some(omit(localFilters, ['type']), (v) => !!v) && type !== 'processable'}>
        <NavButton
          className="ml-2 px-[7px] py-[7px]"
          active={showFilter}
          onClick={() => onChangeShowFilter?.(!showFilter)}
          disabled={type === 'processable'}
        >
          <BsFunnel className="w-4 h-4" />
        </NavButton>
      </Badge>
    </div>
  );
}
