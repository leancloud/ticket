import { useQuery } from 'react-query';
import { Descriptions } from 'antd';
import moment from 'moment';

import { setConfig, setMetadataRenderer } from './config';
import { http } from '@/leancloud';

setMetadataRenderer('openId', (id: string) => {
  return {
    label: '心动账号 ID',
    content: <a href={`https://pt.xindong.com/kefu_issue/user_info/${id}`}>{id}</a>,
  };
});

setMetadataRenderer('userId', (id: string) => {
  return {
    label: '角色 ID',
    content: <a href={`https://www.xdapp.com/smash/player/?sid=0&pid=${id}`}>{id}</a>,
  };
});

setMetadataRenderer('userName', (value: string) => {
  return {
    label: '角色名',
    content: value,
  };
});

setMetadataRenderer('deviceModel', (value: string) => {
  return {
    label: '设备型号',
    content: value,
  };
});

setMetadataRenderer('operatingSystem', (value: string) => {
  return {
    label: '操作系统',
    content: value,
  };
});

setMetadataRenderer('ip', (ip: string) => {
  return {
    label: 'IP',
    content: <a href={`https://nali.leanapp.cn/ip/${ip}`}>{ip}</a>,
  };
});

setMetadataRenderer('localDNS', (ip: string) => {
  return {
    label: 'Local DNS',
    content: <a href={`https://nali.leanapp.cn/ip/${ip}`}>{ip}</a>,
  };
});

setConfig('ticketDetail.userLabelOverlay', (user) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['XDUserData', user.id],
    queryFn: async () => {
      const res = await http.get(`/api/2/users/${user.id}/third-party-data`);
      return res.data;
    },
    staleTime: 1800_000,
    retry: false,
  });

  if (isLoading) {
    return 'Loading...';
  }
  if (error) {
    return (error as Error).message || 'N/A';
  }
  if (!data) {
    return 'N/A';
  }

  const renderTime = (second: number) => (
    <span title={moment(second * 1000).fromNow()}>{moment(second * 1000).format('lll')}</span>
  );

  const columns: { dataIndex: string; title: string; render?: (value: any) => any }[] = [
    {
      dataIndex: 'id',
      title: 'XDID',
      render: (value: string) => (
        <>
          {value} <a href={`https://pt.xindong.com/kefu_issue/user_info/${value}`}>(PT)</a>
        </>
      ),
    },
    {
      dataIndex: 'friendly_name',
      title: '昵称',
    },
    {
      dataIndex: 'created',
      title: '创建时间',
      render: renderTime,
    },
    {
      dataIndex: 'last_login',
      title: '最后登录时间',
      render: renderTime,
    },
    {
      dataIndex: 'site',
      title: '账号类型',
      render: (value: string) =>
        ({ 0: 'VeryCD', 1: '心动', 3: 'QQ', 8: '微信', 9: 'TapTap' }[value]),
    },
    {
      dataIndex: 'taptap_id',
      title: 'TapTap ID',
    },
    {
      dataIndex: 'authoriz_state',
      title: '实名认证',
      render: (value: number) => (value > 0 ? '已实名' : '未实名'),
    },
    {
      dataIndex: 'adult_type',
      title: '年龄',
      render: (value: number) => ['未实名', '0-8', '8-16', '16-18', '18+'][value],
    },
    {
      dataIndex: 'phone',
      title: '手机号',
    },
    {
      dataIndex: 'clientId',
      title: '来源游戏（Client ID）',
    },
  ];

  return (
    <>
      <Descriptions bordered size="small" column={1}>
        {columns.map(({ dataIndex, title, render }) => {
          const value = data[dataIndex];
          return (
            <Descriptions.Item key={dataIndex} label={title}>
              {render && value !== undefined ? render(value) : value}
            </Descriptions.Item>
          );
        })}
      </Descriptions>
      {data._updated_at && (
        <div
          style={{
            marginTop: 4,
            fontSize: 12,
            textAlign: 'right',
            color: 'gray',
          }}
        >
          更新于 {moment(data._updated_at).fromNow()}
        </div>
      )}
    </>
  );
});
