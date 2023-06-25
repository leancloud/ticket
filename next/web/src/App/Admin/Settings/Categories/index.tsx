import { FC, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import {
  AiOutlineLoading,
  AiOutlineDown,
  AiOutlineUp,
  AiOutlineEyeInvisible,
} from 'react-icons/ai';
import { keyBy, pick } from 'lodash-es';
import { produce } from 'immer';
import cx from 'classnames';

import { useCurrentUser } from '@/leancloud';
import {
  CategorySchema,
  CategoryTreeNode,
  makeCategoryTree,
  useBatchUpdateCategory,
  useCreateCategory,
  useCategories,
  useCategoryTree,
  useUpdateCategory,
} from '@/api/category';
import {
  CustomerServiceSchema,
  useCustomerServices,
  useAddCustomerServiceCategory,
  useDeleteCustomerServiceCategory,
} from '@/api/customer-service';
import { GroupSchema, useGroups } from '@/api/group';
import {
  Breadcrumb,
  Button,
  Checkbox,
  Modal,
  Popover,
  Spin,
  Table,
  message,
  Tag,
} from '@/components/antd';
import { UserLabel } from '@/App/Admin/components';
import { CategoryForm, CategoryFormData } from './CategoryForm';

const { Column } = Table;

function Loading() {
  return <AiOutlineLoading className="animate-spin w-5 h-5 text-primary" />;
}

function NameCell({ category }: { category: CategorySchema }) {
  const { id, name, active, alias, hidden } = category;
  return (
    <>
      <Link className={cx({ 'opacity-60': !active })} to={id}>
        {name} {alias && <Tag>{alias}</Tag>}
        {!active && ' (停用)'}
        {hidden && <AiOutlineEyeInvisible className="inline" />}
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

const ActionCell: FC<{ id: string }> = ({ id }) => {
  return <Link to={`count/${id}`}>字段统计</Link>;
};

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

  const groupById = useMemo(() => keyBy(groups, 'id'), [groups]);

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
        title="关联客服组"
        render={({ groupId }: CategoryTreeNode) => (
          <GroupCell loading={loadingGroups} group={groupId ? groupById[groupId] : undefined} />
        )}
      />
      <Column
        key="actions"
        title="操作"
        dataIndex="id"
        render={(id: string) => <ActionCell id={id} />}
      />
    </Table>
  );
}

interface SortCategoryTableRef {
  getData: () => { id: string; position: number }[];
}

interface SortCategoryTableProps {
  categories: CategorySchema[];
  ref?: SortCategoryTableRef;
}

const SortCategoryTable = forwardRef<SortCategoryTableRef, SortCategoryTableProps>(
  ({ categories }, ref) => {
    const [categoryTree, setCategoryTree] = useState(() => {
      const activeCategories = categories.filter((c) => c.active);
      return makeCategoryTree(activeCategories);
    });

    const [changed, setChanged] = useState<Record<string, number>>({});

    const handleMove = (node: CategoryTreeNode, from: number, to: number) => {
      const categories = node.parent ? node.parent.children! : categoryTree;
      categories.splice(from, 1);
      categories.splice(to, 0, node);
      setChanged((prev) => {
        const next = { ...prev };
        categories.forEach(({ id }, position) => (next[id] = position));
        return next;
      });
      setCategoryTree([...categoryTree]);
    };

    useImperativeHandle(ref, () => ({
      getData: () => Object.entries(changed).map(([id, position]) => ({ id, position })),
    }));

    return (
      <Table dataSource={categoryTree} rowKey="id" size="small" pagination={false}>
        <Column key="name" title="名称" render={(category) => <NameCell category={category} />} />
        <Column
          key="actions"
          render={(node: CategoryTreeNode, _, i) => {
            const length = node.parent ? node.parent.children!.length : categoryTree.length;
            return (
              <>
                <Button
                  className="flex"
                  size="small"
                  icon={<AiOutlineUp className="m-auto" />}
                  disabled={i === 0}
                  onClick={() => handleMove(node, i, i - 1)}
                  style={{ padding: 0, height: 20 }}
                />
                <Button
                  className="flex ml-1"
                  size="small"
                  icon={<AiOutlineDown className="m-auto" />}
                  disabled={i === length - 1}
                  onClick={() => handleMove(node, i, i + 1)}
                  style={{ padding: 0, height: 20 }}
                />
              </>
            );
          }}
        />
      </Table>
    );
  }
);

interface SortCategoryModalProps extends SortCategoryTableProps {
  visible: boolean;
  loading?: boolean;
  onCancel: () => void;
  onOk: (datas: ReturnType<SortCategoryTableRef['getData']>) => void;
}

function SortCategoryModal({ visible, loading, onCancel, onOk, ...props }: SortCategoryModalProps) {
  const $sortTable = useRef<SortCategoryTableRef>(null!);

  return (
    <Modal
      destroyOnClose
      title="调整顺序"
      visible={visible}
      cancelButtonProps={{ disabled: loading }}
      onCancel={loading ? undefined : onCancel}
      okButtonProps={{ loading }}
      okText="保存"
      onOk={() => onOk($sortTable.current.getData())}
    >
      <SortCategoryTable {...props} ref={$sortTable} />
    </Modal>
  );
}

export function CategoryList() {
  const [showInactive, setShowInactive] = useState(false);
  const [expendedRowKeys, setExpendedRowKeys] = useState<string[]>();
  const [sorting, setSorting] = useState(false);

  const { data: categories, isFetching } = useCategories();

  const expandAll = () => {
    if (categories) {
      setExpendedRowKeys(categories.map((c) => c.id));
    }
  };

  useEffect(() => {
    if (categories && !expendedRowKeys) {
      setExpendedRowKeys(categories.map((c) => c.id));
    }
  }, [categories, expendedRowKeys]);

  const filteredCategories = useMemo(() => {
    if (categories) {
      return showInactive ? categories : categories.filter((c) => c.active);
    }
  }, [categories, showInactive]);

  const queryClient = useQueryClient();

  const { mutate, isLoading: updating } = useBatchUpdateCategory({
    onSuccess: () => {
      message.success('更新顺序成功');
      queryClient.invalidateQueries('categories');
      setSorting(false);
    },
  });

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
          <Button disabled={isFetching} onClick={() => setSorting(true)}>
            调整顺序
          </Button>
          <Link to="new">
            <Button className="ml-2" type="primary">
              创建分类
            </Button>
          </Link>
        </div>
      </div>

      <SortCategoryModal
        categories={categories!}
        visible={sorting}
        loading={updating}
        onCancel={() => setSorting(false)}
        onOk={mutate}
      />

      <CategoryTable
        loading={isFetching}
        categories={filteredCategories}
        expandedRowKeys={expendedRowKeys}
        onExpandedRowsChange={setExpendedRowKeys}
      />
    </div>
  );
}

