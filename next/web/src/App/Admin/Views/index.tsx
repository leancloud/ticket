import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { Link, Outlet, useNavigate, useParams } from 'react-router-dom';
import { AiOutlineLeft, AiOutlineReload } from 'react-icons/ai';
import cx from 'classnames';
import { produce } from 'immer';
import moment from 'moment';

import { useCurrentUser, useCurrentUserIsAdmin } from '@/leancloud';
import { CategorySchema, useCategories } from '@/api/category';
import { GroupSchema } from '@/api/group';
import { useCustomerServiceGroups, UserSchema } from '@/api/user';
import {
  ViewSchema,
  ViewTicketCountResult,
  useView,
  useViews,
  useViewTickets,
  useViewTicketCounts,
} from '@/api/view';
import { Button, Empty, Spin, Table } from '@/components/antd';
import { columnLabels } from '@/App/Admin/Settings/Views/EditView';
import { useHoverMenu } from '@/App/Admin/components/HoverMenu';
import { TicketOverview } from '@/App/Admin/components/TicketOverview';
import { TicketStatus } from '@/App/Admin/components/TicketStatus';
import { useGetCategoryPath } from '@/utils/useGetCategoryPath';
import { usePage } from '@/utils/usePage';
import { TicketLanguages } from '@/i18n/locales';

const CategoryPathContext = createContext<{
  getCategoryPath: (id: string) => CategorySchema[];
}>({
  getCategoryPath: () => [],
});

const PAGE_SIZE = 20;

interface ViewMenuItemsProps {
  items: ViewSchema[];
  viewTicketCounts?: Record<string, number>;
  currentViewId?: string;
  onChange: (id: string) => void;
}

