import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import { AiOutlineLoading, AiOutlineDown, AiOutlineUp } from 'react-icons/ai';
import { keyBy } from 'lodash-es';
import { produce } from 'immer';
import cx from 'classnames';

import { useCurrentUser } from '@/leancloud';
import { CategorySchema, useCategories, useCategoryTree, useCategoryGroups } from '@/api/category';
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
  isFirst: boolean;
  isLast: boolean;
}

function Loading() {
  return <AiOutlineLoading className="animate-spin w-5 h-5 text-primary" />;
}

function NameCell({ category }: { category: CategorySchema }) {
  const { id, name, active } = category;
  return (
    <>
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
  categories?: CategorySchema[];
  loading?: boolean;
  expandedRowKeys?: string[];
  onExpandedRowsChange?: (keys: string[]) => void;
}

function CategoryTable({
  categories,
  loading,
  expandedRowKeys,
  onExpandedRowsChange,
}: CategoryTableProps) {
  const categoryTree = useCategoryTree(categories);

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
    <Table
      rowKey="id"
      size="small"
      loading={loading}
      dataSource={categoryTree}
      pagination={false}
      expandable={{
        expandedRowKeys,
        onExpandedRowsChange: onExpandedRowsChange as any,
      }}
    >
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

interface CategorySortProps {
  categories: CategoryRow[];
}

function CategorySort({ categories }: CategorySortProps) {
  const [tempCategories, setTempCategories] = useState(categories);

  const findDepthIndex = (startIndex: number, depth: number, step: 1 | -1) => {
    while (startIndex >= 0 && startIndex < tempCategories.length) {
      if (tempCategories[startIndex].depth === depth) {
        return startIndex;
      }
      startIndex += step;
    }
    return -1;
  };

  const getSubCount = (index: number) => {
    const category = tempCategories[index];
    let count = 0;
    for (let i = index + 1; i < tempCategories.length; ++i) {
      if (tempCategories[i].depth <= category.depth) {
        break;
      }
      ++count;
    }
    return count;
  };

  const handleMoveUp = (index: number) => {
    const category = tempCategories[index];
    const i = findDepthIndex(index - 1, category.depth, -1);
    const count = getSubCount(index);
    const j = index + count + 1;
    setTempCategories([
      ...tempCategories.slice(0, i),
      ...tempCategories.slice(index, j),
      ...tempCategories.slice(i, index),
      ...tempCategories.slice(j),
    ]);
  };

  const handleMoveDown = (index: number) => {
    const category = tempCategories[index];
    const nextSiblingIndex = findDepthIndex(index + 1, category.depth, 1);
    const count = getSubCount(nextSiblingIndex);
    const j = nextSiblingIndex + count + 1;
    setTempCategories([
      ...tempCategories.slice(0, index),
      ...tempCategories.slice(nextSiblingIndex, j),
      ...tempCategories.slice(index, nextSiblingIndex),
      ...tempCategories.slice(j),
    ]);
  };

  return (
    <Table rowKey="id" size="small" dataSource={tempCategories} pagination={false}>
      <Column key="name" title="名称" render={(category) => <NameCell category={category} />} />
      <Column
        key="actions"
        render={({ isFirst, isLast }, _, i) => (
          <>
            <Button
              className="flex"
              size="small"
              icon={<AiOutlineUp className="m-auto" />}
              disabled={isFirst}
              onClick={() => handleMoveUp(i)}
              style={{ padding: 0, height: 20 }}
            />
            <Button
              className="flex ml-1"
              size="small"
              icon={<AiOutlineDown className="m-auto" />}
              disabled={isLast}
              onClick={() => handleMoveDown(i)}
              style={{ padding: 0, height: 20 }}
            />
          </>
        )}
      />
    </Table>
  );
}

export function CategoryList() {
  const [showInactive, setShowInactive] = useState(false);
  const [expendedRowKeys, setExpendedRowKeys] = useState<string[]>();

  const { data: categories, isFetching } = useCategories();

  const expandAll = useCallback(() => {
    if (categories) {
      setExpendedRowKeys(categories.map((c) => c.id));
    }
  }, [categories]);

  useEffect(() => {
    if (categories && !expendedRowKeys) {
      expandAll();
    }
  }, [categories, expendedRowKeys, expandAll]);

  const filteredCategories = useMemo(() => {
    if (categories) {
      return showInactive ? categories : categories.filter((c) => c.active);
    }
  }, [categories, showInactive]);

  return (
    <div className="p-10">
      <div className="mb-5 flex items-center">
        <div className="grow">
          <Button className="mr-1" size="small" onClick={expandAll}>
            全部展开
          </Button>
          <Button className="mr-2" size="small" onClick={() => setExpendedRowKeys([])}>
            全部折叠
          </Button>
          <Checkbox
            checked={showInactive}
            disabled={isFetching}
            onChange={(e) => setShowInactive(e.target.checked)}
          >
            显示已停用的分类
          </Checkbox>
        </div>
        <div>
          <Button disabled={isFetching}>调整顺序</Button>
          <Button className="ml-2" type="primary" disabled>
            创建分类
          </Button>
        </div>
      </div>

      <CategoryTable
        loading={isFetching}
        categories={filteredCategories}
        expandedRowKeys={expendedRowKeys}
        onExpandedRowsChange={setExpendedRowKeys}
      />
    </div>
  );
}
