import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import { AiOutlineLoading } from 'react-icons/ai';
import { groupBy, keyBy } from 'lodash-es';
import { produce } from 'immer';
import cx from 'classnames';

import { useCurrentUser } from '@/leancloud';
import { CategorySchema, useCategories, useCategoryGroups } from '@/api/category';
import {
  CustomerServiceSchema,
  useCustomerServices,
  useAddCustomerServiceCategory,
  useDeleteCustomerServiceCategory,
} from '@/api/customer-service';
import { GroupSchema, useGroups } from '@/api/group';
import { Button, Checkbox, Popover, Table, message } from '@/components/antd';
import { UserLabel } from '@/App/Admin/components';

const { Column } = Table;

interface CategoryRow extends CategorySchema {
  depth: number;
}

function useCategoryRows(categories?: CategorySchema[]): CategoryRow[] | undefined {
  return useMemo(() => {
    if (!categories) {
      return undefined;
    }
    const categoryById = keyBy(categories, 'id');
    const depthById: Record<string, number> = {};
    const getDepth = (id: string): number => {
      if (id in depthById) {
        return depthById[id];
      }
      const category = categoryById[id];
      const depth = category.parentId ? getDepth(category.parentId) + 1 : 0;
      depthById[id] = depth;
      return depth;
    };
    return categories.map((c) => ({ ...c, depth: getDepth(c.id) }));
  }, [categories]);
}

function useSortedCategories(categories?: CategorySchema[]): CategorySchema[] | undefined {
  return useMemo(() => {
    if (!categories) {
      return undefined;
    }
    const sorted: CategorySchema[] = [];
    const categorysByParentId = groupBy(categories, 'parentId');
    const sortFn = (a: CategorySchema, b: CategorySchema) => a.position - b.position;
    const pushFn = (id: string) => {
      const categories = categorysByParentId[id];
      if (categories) {
        categories.sort(sortFn);
        categories.forEach((category) => {
          sorted.push(category);
          pushFn(category.id);
        });
      }
    };
    pushFn('undefined');
    return sorted;
  }, [categories]);
}

function Loading() {
  return <AiOutlineLoading className="animate-spin w-5 h-5 text-primary" />;
}

function NameCell({ category }: { category: CategoryRow }) {
  const { id, name, active, depth } = category;
  const prefix = useMemo(() => {
    if (depth === 0) {
      return null;
    }
    return <span>{'\u3000'.repeat(depth) + '\u2514 '}</span>;
  }, [depth]);

  return (
    <>
      {prefix}
      <Link className={cx({ 'opacity-60': !active })} to={id}>
        {name}
        {!active && ' (停用)'}
      </Link>
    </>
  );
}

function AssigneesCell({
  loading,
  assignees,
}: {
  loading?: boolean;
  assignees?: CustomerServiceSchema[];
}) {
  if (loading) {
    return <Loading />;
  }
  if (!assignees || assignees.length === 0) {
    return <div>-</div>;
  }
  return (
    <Popover
      content={
        <div className="flex flex-wrap gap-2 max-w-[300px]">
          {assignees.map((assignee) => (
            <UserLabel key={assignee.id} user={assignee} />
          ))}
        </div>
      }
    >
      <a>{assignees.length} 位客服</a>
    </Popover>
  );
}

function GroupCell({ loading, group }: { loading?: boolean; group?: GroupSchema }) {
  if (loading) {
    return <Loading />;
  }
  if (!group) {
    return <span>-</span>;
  }
  return <Link to={`/admin/settings/groups/${group.id}`}>{group.name}</Link>;
}

interface CategoryTableProps {
  categories?: CategoryRow[];
  loading?: boolean;
}

