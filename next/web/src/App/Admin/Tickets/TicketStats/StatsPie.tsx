import { useMemo } from 'react';
import _ from 'lodash';
import { Pie, MultiPie, MultiPieNode } from '@/components/Chart';
import { useCustomerServices } from '@/api/customer-service';
import { useGroups } from '@/api/group';
import { useCategories, makeCategoryTree, CategoryTreeNode } from '@/api/category';
import { STATUS_LOCALE, useStatsData } from './utills';

type Props = {
  showLegend?: boolean;
};

const innerRadius = 0.5;

export function StatusStatsPie() {
  const { data, isLoading, isFetching } = useStatsData('status');
  const chartData = useMemo(
    () =>
      data
        ? Object.entries(data[0]).map(([key, value]) => [key, Number(value)] as [string, number])
        : data,
    [data]
  );
  return (
    <Pie
      data={chartData}
      loading={isLoading || isFetching}
      innerRadius={innerRadius}
      names={(name) => STATUS_LOCALE[name]}
    />
  );
}

export function AssigneeStatsPie({ showLegend }: Props) {
  const { data, isLoading, isFetching } = useStatsData('assignee');
  const { data: assignees } = useCustomerServices();
  const assigneeMap = useMemo(() => {
    return assignees?.reduce((pre, curr) => {
      pre[curr.id] = curr.nickname;
      return pre;
    }, {} as Record<string, string>);
  }, [assignees]);
  const chartData = useMemo(
    () => data?.map(({ assigneeId, count }) => [assigneeId, Number(count)] as [string, number]),
    [data]
  );
  return (
    <Pie
      showLegend={showLegend}
      data={chartData}
      loading={isLoading || isFetching}
      innerRadius={innerRadius}
      names={(name) => {
        if (name === '') {
          return '未分配';
        }
        if (!assigneeMap) {
          return name;
        }
        return assigneeMap[name] || name;
      }}
    />
  );
}

export function GroupStatsPie({ showLegend }: Props) {
  const { data, isLoading, isFetching } = useStatsData('group');
  const { data: groups } = useGroups();
  const groupMap = useMemo(() => {
    return groups?.reduce((pre, curr) => {
      pre[curr.id] = curr.name;
      return pre;
    }, {} as Record<string, string>);
  }, [groups]);

  const chartData = useMemo(
    () => data?.map(({ groupId, count }) => [groupId, Number(count)] as [string, number]),
    [data]
  );

  return (
    <Pie
      showLegend={showLegend}
      data={chartData}
      innerRadius={innerRadius}
      loading={isLoading || isFetching}
      names={(name) => {
        if (name === '') {
          return '未分配';
        }
        return groupMap ? groupMap[name] : name;
      }}
    />
  );
}

export function CategoryStatsMultiPie() {
  const { data, isLoading, isFetching } = useStatsData('category');
  const { data: categories } = useCategories({
    active: true,
  });
  const chartData = useMemo(() => {
    if (!data || !categories) {
      return;
    }
    const mergeData = _(data)
      .map(({ categoryId, count }) => {
        return {
          id: categoryId,
          value: Number(count),
        };
      })
      .keyBy('id')
      .merge(_.keyBy(categories, 'id'))
      .values()
      .valueOf();
    const sumTree = (treeNode: CategoryTreeNode<{ value?: number }>) => {
      if (treeNode.value !== undefined) {
        return treeNode;
      }
      if (treeNode.children && treeNode.children.length > 0) {
        const next = treeNode.children.map((node) => sumTree(node));
        treeNode.children = next;
        treeNode.value = _.sumBy(next, 'value');
      }
      return treeNode;
    };
    const filterTree = (
      treeNode: CategoryTreeNode<{ value?: number }>[]
    ): CategoryTreeNode<{ value?: number }>[] => {
      const nodes = treeNode.filter((v) => v.value !== undefined);
      if (nodes.length === 1) {
        if (nodes[0].children && nodes[0].children.length > 0) {
          return filterTree(nodes[0].children);
        }
      }
      return nodes;
    };
    const pickTree = (treeNode: CategoryTreeNode<{ value?: number }>): MultiPieNode => {
      const { name, value, children } = treeNode;
      if (children && children.length > 0) {
        return {
          name,
          value,
          children: children.map((v) => pickTree(v)),
        };
      }
      return {
        name,
        value,
      };
    };
    const treeData = makeCategoryTree<{ value?: number }>(mergeData).map((v) => sumTree(v));
    return {
      name: '分类',
      children: filterTree(treeData).map((v) => pickTree(v)),
    };
  }, [data, categories]);

  return <MultiPie loading={isLoading || isFetching} data={chartData} innerRadius={innerRadius} />;
}
