import { useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { uniq } from 'lodash-es';

import { useCurrentUser } from '@/leancloud';
import {
  QuickReplySchema,
  useCreateQuickReply,
  useDeleteQuickReply,
  useQuickReplies,
  useQuickReply,
  useUpdateQuickReply,
} from '@/api/quick-reply';
import { Button, Divider, Modal, Select, Spin, Table, message } from '@/components/antd';
import { QuickReplyForm, QuickReplyFormData } from './QuickReplyForm';

const { Option } = Select;
const { Column } = Table;

export function QuickReplyList() {
  const [visiblity, setVisiblity] = useState('all');

  const currentUser = useCurrentUser();

  const userId = useMemo(() => {
    if (!currentUser) {
      return 'null';
    }
    if (visiblity === 'all') {
      return [currentUser.id, 'null'];
    }
    if (visiblity === 'public') {
      return 'null';
    }
    return currentUser.id;
  }, [visiblity, currentUser]);

  const { data, isFetching } = useQuickReplies({ userId });

  const queryClient = useQueryClient();

  const { mutate: remove, isLoading: removing } = useDeleteQuickReply({
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries('quickReplies');
    },
  });

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '删除快捷回复',
      content: '该操作不可恢复',
      okButtonProps: { danger: true },
      okText: 'Delete',
      onOk: () => remove(id),
    });
  };

  return (
    <div className="p-10">
      <div className="mb-4">
        <Link to="new">
          <Button>新增回复</Button>
        </Link>
        <Divider type="vertical" />
        <Select value={visiblity} onChange={(v) => setVisiblity(v)} style={{ width: 120 }}>
          <Option value="all">全部</Option>
          <Option value="public">所有人</Option>
          <Option value="private">仅限自己</Option>
        </Select>
      </div>

      <Table
        loading={isFetching}
        dataSource={data}
        rowKey="id"
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
        }}
      >
        <Column dataIndex="name" title="名称" />
        <Column
          dataIndex="userId"
          title="权限"
          render={(userId?: string) => (userId ? '仅限自己' : '所有人')}
        />
        <Column
          key="actions"
          title="操作"
          render={({ id }: QuickReplySchema) => (
            <>
              <Link to={id}>编辑</Link>
              <Button
                type="link"
                size="small"
                danger
                disabled={removing}
                onClick={() => handleDelete(id)}
                style={{ padding: 0, border: 'none', height: 22, marginLeft: 8 }}
              >
                删除
              </Button>
            </>
          )}
        />
      </Table>
    </div>
  );
}

function useAvailableTags() {
  const currentUser = useCurrentUser();

  const userId = useMemo(() => {
    if (currentUser) {
      return [currentUser.id, 'null'].join(',');
    }
  }, [currentUser]);

  const { data: quickReplies } = useQuickReplies({
    userId,
    queryOptions: {
      enabled: userId !== undefined,
    },
  });

  return useMemo(() => {
    if (!quickReplies) {
      return [];
    }
    const tags = quickReplies.flatMap((quickReply) => quickReply.tags ?? []);
    return uniq(tags);
  }, [quickReplies]);
}

export function NewQuickReply() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate, isLoading } = useCreateQuickReply({
    onSuccess: () => {
      queryClient.invalidateQueries(['quickReplies']);
      message.success('创建成功');
      navigate('..');
    },
  });

  const currentUser = useCurrentUser();

  const handleCreate = (data: QuickReplyFormData) => {
    mutate({
      name: data.name,
      content: data.content,
      userId: data.visibility === 'private' ? currentUser?.id : undefined,
      fileIds: data.fileIds,
      tags: data.tags,
    });
  };

  const availableTags = useAvailableTags();

  return (
    <div className="p-10">
      <QuickReplyForm availableTags={availableTags} loading={isLoading} onSubmit={handleCreate} />
    </div>
  );
}

export function QuickReplyDetail() {
  const { id } = useParams<'id'>();
  const { data, isLoading } = useQuickReply(id!);

  const queryClient = useQueryClient();
  const { mutate, isLoading: updating } = useUpdateQuickReply({
    onSuccess: () => {
      queryClient.invalidateQueries(['quickReplies']);
      queryClient.invalidateQueries(['quickReply', id]);
      message.success('已保存');
    },
  });

  const currentUser = useCurrentUser();

  const handleUpdate = (data: QuickReplyFormData) => {
    mutate({
      id: id!,
      name: data.name,
      content: data.content,
      userId: data.visibility === 'private' ? currentUser?.id : undefined,
      fileIds: data.fileIds,
      tags: data.tags,
    });
  };

  const initData = useMemo<QuickReplyFormData | undefined>(() => {
    if (data) {
      return {
        ...data,
        visibility: data.userId ? 'private' : 'all',
      };
    }
  }, [data]);

  const availableTags = useAvailableTags();

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex justify-center items-center">
        <Spin />
      </div>
    );
  }

  return (
    <div className="p-10">
      <QuickReplyForm
        availableTags={availableTags}
        initData={initData!}
        loading={updating}
        onSubmit={handleUpdate}
      />
    </div>
  );
}
