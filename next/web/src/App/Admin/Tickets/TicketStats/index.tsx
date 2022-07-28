import React, { useMemo } from 'react';
import { Card } from '@/components/antd';
import _ from 'lodash';
import { useStatsData } from './utills';
import { AssigneeStatsPie, CategoryStatsMultiPie, GroupStatsPie, StatusStatsPie } from './StatsPie';

const StatsCard = ({
  title,
  value,
  loading,
}: {
  title: React.ReactNode;
  value?: string;
  loading?: boolean;
}) => {
  return (
    <Card
      loading={loading}
      className="!m-1 !bg-[#f4f7f9] flex-grow basis-[100px] max-w-[150px] text-center"
      size="small"
    >
      <p className="text-sm">{title}</p>
      <span className="text-lg font-bold">{value ? Number(value) : 0}</span>
    </Card>
  );
};

const StatusCards = () => {
  const { data, isLoading, isFetching } = useStatsData('status');
  const {
    closed,
    fulfilled,
    preFulfilled,
    waitingCustomerService,
    waitingCustomer,
    notProcessed,
  } = useMemo(() => {
    if (!data) {
      return {};
    }
    return data[0];
  }, [data]);
  const loading = isLoading || isFetching;
  return (
    <div className="flex -m-1 flex-wrap">
      <StatsCard loading={loading} title="未处理" value={notProcessed} />
      <StatsCard loading={loading} title="等待客服回复" value={waitingCustomerService} />
      <StatsCard loading={loading} title="等待用户回复" value={waitingCustomer} />
      <StatsCard loading={loading} title="待用户确认解决" value={preFulfilled} />
      <StatsCard loading={loading} title="已解决" value={fulfilled} />
      <StatsCard loading={loading} title="已关闭" value={closed} />
    </div>
  );
};

const PieContainer: React.FunctionComponent<{ title: string }> = ({ children, title }) => {
  return (
    <div className="relative min-w-[550px] px-2">
      <p className="text-center font-bold -mb-4">{title}</p>
      {children}
    </div>
  );
};

export function StatsPanel() {
  return (
    <div className="mb-2 bg-white p-2">
      <StatusCards />
      <div className="mt-6 flex flex-grow overflow-auto">
        <PieContainer title="状态">
          <StatusStatsPie />
        </PieContainer>
        <PieContainer title="分类">
          <CategoryStatsMultiPie />
        </PieContainer>
        <PieContainer title="分组">
          <GroupStatsPie />
        </PieContainer>
        <PieContainer title="客服">
          <AssigneeStatsPie />
        </PieContainer>
      </div>
    </div>
  );
}
