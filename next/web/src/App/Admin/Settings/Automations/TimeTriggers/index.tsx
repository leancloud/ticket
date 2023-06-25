import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from 'react-query';
import { AiOutlineSetting } from 'react-icons/ai';
import {
  BiUpArrowAlt,
  BiDownArrowAlt,
  BiArrowToTop,
  BiArrowToBottom,
  BiTrash,
} from 'react-icons/bi';
import { FiMoreVertical } from 'react-icons/fi';
import { produce } from 'immer';

import {
  Button,
  Dropdown,
  Empty,
  Menu,
  Modal,
  Spin,
  Switch,
  Typography,
  message,
  notification,
} from '@/components/antd';
import {
  TimeTriggerSchema,
  updateTimeTrigger,
  deleteTimeTrigger,
  useTimeTriggers,
  reorderTimeTrigger,
} from '@/api/time-trigger';
import style from './index.module.css';

const { Title } = Typography;

interface TimeTriggerItemProps {
  data: TimeTriggerSchema;
  number: number;
  onDelete: () => void;
}

function TimeTriggerItem({ data, number, onDelete }: TimeTriggerItemProps) {
  const queryClient = useQueryClient();

  const updateActive = (triggerId: string, active: boolean) => {
    queryClient.setQueryData<TimeTriggerSchema[] | undefined>('time-triggers', (data) => {
      if (data) {
        return produce(data, (draft) => {
          const target = draft.find((t) => t.id === triggerId);
          if (target) {
            target.active = active;
          }
        });
      }
    });
  };

  const { mutate, isLoading } = useMutation({
    mutationFn: (active: boolean) => updateTimeTrigger(data.id, { active }),
    onSuccess: (_, active) => updateActive(data.id, active),
  });

  return (
    <div className={`${style.triggerItem} rounded mb-5`}>
      <div className="flex pr-5 py-[18px] h-20">
        <div className="relative grow overflow-hidden">
          <div className="absolute w-9 text-right font-medium">{number}.</div>
          <div className="pl-10 font-medium">
            <Link to={data.id}>{data.title}</Link>
          </div>
          <div className="mt-1 pl-10 text-sm text-[#475867]">{data.description}</div>
        </div>
        <div className="flex shrink-0 items-center">
          <Switch
            disabled={isLoading}
            checked={data.active}
            onChange={(checked) => mutate(checked)}
          />
          <Dropdown
            overlay={
              <Menu className="w-24">
                <Menu.Item key="delete" icon={<BiTrash className="text-lg" />} onClick={onDelete}>
                  删除
                </Menu.Item>
              </Menu>
            }
            trigger={['click']}
            placement="bottomRight"
          >
            <button className="ml-2">
              <FiMoreVertical className="text-xl" />
            </button>
          </Dropdown>
        </div>
      </div>
    </div>
  );
}

function TimeTriggerList({ data }: { data: TimeTriggerSchema[] }) {
  const queryClient = useQueryClient();
  const { mutate: remove } = useMutation({
    mutationFn: deleteTimeTrigger,
    onSuccess: () => {
      message.success('删除成功'), queryClient.invalidateQueries('time-triggers');
    },
    onError: (error: Error) => {
      console.error(error);
      notification.error({
        message: '删除失败',
        description: error.message,
      });
    },
  });

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '删除触发器',
      content: `确定要删除触发器吗？`,
      okType: 'danger',
      onOk: () => remove(id),
    });
  };

  return (
    <div>
      {data.map((t, i) => (
        <TimeTriggerItem key={t.id} data={t} number={i + 1} onDelete={() => handleDelete(t.id)} />
      ))}
    </div>
  );
}

interface ReorderProps {
  data: TimeTriggerSchema[];
  onChange: (ids: string[]) => void;
}

