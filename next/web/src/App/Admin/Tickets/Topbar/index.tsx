import {
  ComponentPropsWithoutRef,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { BsLayoutSidebarReverse } from 'react-icons/bs';
import {
  HiAdjustments,
  HiChevronDown,
  HiChevronLeft,
  HiChevronRight,
  HiOutlineRefresh,
} from 'react-icons/hi';
import { Menu as HLMenu, Transition } from '@headlessui/react';
import { useQueryClient } from 'react-query';
import cx from 'classnames';

import { Checkbox } from '@/components/antd';
import Menu from '@/components/Menu';
import { usePage } from '@/utils/usePage';
import { useOrderBy as _useOrderBy } from '@/utils/useOrderBy';
import styles from './index.module.css';
import { BatchUpdateDialog } from './BatchUpdateDialog';
import { BatchOperationMenu } from './BatchOperateMenu';
import { BatchUpdateData, BatchUpdateError, batchUpdate } from './batchUpdate';

interface NavButtonProps extends ComponentPropsWithoutRef<'button'> {
  active?: boolean;
}

const NavButton = forwardRef<HTMLButtonElement, NavButtonProps>(({ active, ...props }, ref) => {
  return (
    <button
      {...props}
      ref={ref}
      className={cx(
        'border border-gray-300 rounded px-3 py-1.5 transition-colors text-gray-600 hover:bg-gray-200 disabled:hover:bg-transparent disabled:cursor-default disabled:opacity-40',
        {
          'shadow-inner bg-gray-200': active,
        },
        props.className
      )}
    />
  );
});

export const useOrderBy = () =>
  _useOrderBy({
    defaultOrderKey: 'createdAt',
    defaultOrderType: 'desc',
  });

const orderKeys: Record<string, string> = {
  createdAt: '创建日期',
  updatedAt: '最后修改时间',
  status: '状态',
};

function SortDropdown({ disabled }: { disabled?: boolean }) {
  const { orderKey, orderType, setOrderKey, setOrderType } = useOrderBy();

  const handleSelect = useCallback(
    (eventKey: string) => {
      if (eventKey === 'asc' || eventKey === 'desc') {
        setOrderType(eventKey);
      } else {
        setOrderKey(eventKey);
      }
    },
    [setOrderKey, setOrderType]
  );

  return (
    <HLMenu as="span" className="relative">
      <HLMenu.Button disabled={disabled}>
        <span className="text-[#6f7c87]">排序方式:</span>
        <span className="ml-2 text-[13px] font-medium">
          {orderKeys[orderKey]} <HiChevronDown className="inline" />
        </span>
      </HLMenu.Button>

      <Transition
        enter="transition"
        enterFrom="opacity-0 -translate-y-4"
        leave="transition"
        leaveTo="opacity-0"
      >
        <HLMenu.Items
          as={Menu}
          className="absolute mt-1 border border-gray-300 rounded shadow-md"
          onSelect={handleSelect}
        >
          <HLMenu.Item as={Menu.Item} eventKey="createdAt" active={orderKey === 'createdAt'}>
            {orderKeys.createdAt}
          </HLMenu.Item>
          <HLMenu.Item as={Menu.Item} eventKey="updatedAt" active={orderKey === 'updatedAt'}>
            {orderKeys.updatedAt}
          </HLMenu.Item>
          <HLMenu.Item as={Menu.Item} eventKey="status" active={orderKey === 'status'}>
            {orderKeys.status}
          </HLMenu.Item>
          <Menu.Divider />
          <HLMenu.Item as={Menu.Item} eventKey="asc" active={orderType === 'asc'}>
            升序
          </HLMenu.Item>
          <HLMenu.Item as={Menu.Item} eventKey="desc" active={orderType === 'desc'}>
            降序
          </HLMenu.Item>
        </HLMenu.Items>
      </Transition>
    </HLMenu>
  );
}

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
        className="px-2 py-1"
        disabled={disabled || isLoading}
        onClick={() => setBatchUpdateOpen(!batchUpdateOpen)}
      >
        <HiOutlineRefresh className="inline w-[14px] h-[14px] mb-px mr-1" />
        批量更新
      </NavButton>

      <BatchOperationMenu
        className="ml-1"
        trigger={
          <NavButton className="px-2 py-1" disabled={disabled || isLoading}>
            <HiAdjustments className="inline w-[14px] h-[14px] mb-px mr-1" />
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
  pageSize: number;
  count?: number;
  totalCount?: number;
  isLoading?: boolean;
}

function Pagination({ pageSize, count, totalCount, isLoading }: PaginationProps) {
  const [page = 1, setPage] = usePage();
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
    <>
      <span className="text-[#6f7c87]">{text || 'Loading...'}</span>
      <NavButton
        className="ml-2.5 px-[7px] py-[7px] rounded-r-none"
        disabled={isLoading || page === 1}
        onClick={() => (overflow ? setPage(1) : setPage(page - 1))}
      >
        <HiChevronLeft className="w-4 h-4" />
      </NavButton>
      <NavButton
        className="px-[7px] py-[7px] rounded-l-none"
        disabled={isLoading || noMorePages || overflow}
        onClick={() => setPage(page + 1)}
      >
        <HiChevronRight className="w-4 h-4" />
      </NavButton>
    </>
  );
}

export interface TopbarProps extends ComponentPropsWithoutRef<'div'> {
  showFilter?: boolean;
  onChangeShowFilter?: (value: boolean) => void;
  pageSize: number;
  count?: number;
  totalCount?: number;
  isLoading?: boolean;
  checkedTicketIds?: string[];
  onCheckedChange: (checked: boolean) => void;
}

export function Topbar({
  showFilter,
  onChangeShowFilter,
  pageSize,
  count,
  totalCount,
  isLoading,
  checkedTicketIds,
  onCheckedChange,
  ...props
}: TopbarProps) {
  const indeterminate = useMemo(() => {
    if (checkedTicketIds !== undefined && count !== undefined) {
      if (checkedTicketIds.length > 0 && checkedTicketIds.length !== count) {
        return true;
      }
    }
    return false;
  }, [checkedTicketIds, count]);

  return (
    <div
      {...props}
      className={cx(
        styles.topbar,
        'flex items-center h-14 bg-[#f4f7f9] px-4 border-b border-[#cfd7df]',
        props.className
      )}
    >
      <div className="flex flex-grow items-center">
        <Checkbox
          indeterminate={indeterminate}
          disabled={isLoading}
          checked={!!(checkedTicketIds && count && checkedTicketIds.length === count)}
          onChange={(e) => onCheckedChange(e.target.checked)}
        />
        <span className="ml-4">
          {!checkedTicketIds || checkedTicketIds.length === 0 ? (
            <SortDropdown disabled={isLoading} />
          ) : (
            <BatchOperations
              checkedTicketIds={checkedTicketIds}
              disabled={isLoading}
              onSuccess={() => onCheckedChange(false)}
            />
          )}
        </span>
      </div>

      <Pagination pageSize={pageSize} count={count} totalCount={totalCount} isLoading={isLoading} />

      <NavButton
        className="ml-2 px-[7px] py-[7px]"
        active={showFilter}
        onClick={() => onChangeShowFilter?.(!showFilter)}
      >
        <BsLayoutSidebarReverse className="w-4 h-4" />
      </NavButton>
    </div>
  );
}
