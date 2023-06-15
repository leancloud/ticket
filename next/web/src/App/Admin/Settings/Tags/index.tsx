import { useMemo } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from 'react-query';

import {
  TagMetadataSchema,
  useCreateTagMetadata,
  useDeleteTagMatadata,
  useTagMetadatas,
  useUpdateTagMetadata,
} from '@/api/tag-metadata';
import { Button, Modal, Spin, Table, message } from '@/components/antd';
import { TagMetadataForm } from './TagMetadataForm';

const { Column } = Table;

export function TagList() {
  const { data, isFetching } = useTagMetadatas();

  const queryClient = useQueryClient();
  const { mutate: remove, isLoading: removing } = useDeleteTagMatadata({
    onSuccess: () => {
      message.success('标签已删除');
      queryClient.invalidateQueries('tagMetadatas');
    },
  });

  const handleRemoveTag = (id: string) => {
    Modal.confirm({
      title: '删除标签',
      content: '该操作不可恢复',
      okButtonProps: { danger: true },
      okText: 'Delete',
      onOk: () => remove(id),
    });
  };

  return (
    <div className="p-10">
      <div className="flex mb-4">
        <div className="grow" />
        <div>
          <Link to="new">
            <Button type="primary">新增标签</Button>
          </Link>
        </div>
      </div>

      <Table dataSource={data} rowKey="id" loading={isFetching} pagination={false}>
        <Column
          key="name"
          title="标签名称"
          render={({ id, key }: TagMetadataSchema) => <Link to={id}>{key}</Link>}
        />
        <Column
          dataIndex="private"
          title="公开"
          render={(_private: boolean) => (_private ? '否' : '是')}
        />
        <Column
          key="actions"
          title="操作"
          render={({ id }: TagMetadataSchema) => (
            <Button
              danger
              type="link"
              size="small"
              disabled={removing}
              onClick={() => handleRemoveTag(id)}
              style={{ padding: 0, border: 'none', height: 22 }}
            >
              删除
            </Button>
          )}
        />
      </Table>
    </div>
  );
}

export function NewTag() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate, isLoading } = useCreateTagMetadata({
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries('tagMetadatas');
      navigate('..');
    },
  });

  return (
    <div className="p-10">
      <TagMetadataForm loading={isLoading} onSubmit={mutate} />
    </div>
  );
}

export function TagDetail() {
  const { id } = useParams<'id'>();
  const { data, isLoading } = useTagMetadatas();
  const tagMetadata = useMemo(() => {
    return data?.find((t) => t.id === id);
  }, [data, id]);

  const queryClient = useQueryClient();
  const { mutate, isLoading: saving } = useUpdateTagMetadata({
    onSuccess: () => {
      message.success('已成功');
      queryClient.invalidateQueries('tagMetadatas');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex justify-center items-center">
        <Spin />
      </div>
    );
  }

  if (!tagMetadata) {
    return <Navigate to=".." />;
  }

  return (
    <div className="p-10">
      <TagMetadataForm
        initData={tagMetadata}
        loading={saving}
        onSubmit={(data) => mutate({ ...data, id: id! })}
      />
    </div>
  );
}