function CategoryTable({ categories, loading }: CategoryTableProps) {
  const currentUser = useCurrentUser();

  const { data: customerServices, isLoading: loadingCSs } = useCustomerServices();

  const me = useMemo(() => {
    if (currentUser && customerServices) {
      return customerServices.find((cs) => cs.id === currentUser.id);
    }
  }, [currentUser, customerServices]);

  const myCategoryIds = useMemo(() => new Set(me?.categoryIds), [me]);

  const assigneesByCategoryId = useMemo<Record<string, CustomerServiceSchema[]>>(() => {
    if (!categories || !customerServices) {
      return {};
    }
    const assigneesByCategoryId: Record<string, CustomerServiceSchema[]> = {};
    customerServices.forEach((cs) => {
      cs.categoryIds.forEach((categoryId) => {
        assigneesByCategoryId[categoryId] ??= [];
        assigneesByCategoryId[categoryId].push(cs);
      });
    });
    return assigneesByCategoryId;
  }, [categories, customerServices]);

  const { data: groups, isLoading: loadingGroups } = useGroups();

  const { data: categoryGroups, isLoading: loadingCategoryGroups } = useCategoryGroups();

  const groupByCategoryId = useMemo<Record<string, GroupSchema>>(() => {
    if (groups && categoryGroups) {
      const groupById = keyBy(groups, 'id');
      return categoryGroups.reduce<Record<string, GroupSchema>>((map, cur) => {
        map[cur.categoryId] = groupById[cur.id];
        return map;
      }, {});
    }
    return {};
  }, [groups, categoryGroups]);

  const queryClient = useQueryClient();

  const { mutate: addCSCategory, isLoading: addingCSCategory } = useAddCustomerServiceCategory({
    onSuccess: (_, { categoryId, customerServiceId }) => {
      message.success('添加负责分类成功');
      queryClient.setQueryData<CustomerServiceSchema[] | undefined>(
        ['customerServices'],
        (data) => {
          if (data) {
            return produce(data, (draft) => {
              draft.find((cs) => cs.id === customerServiceId)?.categoryIds.push(categoryId);
            });
          }
        }
      );
    },
    onError: (error) => {
      message.error(error.message);
    },
  });

  const { mutate: delCSCategory, isLoading: deletingCSCategory } = useDeleteCustomerServiceCategory(
    {
      onSuccess: (_, { categoryId, customerServiceId }) => {
        message.success('删除负责分类成功');
        queryClient.setQueryData<CustomerServiceSchema[] | undefined>(
          ['customerServices'],
          (data) => {
            if (data) {
              return produce(data, (draft) => {
                const cs = draft.find((cs) => cs.id === customerServiceId);
                if (cs) {
                  cs.categoryIds = cs.categoryIds.filter((id) => id !== categoryId);
                }
              });
            }
          }
        );
      },
      onError: (error) => {
        message.error(error.message);
      },
    }
  );

  return (
    <Table rowKey="id" size="small" loading={loading} dataSource={categories} pagination={false}>
      <Column key="name" title="名称" render={(category) => <NameCell category={category} />} />
      <Column
        key="checked"
        dataIndex="id"
        title="我是否负责"
        render={(id: string) => {
          if (loadingCSs) {
            return <Loading />;
          }
          return (
            <Checkbox
              disabled={addingCSCategory || deletingCSCategory}
              checked={myCategoryIds.has(id)}
              onChange={(e) => {
                const data = {
                  categoryId: id,
                  customerServiceId: me!.id,
                };
                if (e.target.checked) {
                  addCSCategory(data);
                } else {
                  delCSCategory(data);
                }
              }}
            />
          );
        }}
      />
      <Column
        key="assignees"
        dataIndex="id"
        title="随机分配给"
        render={(id: string) => (
          <AssigneesCell loading={loadingCSs} assignees={assigneesByCategoryId[id]} />
        )}
      />
      <Column
        key="groups"
        dataIndex="id"
        title="关联客服组"
        render={(id: string) => (
          <GroupCell
            loading={loadingGroups || loadingCategoryGroups}
            group={groupByCategoryId[id]}
          />
        )}
      />
    </Table>
  );
}

export function CategoryList() {
  const [showInactive, setShowInactive] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const includeInactive = ordering || showInactive;

  const { data: categories, isLoading } = useCategories();

  const categoryRows = useCategoryRows(useSortedCategories(categories));

  const filteredCategories = useMemo(() => {
    if (categoryRows) {
      if (includeInactive) {
        return categoryRows;
      }
      return categoryRows.filter((c) => c.active);
    }
  }, [categoryRows, includeInactive]);

  return (
    <div className="p-10">
      <div className="mb-5 flex items-center">
        <div className="grow">
          <Checkbox
            checked={includeInactive}
            disabled={isLoading || ordering}
            onChange={(e) => setShowInactive(e.target.checked)}
          >
            显示已停用的分类
          </Checkbox>
        </div>
        <div>
          {!ordering && (
            <Button disabled={isLoading} onClick={() => setOrdering(true)}>
              调整顺序
            </Button>
          )}
          {ordering && (
            <>
              <Button type="primary">保存</Button>
              <Button className="ml-2" onClick={() => setOrdering(false)}>
                取消
              </Button>
            </>
          )}
        </div>
      </div>

      <CategoryTable categories={filteredCategories} loading={isLoading} />
    </div>
  );
}
