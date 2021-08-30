import { ComponentPropsWithoutRef, useCallback, useEffect, useState } from 'react';
import { BsLayoutSidebarReverse } from 'react-icons/bs';
import { HiChevronDown, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { Transition } from '@headlessui/react';
import cx from 'classnames';

import { Button } from 'components/Button';
import Menu from 'components/Menu';
import { usePage } from 'utils/usePage';
import { useOrderBy as _useOrderBy } from 'utils/useOrderBy';
import styles from './index.module.css';

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

function SortDropdown() {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((cur) => !cur), []);
  const { orderKey, orderType, setOrderKey, setOrderType } = useOrderBy();

  const handleSelect = useCallback(
    (eventKey: string) => {
      if (eventKey === 'asc' || eventKey === 'desc') {
        setOrderType(eventKey);
      } else {
        setOrderKey(eventKey);
      }
      setOpen(false);
    },
    [setOrderKey, setOrderType]
  );

  return (
    <span
      tabIndex={-1}
      className="relative"
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as any) && setOpen(false)}
    >
      <button onClick={toggle}>
        <span className="text-[#6f7c87]">排序方式:</span>
        <span className="ml-2 text-[13px] font-medium">
          {orderKeys[orderKey]} <HiChevronDown className="inline" />
        </span>
      </button>
      <Transition
        show={open}
        className="absolute mt-1 transition"
        enter="pointer-events-none"
        enterFrom="opacity-0 -translate-y-4"
        enterTo="opacity-100 translate-y-0"
        leave="pointer-events-none"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <Menu
          className="border border-gray-300 rounded shadow-md min-w-[120px]"
          onSelect={handleSelect}
        >
          <Menu.Item eventKey="createdAt" active={orderKey === 'createdAt'}>
            {orderKeys.createdAt}
          </Menu.Item>
          <Menu.Item eventKey="updatedAt" active={orderKey === 'updatedAt'}>
            {orderKeys.updatedAt}
          </Menu.Item>
          <Menu.Item eventKey="status" active={orderKey === 'status'}>
            {orderKeys.status}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item eventKey="asc" active={orderType === 'asc'}>
            升序
          </Menu.Item>
          <Menu.Item eventKey="desc" active={orderType === 'desc'}>
            降序
          </Menu.Item>
        </Menu>
      </Transition>
    </span>
  );
}

interface PaginationProps {
  pageSize: number;
  count: number;
  totalCount: number;
  isLoading?: boolean;
}

function Pagination({ pageSize, count, totalCount, isLoading }: PaginationProps) {
  const [page = 1, setPage] = usePage();
  const [text, setText] = useState('');
  const [noMorePages, setNoMorePages] = useState(false);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    if (!isLoading) {
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
      <Button
        className="ml-2.5 px-[7px] py-[7px] rounded-r-none"
        disabled={isLoading || page === 1}
        onClick={() => (overflow ? setPage(1) : setPage(page - 1))}
      >
        <HiChevronLeft className="w-4 h-4" />
      </Button>
      <Button
        className="px-[7px] py-[7px] rounded-l-none"
        disabled={isLoading || noMorePages || overflow}
        onClick={() => setPage(page + 1)}
      >
        <HiChevronRight className="w-4 h-4" />
      </Button>
    </>
  );
}

export interface TopbarProps extends ComponentPropsWithoutRef<'div'> {
  pagination: PaginationProps;
  showFilter?: boolean;
  onChangeShowFilter?: (value: boolean) => void;
}

export function Topbar({ showFilter, onChangeShowFilter, pagination, ...props }: TopbarProps) {
  return (
    <div
      {...props}
      className={cx(
        styles.topbar,
        'flex items-center h-14 bg-[#f4f7f9] px-4 border-b border-[#cfd7df]',
        props.className
      )}
    >
      <div className="flex-grow">{pagination.count > 0 && <SortDropdown />}</div>

      <Pagination {...pagination} />

      <Button
        className="ml-2 px-[7px] py-[7px]"
        active={showFilter}
        onClick={() => onChangeShowFilter?.(!showFilter)}
      >
        <BsLayoutSidebarReverse className="w-4 h-4" />
      </Button>
    </div>
  );
}
