import { useCallback, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';

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
import { useSearchParam } from '@/utils/useSearchParams';
import { usePage, usePageSize } from '@/utils/usePage';
import { QuickReplyForm, QuickReplyFormData } from './QuickReplyForm';

const { Option } = Select;
const { Column } = Table;

export function QuickReplyList() {
  const [visiblity = 'all', setVisiblity] = useSearchParam('visiblity');
  const [page, { set: setPage }] = usePage();
  const [pageSize = 20, setPageSize] = usePageSize();

  const currentUser = useCurrentUser();

  const userId = useMemo(() => {
    if (!currentUser) {
      return null;
    }
    if (visiblity === 'all') {
      return [currentUser.id, null];
    }
    if (visiblity === 'public') {
      return null;
    }
    return currentUser.id;
  }, [visiblity, currentUser]);

  const { data, totalCount, isFetching } = useQuickReplies({
    userId,
    page,
    pageSize,
    count: true,
    queryOptions: {
      keepPreviousData: true,
      onError: (error) => {
        message.error(error.message);
      },
    },
  });

  const queryClient = useQueryClient();

  const { mutate: remove, isLoading: removing } = useDeleteQuickReply({
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries('quickReplies');
    },
    onError: (error) => {
      message.error(error.message);
    },
  });

  const handleDelete = useCallback(
    (id: string) => {
      Modal.confirm({
        title: '删除快捷回复',
        content: '该操作不可恢复',
        okButtonProps: { danger: true },
        okText: 'Delete',
        onOk: () => remove(id),
      });
    },
    [remove]
  );

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
          current: page,
          total: totalCount,
          pageSize,
          showSizeChanger: true,
          onChange: (page, size) => {
            setPage(page);
            setPageSize(size);
          },
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

export function NewQuickReply() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate, isLoading } = useCreateQuickReply({
    onSuccess: () => {
      queryClient.invalidateQueries('quickReplies');
      message.success('创建成功');
      navigate('..');
    },
    onError: (error) => {
      message.error(error.message);
    },
  });

  const currentUser = useCurrentUser();

  const handleCreate = useCallback(
    (data: QuickReplyFormData) => {
      mutate({
        name: data.name,
        content: data.content,
        userId: data.visibility === 'private' ? currentUser?.id : undefined,
        fileIds: data.fileIds,
      });
    },
    [mutate, currentUser]
  );

  return (
    <div className="p-10">
      <QuickReplyForm loading={isLoading} onSubmit={handleCreate} />
    </div>
  );
}

export function QuickReplyDetail() {
  const { id } = useParams<'id'>();
  const { data, isLoading } = useQuickReply(id!, {
    onError: (error) => {
      message.error(error.message);
    },
  });

  const queryClient = useQueryClient();
  const { mutate, isLoading: updating } = useUpdateQuickReply({
    onSuccess: () => {
      queryClient.invalidateQueries('quickReplies');
      message.success('已保存');
    },
    onError: (error) => {
      message.error(error.message);
    },
  });

  const currentUser = useCurrentUser();

  const handleUpdate = useCallback(
    (data: QuickReplyFormData) => {
      mutate({
        id: id!,
        name: data.name,
        content: data.content,
        userId: data.visibility === 'private' ? currentUser?.id : undefined,
        fileIds: data.fileIds,
      });
    },
    [id, mutate, currentUser]
  );

  const initData = useMemo<QuickReplyFormData | undefined>(() => {
    if (data) {
      return {
        ...data,
        visibility: data.userId ? 'private' : 'all',
      };
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex justify-center items-center">
        <Spin />
      </div>
    );
  }

  return (
    <div className="p-10">
      <QuickReplyForm initData={initData!} loading={updating} onSubmit={handleUpdate} />
    </div>
  );
}
