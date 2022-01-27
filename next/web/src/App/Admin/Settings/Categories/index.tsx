import { memo, useMemo } from 'react';
import { groupBy, keyBy } from 'lodash-es';

import { CategorySchema, useCategories, useCategoryGroups } from '@/api/category';
import { CustomerServiceSchema, useCustomerServices } from '@/api/customer-service';
import { GroupSchema, useGroups } from '@/api/group';
import { Checkbox, Tabs, Table, TableProps } from '@/components/antd';
import { useSearchParam } from '@/utils/useSearchParams';
import { UserLabel } from '@/App/Admin/components';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/leancloud';

interface CategoryRow extends CategorySchema {
  depth: number;
  group?: GroupSchema;
  assignees?: CustomerServiceSchema[];
  joined?: boolean;
}

function getCategoryRows(categories: CategorySchema[]): CategoryRow[] {
  const categoryGroup = groupBy(categories, 'parentId');
  Object.values(categoryGroup).forEach((children) =>
    children.sort((a, b) => a.position - b.position)
  );

  const rows: CategoryRow[] = [];
  const rangeCategories = (categories: CategorySchema[] | undefined, depth: number) => {
    if (categories === undefined) {
      return;
    }

    categories.forEach((category) => {
      rows.push({ ...category, depth });
      rangeCategories(categoryGroup[category.id], depth + 1);
    });
  };

  rangeCategories(categoryGroup['undefined'], 0);

  return rows;
}

function getCustomerServicesByCategoryId(customerServices: CustomerServiceSchema[]) {
  const customerServicesByCategoryId: Record<string, CustomerServiceSchema[]> = {};
  customerServices.forEach((customerService) => {
    customerService.categoryIds.forEach((categoryId) => {
      customerServicesByCategoryId[categoryId] ??= [];
      customerServicesByCategoryId[categoryId].push(customerService);
    });
  });
  return customerServicesByCategoryId;
}

const CategoryNamePrefix = memo(({ depth }: { depth: number }) => {
  if (depth === 0) {
    return null;
  }
  return <span>{'\u3000'.repeat(depth) + '\u2514'}</span>;
});

function CategoryName(row: CategoryRow) {
  return (
    <div className="whitespace-pre">
      <CategoryNamePrefix depth={row.depth} /> <Link to={row.id}>{row.name}</Link>
    </div>
  );
}

function Assignees({ assignees }: CategoryRow) {
  if (!assignees || assignees.length === 0) {
    return '-';
  }

  return (
    <div className="flex flex-wrap gap-2">
      {assignees.map((assignee) => (
        <UserLabel key={assignee.id} user={assignee} />
      ))}
    </div>
  );
}

const columns: TableProps<CategoryRow>['columns'] = [
  {
    key: 'name',
    title: '名称',
    render: CategoryName,
  },
  {
    key: 'inCharge',
    title: '我是否负责',
    render: ({ joined }: CategoryRow) => <Checkbox checked={!!joined} />,
  },
  {
    key: 'assignees',
    title: '自动分配给（随机）',
    render: Assignees,
  },
  {
    key: 'groups',
    title: '自动关联客服组',
    render: ({ group }: CategoryRow) => {
      if (group) {
        return <Link to={`/admin/settings/groups/${group.id}`}>{group.name}</Link>;
      }
      return '-';
    },
  },
];

function useCategoryRows(active: boolean) {
  const {
    data: categories,
    isLoading: loadingCategories,
    isFetching: fetchingCategories,
  } = useCategories({
    queryOptions: {
      select: (categories) => categories.filter((c) => c.active === active),
    },
  });

  const { data: groups, isLoading: loadingGroups } = useGroups();

  const { data: categoryGroups, isLoading: loadingCategoryGroups } = useCategoryGroups();

  const { data: customerServices, isLoading: loadingCustomerServices } = useCustomerServices();

  const currentUser = useCurrentUser();
  const currentCustomerService = useMemo(() => {
    if (currentUser && customerServices) {
      return customerServices.find((cs) => cs.id === currentUser.id);
    }
  }, [currentUser, customerServices]);

  const rows = useMemo(() => {
    if (categories && groups && categoryGroups && customerServices && currentCustomerService) {
      const groupById = keyBy(groups, 'id');
      const categoryGroupByCategoryId = keyBy(categoryGroups, 'categoryId');
      const rows = getCategoryRows(categories);
      const customerServicesByCategoryId = getCustomerServicesByCategoryId(customerServices);
      const currentCustomerServiceJoinedCategoryIds = new Set(currentCustomerService.categoryIds);
      rows.forEach((row) => {
        const cg = categoryGroupByCategoryId[row.id];
        if (cg) {
          row.group = groupById[cg.id];
        }
        row.assignees = customerServicesByCategoryId[row.id];
        row.joined = currentCustomerServiceJoinedCategoryIds.has(row.id);
      });
      return rows;
    }
  }, [categories, groups, categoryGroups, customerServices, currentCustomerService]);

  return {
    data: rows,
    isLoading:
      loadingCategories || loadingGroups || loadingCategoryGroups || loadingCustomerServices,
    isFetching: fetchingCategories,
  };
}

export function CategoryList() {
  const [active = 'true', setActive] = useSearchParam('active');

  const { data, isLoading, isFetching } = useCategoryRows(active === 'true');

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
        columns={columns}
        loading={isLoading || isFetching}
        dataSource={data}
        pagination={false}
      />
    </div>
  );
}
