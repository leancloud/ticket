import { Spin, message, notification } from 'antd';
import { RouteComponentProps, useHistory } from 'react-router-dom';

import { Condition, UpdateTriggerData, updateTrigger, useTrigger } from '@/api/trigger';
import { TriggerForm } from './New';
import { useMemo } from 'react';
import { useMutation } from 'react-query';

function decodeCondition(condition: Condition): Condition {
  if (condition.type !== 'all' && condition.type !== 'any') {
    return {
      type: 'any',
      conditions: [
        {
          type: 'any',
          conditions: [condition],
        },
      ],
    };
  }
  if (condition.conditions.length) {
    const hasGroupCondition = condition.conditions.some(
      (c) => c.type === 'all' || c.type === 'any'
    );
    if (hasGroupCondition) {
      return {
        ...condition,
        conditions: condition.conditions.map((c) => {
          if (c.type === 'all' || c.type === 'any') {
            return c;
          }
          return {
            type: 'any',
            conditions: [c],
          };
        }),
      };
    }
    return {
      type: 'any',
      conditions: [condition],
    };
  }
  return condition;
}

export default function TriggerDetail({ match }: RouteComponentProps<{ id: string }>) {
  const id = match.params.id;
  const history = useHistory();
  const { data, isLoading } = useTrigger(id);
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

  const { mutate, isLoading: isUpdating } = useMutation({
    mutationFn: (data: UpdateTriggerData) => updateTrigger(id, data),
    onSuccess: () => {
      message.success('更新成功');
      history.push('.');
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
    <TriggerForm
      defaultValue={trigger}
      loading={isUpdating}
      onSubmit={mutate}
      onCancel={() => history.push('.')}
      submitButtonTitle="更新"
    />
  );
}
