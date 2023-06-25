import { ComponentPropsWithoutRef, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient, useMutation } from 'react-query';
import { AiOutlineCheck, AiOutlineSearch } from 'react-icons/ai';
import { FiMoreVertical } from 'react-icons/fi';
import { Dialog, Menu } from '@headlessui/react';
import moment from 'moment';
import cx from 'classnames';
import { keyBy } from 'lodash-es';

import { useCurrentUser } from '@/leancloud';
import { useGroups } from '@/api/group';
import {
  ViewSchema,
  createView,
  updateView,
  useViews,
  useViewGroups,
  useView,
  UpdateViewData,
  deleteView,
  reorderViews,
  CreateViewData,
} from '@/api/view';
import { Button, Input, Modal, Select, Spin, Table, message } from '@/components/antd';

import { EditView } from './EditView';
import { decodeCondition, encodeCondition } from '../Automations/utils';

const { Option } = Select;
const { Column } = Table;

function GroupNames({ ids }: { ids: string[] }) {
  const { data } = useGroups();
  const groupMap = useMemo(() => keyBy(data, 'id'), [data]);
  const text = useMemo(() => ids.map((id) => groupMap[id]?.name ?? id).join(', '), [ids, groupMap]);
  return (
    <div className="max-w-[200px] truncate" title={text}>
      {text}
    </div>
  );
}

function ViewVisibility({ view }: { view: ViewSchema }) {
  if (view.groupIds) {
    return <GroupNames ids={view.groupIds} />;
  }
  if (view.userIds) {
    return <div>仅我可见</div>;
  }
  return <div>全部可见</div>;
}

function MenuButton({
  active,
  ...props
}: ComponentPropsWithoutRef<'button'> & { active?: boolean }) {
  return (
    <Menu.Item disabled={props.disabled}>
      {({ active }) => (
        <button
          {...props}
          className={cx('w-full text-left px-[20px] py-[10px] disabled:text-gray-300', {
            'bg-gray-100': active,
          })}
        />
      )}
    </Menu.Item>
  );
}

interface ListMenuProps {
  view: ViewSchema;
  sortable?: boolean;
  onMoveToTop: (view: ViewSchema) => void;
  onMoveToBottom: (view: ViewSchema) => void;
  onMove: (view: ViewSchema) => void;
}

function ListMenu({ view, sortable, onMove, onMoveToTop, onMoveToBottom }: ListMenuProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate: remove, isLoading: isDeleting } = useMutation({
    mutationFn: () => deleteView(view.id),
    onSuccess: () => {
      queryClient.invalidateQueries('views');
      if (view.groupIds) {
        queryClient.invalidateQueries('viewGroups');
      }
      message.success('删除成功');
    },
  });

  const handleDelete = () => {
    Modal.confirm({
      title: `删除视图「${view.title}」`,
      content: '该操作不可恢复',
      okType: 'danger',
      onOk: () => remove(),
    });
  };

  return (
    <Menu>
      <Menu.Button className="text-gray-400 hover:text-gray-600 outline-none">
        <FiMoreVertical className="w-5 h-5" />
      </Menu.Button>
      <Menu.Items className="absolute right-4 top-full bg-white border shadow-md rounded z-10 w-[200px] py-[10px] outline-none">
        <MenuButton children="编辑视图" disabled={isDeleting} onClick={() => navigate(view.id)} />
        <MenuButton
          children="移动到第一位"
          disabled={isDeleting || !sortable}
          onClick={() => onMoveToTop(view)}
        />
        <MenuButton
          children="移动到最后一位"
          disabled={isDeleting || !sortable}
          onClick={() => onMoveToBottom(view)}
        />
        <MenuButton
          children="选择位置"
          disabled={isDeleting || !sortable}
          onClick={() => onMove(view)}
        />
        <MenuButton children="删除" disabled={isDeleting} onClick={handleDelete} />
      </Menu.Items>
    </Menu>
  );
}

interface MoveViewDialogProps {
  open: boolean;
  onClose: () => void;
  onMove: (selectedViewId: string) => void;
  views?: ViewSchema[];
  currentViewId?: string;
}

