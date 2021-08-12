import { useCallback, useMemo, useState } from 'react';
import { BsLayoutSidebarReverse } from 'react-icons/bs';
import { HiChevronDown, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { Transition } from '@headlessui/react';
import { StringParam, useQueryParam } from 'use-query-params';

import { usePage } from 'utils/usePage';
import Button from 'components/Button';
import Menu from 'components/Menu';

export interface PaginationProps {
  starts?: number;
  ends?: number;
  totalCount?: number;
  isLoading?: boolean;
}

export function Pagination({ starts = 0, ends = 0, totalCount = 0, isLoading }: PaginationProps) {
  const [page = 1, setPage] = usePage();

  return (
    <>
      <div className="text-sm text-gray-900 mx-1">
        {starts} - {ends} / {totalCount}
      </div>
      <div>
        <Button
          className="rounded-r-none"
          onClick={() => setPage(page - 1)}
          disabled={isLoading || page === 1}
        >
          <HiChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          className="rounded-l-none"
          onClick={() => setPage(page + 1)}
          disabled={isLoading || ends === totalCount}
        >
          <HiChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </>
  );
}

export function useOrderBy(key = 'orderBy') {
  const [orderBy, setOrderBy] = useQueryParam(key, StringParam);
  const [orderKey, orderType] = useMemo<[string, 'asc' | 'desc']>(() => {
    if (!orderBy) {
      return ['createdAt', 'desc'];
    }
    if (orderBy.endsWith('-asc')) {
      return [orderBy.slice(0, -4), 'asc'];
    }
    if (orderBy.endsWith('-desc')) {
      return [orderBy.slice(0, -5), 'desc'];
    }
    return [orderBy, 'desc'];
  }, [orderBy]);

  const setOrderKey = useCallback(
    (orderKey: string) => {
      if (orderType === 'asc') {
        setOrderBy(orderKey + '-asc');
      } else {
        setOrderBy(orderKey);
      }
    },
    [orderType, setOrderBy]
  );

  const setOrderType = useCallback(
    (orderType: 'asc' | 'desc') => {
      if (orderType === 'asc') {
        setOrderBy(orderKey + '-asc');
      } else {
        setOrderBy(orderKey);
      }
    },
    [orderKey, setOrderBy]
  );

  return { orderKey, orderType, setOrderKey, setOrderType };
}

const orderKeys: Record<string, string> = {
  createdAt: '创建日期',
  updatedAt: '最后修改时间',
  status: '状态',
};

export function OrderDropdown() {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const { orderKey, orderType, setOrderKey, setOrderType } = useOrderBy();

  const handleSelect = useCallback(
    (key: string) => {
      switch (key) {
        case 'createdAt':
        case 'updatedAt':
        case 'status':
          setOrderKey(key);
          break;
        case 'asc':
        case 'desc':
          setOrderType(key);
          break;
      }
      setOpen(false);
    },
    [setOrderKey, setOrderType]
  );

  return (
    <span
      tabIndex={-1}
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as any)) {
          setOpen(false);
        }
      }}
    >
      <button className="" onClick={toggle}>
        <span className="text-gray-500">排序方式:</span>
        <span className="ml-2 text-sm text-[#183247] font-medium">
          {orderKeys[orderKey]} <HiChevronDown className="inline" />
        </span>
      </button>
      <Transition
        show={open}
        className="absolute mt-1"
        enter="transition pointer-events-none"
        enterFrom="opacity-0 -translate-y-4"
        enterTo="opacity-100 translate-y-0"
        leave="transition pointer-events-none"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <Menu className="shadow" onSelect={handleSelect}>
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

export interface TopbarProps extends PaginationProps {
  showFilter?: boolean;
  onClickFilter: () => void;
}

export function Topbar({
  starts,
  ends,
  totalCount,
  isLoading,
  showFilter,
  onClickFilter,
}: TopbarProps) {
  return (
    <div className="flex-shrink-0 bg-gray-50 h-14 flex items-center px-4 border-b border-gray-200">
      <div className="flex-grow">
        <OrderDropdown />
      </div>
      <div className="flex items-center gap-2">
        <Pagination starts={starts} ends={ends} totalCount={totalCount} isLoading={isLoading} />
        <Button active={showFilter} onClick={onClickFilter}>
          <BsLayoutSidebarReverse className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
