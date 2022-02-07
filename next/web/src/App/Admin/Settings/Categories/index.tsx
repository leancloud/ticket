import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import { groupBy, keyBy } from 'lodash-es';
import { produce } from 'immer';

import { CategorySchema, useCategories, useCategoryGroups } from '@/api/category';
import {
  CustomerServiceSchema,
  useCustomerServices,
  useAddCustomerServiceCategory,
  useDeleteCustomerServiceCategory,
} from '@/api/customer-service';
import { GroupSchema, useGroups } from '@/api/group';
import { Checkbox, Tabs, Table, message } from '@/components/antd';
import { useSearchParam } from '@/utils/useSearchParams';
import { useAppContext } from '@/App';
import { UserLabel } from '@/App/Admin/components';

const { Column } = Table;

function NameCell({ category, depth }: { category: CategorySchema; depth: number }) {
  const prefix = useMemo(() => {
    if (depth === 0) {
      return null;
    }
    return <span>{'\u3000'.repeat(depth) + '\u2514 '}</span>;
  }, [depth]);

  return (
    <>
      {prefix}
      <Link to={category.id}>{category.name}</Link>
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
    return <div>Loading...</div>;
  }
  if (!assignees || assignees.length === 0) {
    return <div>-</div>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {assignees.map((assignee) => (
        <UserLabel key={assignee.id} user={assignee} />
      ))}
    </div>
  );
}

function GroupCell({ loading, group }: { loading?: boolean; group?: GroupSchema }) {
  if (loading) {
    return <div>Loading...</div>;
  }
  if (!group) {
    return <span>-</span>;
  }
  return <Link to={`/admin/settings/groups/${group.id}`}>{group.name}</Link>;
}

export function CategoryList() {
  const [active = 'true', setActive] = useSearchParam('active');

  const { data: categories } = useCategories();

  const categoryDepth = useMemo<Record<string, number>>(() => {
    if (!categories) {
      return {};
    }
    const categoryById = keyBy(categories, 'id');
    const getDepth = (id: string): number => {
      const target = categoryById[id];
      if (target.parentId) {
        return getDepth(target.parentId) + 1;
      }
      return 0;
    };
    return categories.reduce<Record<string, number>>((map, cur) => {
      map[cur.id] = getDepth(cur.id);
      return map;
    }, {});
  }, [categories]);

  const orderedCategories = useMemo<CategorySchema[]>(() => {
    if (!categories) {
      return [];
    }
    const orderedCategories: CategorySchema[] = [];
    const categorysByParentId = groupBy(categories, 'parentId');
    const sortFn = (a: CategorySchema, b: CategorySchema) => a.position - b.position;
    const pushFn = (id: string) => {
      const categories = categorysByParentId[id];
      if (categories) {
        categories.sort(sortFn);
        categories.forEach((category) => {
          orderedCategories.push(category);
          pushFn(category.id);
        });
      }
    };
    pushFn('undefined');
    return orderedCategories;
  }, [categories]);

  const filteredCategories = useMemo(() => {
    return active === 'true'
      ? orderedCategories.filter((c) => c.active)
      : orderedCategories.filter((c) => !c.active);
  }, [orderedCategories, active]);

  const { currentUser } = useAppContext();

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
    <div className="px-10 pt-10">
      <Tabs
        activeKey={active === 'true' ? '1' : '2'}
        onChange={(key) => setActive(key === '1' ? undefined : 'false')}
      >
        <Tabs.TabPane key="1" tab="启用" />
        <Tabs.TabPane key="2" tab="停用" />
      </Tabs>

      <Table
        rowKey="id"
        size="small"
        loading={undefined}
        dataSource={filteredCategories}
        pagination={false}
      >
        <Column
          key="name"
          title="名称"
          render={(category) => <NameCell category={category} depth={categoryDepth[category.id]} />}
        />
        <Column
          key="inCharge"
          dataIndex="id"
          title="我是否负责"
          render={(id: string) => (
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
          )}
        />
        <Column
          key="assignees"
          dataIndex="id"
          title="自动分配给（随机）"
          render={(id: string) => (
            <AssigneesCell loading={loadingCSs} assignees={assigneesByCategoryId[id]} />
          )}
        />
        <Column
          key="groups"
          dataIndex="id"
          title="自动关联客服组"
          render={(id: string) => (
            <GroupCell
              loading={loadingGroups || loadingCategoryGroups}
              group={groupByCategoryId[id]}
            />
          )}
        />
      </Table>
    </div>
  );
}
