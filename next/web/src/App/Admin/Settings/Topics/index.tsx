import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';

import {
  createTopic,
  deleteTopic,
  Topic,
  updateTopic,
  UpdateTopicData,
  UpsertTopicData,
  useTopic,
  useTopics,
} from '@/api/topic';
import { Button, Form, Input, Modal, Table, TableProps, message } from '@/components/antd';
import { QueryResult } from '@/components/common';
import { ArticleListFormItem } from '@/App/Admin/components/ArticleListFormItem';
import { JSONTextarea } from '../../components/JSONTextarea';
import { useArticles } from '@/api/article';
import _ from 'lodash';

const { Column } = Table;

function TopicActions({ id, name }: Topic) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate, isLoading } = useMutation({
    mutationFn: deleteTopic,
    onSuccess: () => {
      message.success('已删除');
      navigate('../..');
      queryClient.invalidateQueries('topics');
      queryClient.invalidateQueries(['topics', id]);
    },
    onError: (error: Error) => {
      message.error(`删除失败：${error.message}`);
    },
  });

  const handleDelete = () => {
    Modal.confirm({
      title: '删除客服组',
      content: `确定删除客服组 ${name} ？`,
      onOk: () => mutate(id),
    });
  };

  return (
    <div>
      <Button danger type="link" size="small" disabled={isLoading} onClick={handleDelete}>
        删除
      </Button>
    </div>
  );
}

export function TopicList() {
  const { data: topics, isLoading } = useTopics();

  return (
    <div className="p-10">
      <h1 className="text-[#2f3941] text-[26px] font-normal">Topics</h1>

      <div className="flex flex-row-reverse">
        <Link to="new">
          <Button type="primary" children="创建 Topic" />
        </Link>
      </div>

      <Table
        className="mt-5"
        loading={isLoading}
        dataSource={topics}
        rowKey="id"
        pagination={false}
      >
        <Column<Topic>
          className="whitespace-nowrap"
          dataIndex="name"
          title="名称"
          render={(name, topic) => <Link to={`${topic.id}`}>{name}</Link>}
        />
        <Column<Topic>
          dataIndex="articleIds"
          title="数量"
          render={(articleIds) => articleIds.length}
        />
        <Column<Topic>
          dataIndex="id"
          key="actions"
          title="操作"
          render={(id, topic) => <TopicActions {...topic} />}
        />
      </Table>
    </div>
  );
}

interface EditTopicProps {
  initData?: UpsertTopicData;
  loading?: boolean;
  onSave: (data: UpsertTopicData) => void;
}

function EditTopic({ initData, loading, onSave }: EditTopicProps) {
  const { control, handleSubmit } = useForm({
    defaultValues: initData,
  });

  const { data: articles, isLoading: loadingArticles } = useArticles();
  const articleMap = useMemo(() => _.keyBy(articles, 'id'), [articles]);

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSave)}>
      <Controller
        control={control}
        name="name"
        rules={{ required: '请填写此字段' }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item
            label="名称"
            htmlFor="name"
            validateStatus={error ? 'error' : undefined}
            help={error?.message}
          >
            <Input {...field} autoFocus id="name" />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="articleIds"
        render={({ field }) => (
          <Form.Item label="文章" htmlFor="articles">
            <ArticleListFormItem
              articles={articles}
              value={field.value}
              onChange={field.onChange}
              modalTitle="编辑文章"
              loading={loadingArticles}
            />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="meta"
        render={({ field }) => (
          <Form.Item label="Meta" htmlFor="meta" help="面向开发者的扩展属性">
            <JSONTextarea {...field} id="meta" />
          </Form.Item>
        )}
      />

      <Button type="primary" htmlType="submit" disabled={loading}>
        保存
      </Button>
    </Form>
  );
}

export function NewTopic() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { mutate, isLoading } = useMutation({
    mutationFn: createTopic,
    onSuccess: () => {
      message.success('保存成功');
      queryClient.invalidateQueries('topics');
      navigate('..');
    },
    onError: (error: Error) => {
      message.error(`创建失败：${error.message}`);
    },
  });

  return (
    <div className="p-10">
      <EditTopic loading={isLoading} onSave={mutate} />
    </div>
  );
}

export function TopicDetail() {
  const { id } = useParams<'id'>();
  const topicResult = useTopic(id!, { raw: true });

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { mutate, isLoading } = useMutation({
    mutationFn: (data: UpdateTopicData) => updateTopic(id!, data),
    onSuccess: () => {
      message.success('保存成功');
      queryClient.invalidateQueries('topics');
      navigate('..');
    },
    onError: (error: Error) => {
      message.error(`更新失败：${error.message}`);
    },
  });

  return (
    <QueryResult className="p-10" result={topicResult}>
      {({ data }) => <EditTopic initData={data} loading={isLoading} onSave={mutate} />}
    </QueryResult>
  );
}