export function NewCategory() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { mutate, isLoading } = useCreateCategory({
    onSuccess: () => {
      queryClient.invalidateQueries('categories');
      message.success('创建成功');
      navigate('..');
    },
  });

  return (
    <div className="p-10">
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <Link to="..">分类</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>添加</Breadcrumb.Item>
      </Breadcrumb>

      <CategoryForm loading={isLoading} onSubmit={mutate} />
    </div>
  );
}

export function CategoryDetail() {
  const { id } = useParams<'id'>();
  const { data: categories, isLoading: loadingCategories } = useCategories();

  const category = useMemo(() => {
    return categories?.find((c) => c.id === id);
  }, [categories, id]);

  const initData = useMemo(() => {
    if (category) {
      const initData: Partial<CategoryFormData> = pick(category, [
        'description',
        'alias',
        'parentId',
        'noticeIds',
        'articleIds',
        'topicIds',
        'groupId',
        'formId',
        'template',
        'meta',
        'hidden',
        'articleId',
        'isTicketEnabled',
        'ticketDescription',
      ]);
      initData.name = category.rawName;
      return initData;
    }
  }, [category]);

  const queryClient = useQueryClient();
  const { mutate, isLoading } = useUpdateCategory({
    onSuccess: () => {
      queryClient.invalidateQueries('categories');
      message.success('更新成功');
    },
  });

  if (loadingCategories) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spin />
      </div>
    );
  }

  if (!category) {
    return <Navigate to=".." />;
  }

  return (
    <div className="p-10">
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <Link to="..">分类</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{id}</Breadcrumb.Item>
      </Breadcrumb>

      <CategoryForm
        initData={initData}
        loading={isLoading}
        categoryActive={category.active}
        currentCategoryId={category.id}
        onSubmit={(data) => mutate({ ...data, id: id!, meta: data.meta ?? null })}
        onChangeCategoryActive={(active) => mutate({ active, id: id! })}
      />
    </div>
  );
}
