import { useMemo, useState } from 'react';
import { Popover } from '@/components/antd';
import _, { pick } from 'lodash';
import { TicketStatsRealtimeParams, useTicketStatsRealtime } from '@/api/ticket-stats';
import { PieChartOutlined } from '@ant-design/icons';
import { Pie, MultiPie, MultiPieNode } from '@/components/Chart';
import { useLocalFilters } from '../../Filter';
import { useCustomerServices } from '@/api/customer-service';
import { useGroups } from '@/api/group';
import { useCategories, makeCategoryTree, CategorySchema, CategoryTreeNode } from '@/api/category';

const useStatsData = (type: TicketStatsRealtimeParams['type'], enabled: boolean) => {
  const [localFilters] = useLocalFilters();
  return useTicketStatsRealtime({
    ...localFilters,
    type,
    queryOptions: {
      enabled,
      staleTime: 1000 * 60 * 5,
    },
  });
};
type Props = {
  enabled: boolean;
};
const STATUS_LOCALE: Record<string, string> = {
  notProcessed: '未处理',
  waitingCustomer: '等待用户回复',
  waitingCustomerService: '等待客服回复',
  preFulfilled: '待用户确认解决',
  fulfilled: '已解决',
  closed: '已关闭',
};
function StatusStatsPie({ enabled }: Props) {
  const { data, isLoading, isFetching } = useStatsData('status', enabled);
  const chartData = useMemo(
    () =>
      data
        ? Object.entries(data[0]).map(([key, value]) => [key, Number(value)] as [string, number])
        : data,
    [data]
  );
  return (
    <Pie
      innerRadius={0.6}
      data={chartData}
      loading={isLoading || isFetching}
      names={(name) => STATUS_LOCALE[name]}
    />
  );
}

function AssigneeStatsPie({ enabled }: Props) {
  const { data, isLoading, isFetching } = useStatsData('assignee', enabled);
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
      innerRadius={0.6}
      data={chartData}
      loading={isLoading || isFetching}
      names={(name) => (assigneeMap ? assigneeMap[name] : name)}
    />
  );
}

function GroupStatsPie({ enabled }: Props) {
  const { data, isLoading, isFetching } = useStatsData('group', enabled);
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
      innerRadius={0.6}
      data={chartData}
      loading={isLoading || isFetching}
      names={(name) => (groupMap ? groupMap[name] : name)}
    />
  );
}

function CategoryStatsPie({ enabled }: Props) {
  const { data, isLoading, isFetching } = useStatsData('category', enabled);
  const { data: categories } = useCategories();
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
      return {
        name,
        value,
        children: children && children.length > 0 ? children.map((v) => pickTree(v)) : undefined,
      };
    };
    const treeData = makeCategoryTree<{ value?: number }>(mergeData).map((v) => sumTree(v));
    return filterTree(treeData).map((v) => pickTree(v));
  }, [data, categories]);

  return <MultiPie loading={isLoading || isFetching} data={chartData} />;
}

const ContentMap = {
  status: StatusStatsPie,
  assignee: AssigneeStatsPie,
  group: GroupStatsPie,
  category: CategoryStatsPie,
};

export function StatsPopover({ type }: { type: TicketStatsRealtimeParams['type'] }) {
  const [visible, setVisible] = useState(false);
  const Component = ContentMap[type];
  return (
    <Popover
      onVisibleChange={(v) => setVisible(v)}
      placement="leftBottom"
      title={null}
      content={<Component enabled={visible} />}
      trigger="hover"
    >
      <PieChartOutlined className=" hover:text-primary" />
    </Popover>
  );
}