function Reorder({ data, onChange }: ReorderProps) {
  const [tempTriggers, setTempTriggers] = useState(data.slice());

  const up = (index: number) => {
    const next = [
      ...tempTriggers.slice(0, index - 1),
      tempTriggers[index],
      tempTriggers[index - 1],
      ...tempTriggers.slice(index + 1),
    ];
    setTempTriggers(next);
    onChange(next.map((t) => t.id));
  };

  const down = (index: number) => {
    const next = [
      ...tempTriggers.slice(0, index),
      tempTriggers[index + 1],
      tempTriggers[index],
      ...tempTriggers.slice(index + 2),
    ];
    onChange(next.map((t) => t.id));
    setTempTriggers(next);
  };

  const moveToTop = (index: number) => {
    const next = [
      tempTriggers[index],
      ...tempTriggers.slice(0, index),
      ...tempTriggers.slice(index + 1),
    ];
    onChange(next.map((t) => t.id));
    setTempTriggers(next);
  };

  const moveToButton = (index: number) => {
    const next = [
      ...tempTriggers.slice(0, index),
      ...tempTriggers.slice(index + 1),
      tempTriggers[index],
    ];
    onChange(next.map((t) => t.id));
    setTempTriggers(next);
  };

  return (
    <div>
      {tempTriggers.map((trigger, i) => (
        <div key={trigger.id} className={`${style.triggerItem} rounded mb-5`}>
          <div className="flex px-3 pr-5 py-[18px] h-20">
            <div className="flex grow items-center overflow-hidden">
              <div className="font-medium">
                <span className="inline-block w-6 text-right">{i + 1}.</span> {trigger.title}
              </div>
            </div>
            <div className="flex shrink-0 items-center">
              <Button
                className="flex"
                size="middle"
                icon={<BiArrowToTop className="m-auto text-xl" />}
                disabled={i === 0}
                onClick={() => moveToTop(i)}
              />
              <Button
                className="flex ml-1"
                size="middle"
                icon={<BiUpArrowAlt className="m-auto text-xl" />}
                disabled={i === 0}
                onClick={() => up(i)}
              />
              <Button
                className="flex ml-1"
                size="middle"
                icon={<BiDownArrowAlt className="m-auto text-xl" />}
                disabled={i === tempTriggers.length - 1}
                onClick={() => down(i)}
              />
              <Button
                className="flex ml-1"
                size="middle"
                icon={<BiArrowToBottom className="m-auto text-xl" />}
                disabled={i === tempTriggers.length - 1}
                onClick={() => moveToButton(i)}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TimeTriggers() {
  const [reordering, setReordering] = useState(false);
  const [order, setOrder] = useState<string[]>();

  const { data: timeTriggers, isLoading } = useTimeTriggers();
  const sortedTimeTriggers = useMemo(() => {
    return timeTriggers?.sort((a, b) => {
      if (a.active !== b.active) {
        return a.active ? -1 : 1;
      }
      return a.position - b.position;
    });
  }, [timeTriggers]);

  const activeTimeTriggers = useMemo(() => {
    return sortedTimeTriggers?.filter((a) => a.active);
  }, [sortedTimeTriggers]);

  const queryClient = useQueryClient();
  const { mutate: saveOrder, isLoading: isSavingOrder } = useMutation({
    mutationFn: reorderTimeTrigger,
    onSuccess: () => {
      queryClient.invalidateQueries('time-triggers');
      message.success('保存成功');
      setReordering(false);
    },
    onError: (error: Error) => {
      console.error(error);
      notification.error({
        message: '保存失败',
        description: error.message,
      });
    },
  });

  const handleSaveOrder = () => {
    if (order) {
      saveOrder(order);
    } else {
      setReordering(false);
    }
  };

  return (
    <div className="p-10 pb-4">
      <Title level={4}>时间触发器</Title>

      <div className="flex my-4">
        <div className="grow leading-8 text-[#475867]">
          <button className="inline-flex items-center">
            正在执行 所有匹配的规则
            <AiOutlineSetting className="inline-block w-4 h-4 ml-1" />
          </button>
        </div>

        {!reordering && (
          <>
            {activeTimeTriggers && activeTimeTriggers.length > 1 && (
              <Button
                className="mr-2"
                onClick={() => {
                  setOrder(undefined);
                  setReordering(true);
                }}
              >
                重新排序
              </Button>
            )}
            <Link to="new">
              <Button type="primary">新规则</Button>
            </Link>
          </>
        )}
        {reordering && (
          <>
            <Button
              className="mr-2"
              onClick={() => {
                setOrder(undefined);
                setReordering(false);
              }}
            >
              取消
            </Button>
            <Button type="primary" disabled={isSavingOrder} onClick={handleSaveOrder}>
              完成
            </Button>
          </>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center items-center h-80">
          <Spin />
        </div>
      )}

      {timeTriggers?.length === 0 && (
        <div className="flex justify-center items-center h-80">
          <Empty />
        </div>
      )}

      {!reordering && sortedTimeTriggers && <TimeTriggerList data={sortedTimeTriggers} />}

      {reordering && activeTimeTriggers && (
        <Reorder data={activeTimeTriggers} onChange={setOrder} />
      )}
    </div>
  );
}