function MoveViewDialog({ open, onClose, onMove, views, currentViewId }: MoveViewDialogProps) {
  const $input = useRef<any>(null);
  const [keyword, setKeyword] = useState('');
  const [selectedViewId, setSelectedViewId] = useState<string>();

  useEffect(() => {
    setSelectedViewId(undefined);
  }, [open]);

  const filteredViews = useMemo(() => {
    if (keyword) {
      return views?.filter((v) => v.title.includes(keyword));
    }
    return views;
  }, [views, keyword]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      initialFocus={$input}
      className="fixed inset-0 z-50 flex justify-center items-center"
    >
      <Dialog.Overlay className="fixed inset-0 bg-[#2F3941] opacity-60" />

      <div className="w-[460px] bg-white z-50 rounded shadow-[#555] shadow-md p-[30px] pb-6">
        <div className="text-xl leading-7">将视图移到哪一项的上面？</div>

        <div className="my-[30px]">
          <Input
            ref={$input}
            size="small"
            prefix={<AiOutlineSearch />}
            placeholder="搜索视图"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className="h-[300px] py-[10px] border border-[#D2D7D9] rounded overflow-y-auto">
          {filteredViews?.map(({ id, title }) => (
            <button
              key={id}
              className="relative w-full text-left leading-5 pl-5 pr-9 py-[10px] hover:bg-gray-100 disabled:text-[#ccc] disabled:bg-white"
              disabled={id === currentViewId}
              onClick={() => setSelectedViewId(id)}
            >
              {title}
              {id === selectedViewId && (
                <AiOutlineCheck className="absolute right-[11px] top-[13px]" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-[30px] flex flex-row-reverse">
          <Button type="primary" disabled={!selectedViewId} onClick={() => onMove(selectedViewId!)}>
            移动
          </Button>
          <Button className="mr-3" onClick={onClose}>
            取消
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function ViewList() {
  const currentUser = useCurrentUser();
  const [visibility, setVisibility] = useState('shared');

  const {
    data: views,
    isLoading,
    isFetching,
  } = useViews({
    userIds: visibility === 'personal' ? [currentUser!.id] : ['null'],
    groupIds: visibility !== 'shared' && visibility !== 'personal' ? [visibility] : undefined,
  });

  const { data: groups } = useViewGroups();

  const visibilityOptions = useMemo(() => {
    return [
      { value: 'shared', text: '所有共享视图' },
      { value: 'personal', text: '个人视图' },
      ...(groups?.map((g) => ({ value: g.id, text: g.name })) ?? []),
    ];
  }, [groups]);

  const queryClient = useQueryClient();
  const { mutate: reorder } = useMutation({
    mutationFn: reorderViews,
    onSuccess: () => {
      queryClient.invalidateQueries('views');
      message.success('移动视图成功');
    },
  });

  const handleMoveToTop = (view: ViewSchema) => {
    reorder([view.id, ...views!.filter((v) => v.id !== view.id).map((v) => v.id)]);
  };

  const handleMoveToBottom = (view: ViewSchema) => {
    reorder([...views!.filter((v) => v.id !== view.id).map((v) => v.id), view.id]);
  };

  const [movingViewId, setMovingViewId] = useState<string>();
  const handleMove = (nextViewId: string) => {
    const ids: string[] = [];
    views!.forEach((v) => {
      if (v.id === movingViewId) {
        return;
      }
      if (v.id === nextViewId) {
        ids.push(movingViewId!);
      }
      ids.push(v.id);
    });
    reorder(ids);
    setMovingViewId(undefined);
  };

  const sortable =
    views !== undefined &&
    views.length > 1 &&
    (visibility === 'personal' || visibility === 'shared');

  return (
    <div className="p-10">
      <h1 className="text-[#2f3941] text-[26px] font-normal">视图</h1>
      <div className="flex justify-between mb-4">
        <Select value={visibility} onChange={(v) => setVisibility(v)} style={{ width: 200 }}>
          {visibilityOptions.map(({ value, text }) => (
            <Option key={value} value={value}>
              {text}
            </Option>
          ))}
        </Select>

        <Link to="new">
          <Button type="primary">新增视图</Button>
        </Link>
      </div>

      <Table dataSource={views} rowKey="id" pagination={false} loading={isLoading || isFetching}>
        <Column
          title="名称"
          dataIndex="title"
          render={(title, view: ViewSchema) => <Link to={view.id}>{title}</Link>}
        />
        <Column
          title="权限"
          key="privilege"
          render={(view: ViewSchema) => (
            <div className="max-w-[200px] truncate">
              <ViewVisibility view={view} />
            </div>
          )}
        />
        <Column
          title="更新时间"
          dataIndex="updatedAt"
          render={(updatedAt) => moment(updatedAt).format('YYYY-MM-DD HH:mm:ss')}
        />
        <Column
          key="actions"
          className="w-14"
          render={(view: ViewSchema) => (
            <div className="relative">
              <ListMenu
                view={view}
                sortable={sortable}
                onMove={() => setMovingViewId(view.id)}
                onMoveToTop={handleMoveToTop}
                onMoveToBottom={handleMoveToBottom}
              />
            </div>
          )}
        />
      </Table>

      <MoveViewDialog
        open={movingViewId !== undefined}
        onClose={() => setMovingViewId(undefined)}
        onMove={handleMove}
        views={views}
        currentViewId={movingViewId}
      />
    </div>
  );
}

export function NewView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate, isLoading } = useMutation({
    mutationFn: (data: CreateViewData) =>
      createView({
        ...data,
        conditions: encodeCondition(data.conditions),
      }),
    onSuccess: (_, { groupIds }) => {
      queryClient.invalidateQueries('views');
      if (groupIds) {
        queryClient.invalidateQueries('viewGroups');
      }
      message.success('创建成功');
      navigate('..');
    },
  });

  return (
    <div className="p-10">
      <EditView
        submitting={isLoading}
        onSubmit={(data) =>
          mutate({
            ...data,
            userIds: data.userIds || undefined,
            groupIds: data.groupIds || undefined,
          })
        }
      />
    </div>
  );
}

export function ViewDetail() {
  const { id } = useParams();
  const { data, isLoading, isFetching } = useView(id!);

  const view = useMemo(
    () =>
      data && {
        ...data,
        conditions: decodeCondition(data.conditions),
      },
    [data]
  );

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate, isLoading: isUpdating } = useMutation({
    mutationFn: (data: UpdateViewData) => updateView(id!, data),
    onSuccess: (_, { groupIds }) => {
      queryClient.invalidateQueries(['view', id]);
      queryClient.invalidateQueries('views');
      if (groupIds) {
        queryClient.invalidateQueries('viewGroups');
      }
      message.success('更新成功');
      navigate('..');
    },
  });

  if (isLoading || isFetching) {
    return (
      <div className="h-full flex justify-center items-center">
        <Spin />
      </div>
    );
  }

  return (
    <div className="p-10">
      <EditView initData={view} submitting={isUpdating} onSubmit={mutate} />
    </div>
  );
}