function ViewMenuItems({ items, viewTicketCounts, currentViewId, onChange }: ViewMenuItemsProps) {
  return (
    <div className="p-4">
      {items.map(({ id, title }) => {
        const active = id === currentViewId;
        const count = viewTicketCounts?.[id];
        const bold = count || active;
        return (
          <button
            key={id}
            className={cx('flex w-full h-9 text-left leading-9 px-4 rounded hover:bg-primary-400', {
              'text-[#68737D] hover:text-[#68737D]': !bold,
              'text-[#2f3941] hover:text-[#2f3941]': bold,
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
  onRefresh: () => void;
  loading?: boolean;
  sharedViews?: ViewSchema[];
  personalViews?: ViewSchema[];
  viewTicketCounts?: Record<string, number>;
  currentViewId?: string;
  onChange: (id: string) => void;
}

function ViewMenu({
  className,
  expand,
  onToggleExpand,
  onRefresh,
  loading,
  sharedViews,
  personalViews,
  viewTicketCounts,
  currentViewId,
  onChange,
}: ViewMenu) {
  const isAdmin = useCurrentUserIsAdmin();
  return (
    <div className={cx(className, 'w-[330px] flex flex-col')}>
      <div className="flex shrink-0 items-center mx-4 mt-10 h-10 border-b border-[#d8dcde]">
        <div className="grow font-semibold ml-4">视图</div>
        <button
          className="flex w-8 h-8 rounded hover:bg-gray-100 disabled:opacity-30"
          title="刷新"
          disabled={loading}
          onClick={() => onRefresh()}
        >
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
          onClick={() => onToggleExpand()}
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
        <div className="relative">
          {loading && (
            <div className="flex items-center justify-center absolute inset-0 bg-[#ffffffcc]">
              <Spin />
            </div>
          )}

          {(!sharedViews || sharedViews.length === 0) &&
            (!personalViews || personalViews.length === 0) && (
              <div className="my-10">
                <Empty />
              </div>
            )}

          {sharedViews && sharedViews.length > 0 && (
            <ViewMenuItems
              items={sharedViews}
              viewTicketCounts={viewTicketCounts}
              currentViewId={currentViewId}
              onChange={onChange}
            />
          )}

          {personalViews && personalViews.length > 0 && (
            <>
              <div className="px-8 pt-3 font-semibold text-[#2f3941]">您的视图</div>
              <ViewMenuItems
                items={personalViews}
                viewTicketCounts={viewTicketCounts}
                currentViewId={currentViewId}
                onChange={onChange}
              />
            </>
          )}
        </div>

        {isAdmin && (
          <div className="px-8 pt-3 pb-6">
            <Link to="/admin/settings/views">管理视图</Link>
          </div>
        )}
      </div>
    </div>
  );
}

interface ColumnConfig {
  className?: string;
  dataIndex?: string;
  render?: (...args: any[]) => JSX.Element;
}

const columnConfigs: Record<string, ColumnConfig> = {
  title: {
    className: 'max-w-[250px]',
    render: (title: string) => <div className="truncate" children={title} />,
  },
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
    render: (id: string) => {
      const { getCategoryPath } = useContext(CategoryPathContext);
      return (
        <div className="whitespace-nowrap">
          {getCategoryPath(id)
            .map((c) => c.name)
            .join(' / ')}
        </div>
      );
    },
  },
  createdAt: {
    render: (t: string) => <div>{moment(t).format('YYYY-MM-DD HH:mm:ss')}</div>,
  },
  updatedAt: {
    render: (t: string) => <div>{moment(t).format('YYYY-MM-DD HH:mm:ss')}</div>,
  },
  status: {
    render: (status: number) => <TicketStatus status={status} />,
  },
  language: {
    render: (language: string | null) => (
      <div>{language ? TicketLanguages[language] : '(未知)'}</div>
    ),
  },
};

export function ViewTickets() {
  const { id } = useParams();
  const [page, { set: setPage }] = usePage();

  const { data: view, isLoading } = useView(id!);

  const include = useMemo(() => {
    if (view) {
      const include: string[] = [];
      ['author', 'assignee', 'group'].forEach((field) => {
        if (view.fields.includes(field)) {
          include.push(field);
        }
      });
      return include.length ? include.join(',') : undefined;
    }
  }, [view]);

  const queryClient = useQueryClient();
  const { data: tickets, totalCount, isLoading: isLoadingTickets } = useViewTickets(id!, {
    page,
    pageSize: PAGE_SIZE,
    include,
    count: true,
    queryOptions: {
      enabled: view !== undefined,
      onSuccess: ({ totalCount }) => {
        if (totalCount !== undefined) {
          queryClient
            .getQueriesData<ViewTicketCountResult[] | undefined>('viewTicketCounts')
            ?.forEach(([key, data]) => {
              if (data) {
                const index = data.findIndex((t) => t.viewId === id);
                if (index >= 0) {
                  queryClient.setQueryData(key, (data) => {
                    return produce(data as ViewTicketCountResult[], (draft) => {
                      draft[index].ticketCount = totalCount;
                    });
                  });
                }
              }
            });
        }
      },
    },
  });

  const columns = useMemo(() => {
    return view?.fields.map((field) => {
      const cfg = columnConfigs[field];
      return {
        ...cfg,
        title: columnLabels[field] ?? field,
        dataIndex: cfg?.dataIndex ?? field,
      };
    });
  }, [view]);

  const { data: categories } = useCategories();
  const getCategoryPath = useGetCategoryPath(categories);

  const { hover, menu } = useHoverMenu({
    render: (ticketId: string) => <TicketOverview ticketId={ticketId} />,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-10">
      <div className="mb-5 flex flex-row justify-between">
        <div>
          <div className="text-[26px] text-[#2F3941]">{view!.title}</div>
          {totalCount !== undefined && <div>{totalCount} 张工单</div>}
        </div>
        <Button
          href={`/tickets/${tickets?.[0]?.nid}?view=${id}`}
          disabled={!tickets?.[0] || !id}
          target="_blank"
          rel="noreferrer noopener"
          type="primary"
        >
          Play
        </Button>
      </div>

      <CategoryPathContext.Provider value={{ getCategoryPath }}>
        <Table
          columns={columns}
          dataSource={tickets}
          rowKey="id"
          rowClassName="cursor-pointer"
          onRow={(record) => ({
            ...hover(record.id),
            onClick: () => window.open(`/next/admin/tickets/${record.nid}`),
          })}
          loading={isLoadingTickets}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            onChange: setPage,
            total: totalCount,
            showSizeChanger: false,
          }}
          scroll={{ x: 'max-content' }}
        />
      </CategoryPathContext.Provider>

      {menu}
    </div>
  );
}

export function Views() {
  const { id } = useParams();
  const [expandViewMenu, setExpandViewMenu] = useState(true);

  const currentUser = useCurrentUser();

  const { data: userGroups, isLoading: loadingGroups } = useCustomerServiceGroups(currentUser!.id);
  const groupIds = useMemo(() => {
    return ['null', ...(userGroups?.map((g) => g.id) ?? [])];
  }, [userGroups]);

  const { data: sharedViews, isFetching: loadingSharedViews } = useViews({
    groupIds,
    userIds: ['null'],
    queryOptions: {
      enabled: !loadingGroups,
    },
  });

  const { data: personalViews, isFetching: loadingPersonalViews } = useViews({
    userIds: [currentUser!.id],
  });

  const viewIds = useMemo(() => {
    if (sharedViews && personalViews) {
      return sharedViews.concat(personalViews).map((v) => v.id);
    }
  }, [sharedViews, personalViews]);

  const navigate = useNavigate();

  useEffect(() => {
    if (!id && viewIds?.length) {
      navigate(viewIds[0], { replace: true });
    }
  }, [viewIds, id]);

  const { data: viewTicketCounts } = useViewTicketCounts(viewIds!, {
    enabled: viewIds !== undefined && viewIds.length > 0,
    keepPreviousData: true,
  });

  const viewTicketCountMap = useMemo(() => {
    return viewTicketCounts?.reduce((map, cur) => {
      map[cur.viewId] = cur.ticketCount;
      return map;
    }, {} as Record<string, number>);
  }, [viewTicketCounts]);

  const findView = (id: string) => {
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
  };

  const queryClient = useQueryClient();

  const handleChangeView = (id: string) => {
    const view = findView(id);
    if (view) {
      queryClient.setQueryData(['view', id], view);
      navigate(id);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries('views');
    queryClient.invalidateQueries('viewTicketCounts');
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
          onRefresh={handleRefresh}
          loading={loadingSharedViews || loadingPersonalViews}
          sharedViews={sharedViews}
          personalViews={personalViews}
          viewTicketCounts={viewTicketCountMap}
          currentViewId={id}
          onChange={handleChangeView}
        />
      </div>

      <div className="grow overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
