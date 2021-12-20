import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from 'react-query';

import { Spin, message, notification } from '@/components/antd';
import { UpdateTriggerData, updateTrigger, useTrigger } from '@/api/trigger';
import { TriggerForm } from '../components/TriggerForm';
import { decodeCondition } from '../utils';
import conditions from './conditions';
import actions from './actions';

export default function TriggerDetail() {
  const params = useParams();
  const id = params.id!;
  const navigate = useNavigate();
  const { data, isLoading } = useTrigger(id, { cacheTime: 0 });
  const trigger = useMemo(() => {
    if (data) {
      return {
        title: data.title,
        description: data.description,
        conditions: decodeCondition(data.conditions),
        actions: data.actions,
      };
    }
  }, [data]);

  const { mutate } = useMutation({
    mutationFn: (data: UpdateTriggerData) => updateTrigger(id, data),
    onSuccess: () => {
      message.success('更新成功');
      navigate('..');
    },
    onError: (error: Error) => {
      console.error(error);
      notification.error({
        message: '更新失败',
        description: error.message,
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spin />
      </div>
    );
  }
  return (
    <div className="p-10 pb-4">
      <TriggerForm
        conditions={conditions}
        actions={actions}
        defaultValues={trigger}
        onSubmit={mutate}
        onCancel={() => navigate('..')}
        submitButtonText="更新"
      />
    </div>
  );
}
