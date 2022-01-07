import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { Link, Outlet, useNavigate, useParams } from 'react-router-dom';
import { AiOutlineLeft, AiOutlineReload } from 'react-icons/ai';
import cx from 'classnames';

import { useCurrentUser } from '@/leancloud';
import { useCustomerServiceGroups, UserSchema } from '@/api/user';
import { ViewSchema, useView, useViews } from '@/api/view';
import { useTickets } from '@/api/ticket';
import { Table } from '@/components/antd';
import { columnLabels } from '@/App/Admin/Settings/Views/EditView';
import { GroupSchema } from 'api/group';

interface ViewMenuItemsProps {
  items: ViewSchema[];
  currentViewId?: string;
  onChange: (id: string) => void;
}

function ViewMenuItems({ items, currentViewId, onChange }: ViewMenuItemsProps) {
  return (
    <div className="p-4">
      {items.map(({ id, title }) => {
        const active = id === currentViewId;
        const count = 114514;
        const dark = count || active;
        return (
          <button
            key={id}
            className={cx('flex w-full h-9 text-left leading-9 px-4 rounded hover:bg-primary-400', {
              'text-[#68737D] hover:text-[#68737D]': !dark,
              'text-[#2f3941] hover:text-[#2f3941]': dark,
              'bg-primary-600 hover:bg-primary-600 font-semibold': active,
            })}
            onClick={() => onChange(id)}
          >
            <div className="grow truncate">{title}</div>
            {count !== undefined && <div>{count}</div>}
          </button>
        );
      })}
    </div>
  );
}

interface ViewMenu {
  className?: string;
  expand?: boolean;
  onToggleExpand: () => void;
  sharedViews?: ViewSchema[];
  personalViews?: ViewSchema[];
  currentViewId?: string;
  onChange: (id: string) => void;
}

function ViewMenu({
  className,
  expand,
  onToggleExpand,
  sharedViews,
  personalViews,
  currentViewId,
  onChange,
}: ViewMenu) {
  return (
    <div className={cx(className, 'w-[330px] flex flex-col')}>
      <div className="flex shrink-0 items-center mx-4 mt-10 h-10 border-b border-[#d8dcde]">
        <div className="grow font-semibold ml-4">视图</div>
        <button className="flex w-8 h-8 rounded hover:bg-gray-100" title="刷新">
          <AiOutlineReload className="m-auto w-4 h-4" />
        </button>
        <button
          className={cx(
            'flex w-8 h-8 rounded hover:bg-gray-100 transition-transform duration-300',
            {
              'translate-x-[52px]': !expand,
            }
          )}
          title="隐藏"
          onClick={onToggleExpand}
        >
          <AiOutlineLeft
            className={cx('m-auto w-4 h-4 transition-transform duration-300', {
              'rotate-180': !expand,
            })}
          />
        </button>
      </div>

      <div
        className={cx('grow overflow-y-auto transition-opacity duration-300', {
          'opacity-0': !expand,
        })}
      >
        {sharedViews && (
          <ViewMenuItems items={sharedViews} currentViewId={currentViewId} onChange={onChange} />
        )}

        {personalViews && (
          <>
            <div className="px-8 pt-3 font-semibold text-[#2f3941]">您的视图</div>
            <ViewMenuItems
              items={personalViews}
              currentViewId={currentViewId}
              onChange={onChange}
            />
          </>
        )}

        <div className="px-8 pt-3 pb-6">
          <Link to="/admin/settings/views">管理视图</Link>
        </div>
      </div>
    </div>
  );
}

interface ColumnConfig {
  dataIndex?: string;
  render?: (...args: any[]) => JSX.Element;
}

const columnConfigs: Record<string, ColumnConfig> = {
  author: {
    render: (u: UserSchema) => <div>{u.nickname}</div>,
  },
  assignee: {
    render: (u: UserSchema) => <div>{u?.nickname ?? '-'}</div>,
  },
  group: {
    render: (g: GroupSchema) => <div>{g?.name ?? '-'}</div>,
  },
  category: {
    dataIndex: 'categoryId',
  },
  createdAt: {
    render: (str: string) => <div>{str.slice(0, 10)}</div>,
  },
  updatedAt: {
    render: (str: string) => <div>{str.slice(0, 10)}</div>,
  },
};

export function ViewTickets() {
  const { id } = useParams();

  const { data: view, isLoading } = useView(id!);

  const { data: tickets } = useTickets();

  const columns = useMemo(() => {
    return view?.fields.map((field) => {
      const cfg = columnConfigs[field];
      return {
        title: columnLabels[field] ?? field,
        dataIndex: cfg?.dataIndex ?? field,
        render: cfg?.render,
      };
    });
  }, [view]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-10">
      <div className="mb-5">
        <div className="text-[26px] text-[#2F3941]">{view!.title}</div>
      </div>

      <Table
        columns={columns}
        dataSource={tickets}
        rowKey="id"
        rowClassName="cursor-pointer"
        onRow={(record) => ({
          onClick: () => window.open(`/tickets/${record.nid}`),
        })}
      />
    </div>
  );
}

export function Views() {
  const { id } = useParams();
  const [expandViewMenu, setExpandViewMenu] = useState(true);

  const currentUser = useCurrentUser();

  const { data: userGroups } = useCustomerServiceGroups(currentUser!.id);
  const groupIds = useMemo(() => {
    return ['null', ...(userGroups?.map((g) => g.id) ?? [])];
  }, [userGroups]);

  const { data: sharedViews } = useViews({
    groupIds,
    userIds: ['null'],
    queryOptions: {
      enabled: groupIds !== undefined && groupIds.length > 0,
    },
  });

  const { data: personalViews } = useViews({
    userIds: [currentUser!.id],
  });

  const findView = useCallback(
    (id: string) => {
      if (sharedViews) {
        const target = sharedViews.find((v) => v.id === id);
        if (target) {
          return target;
        }
      }
      if (personalViews) {
        const target = personalViews.find((v) => v.id === id);
        if (target) {
          return target;
        }
      }
    },
    [sharedViews, personalViews]
  );

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const handleChangeView = (id: string) => {
    const view = findView(id);
    if (view) {
      queryClient.setQueryData(['view', id], view);
      navigate(id);
    }
  };

  return (
    <div className="flex h-full bg-white">
      <div
        className={cx(
          'flex flex-row-reverse border-r border-[#d8dcde] transition-all duration-300',
          {
            'w-[330px]': expandViewMenu,
            'w-[40px] pr-10': !expandViewMenu,
          }
        )}
      >
        <ViewMenu
          expand={expandViewMenu}
          onToggleExpand={() => setExpandViewMenu(!expandViewMenu)}
          sharedViews={sharedViews}
          personalViews={personalViews}
          currentViewId={id}
          onChange={handleChangeView}
        />
      </div>
      <div className="grow">
        <Outlet />
      </div>
    </div>
  );
}
