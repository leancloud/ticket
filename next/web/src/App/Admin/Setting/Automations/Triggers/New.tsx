import { useHistory } from 'react-router-dom';
import { useMutation } from 'react-query';

import { Typography, message, notification } from '@/components/antd';
import { CreateTriggerData, createTrigger } from '@/api/trigger';
import { TriggerForm } from '../components/TriggerForm';
import { encodeCondition } from '../utils';
import conditions from './conditions';
import actions from './actions';

const { Title } = Typography;

export default function NewTrigger() {
  const history = useHistory();

  const { mutateAsync } = useMutation({
    mutationFn: (data: CreateTriggerData) =>
      createTrigger({
        title: data.title,
        description: data.description,
        conditions: encodeCondition(data.conditions),
        actions: data.actions,
      }),
    onSuccess: () => {
      message.success('保存成功');
      history.push('.');
    },
    onError: (error: Error) => {
      console.error(error);
      notification.error({
        message: '创建失败',
        description: error.message,
      });
    },
  });

  return (
    <div>
      <div>
        <p className="text-sm text-[#6F7C87]">新规则：</p>
        <Title level={3}>流转触发器</Title>
      </div>
      <TriggerForm
        conditions={conditions}
        actions={actions}
        onSubmit={mutateAsync}
        onCancel={() => history.push('.')}
      />
    </div>
  );
}
