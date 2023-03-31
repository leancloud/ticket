import { useCallback, useMemo } from 'react';
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
import { ArticleSelect } from '../Articles/ArticleSelect';
import { JSONTextarea } from '../../components/JSONTextarea';
import { useArticles } from '@/api/article';
import _ from 'lodash';

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

  const handleDelete = useCallback(() => {
    Modal.confirm({
      title: '删除客服组',
      content: `确定删除客服组 ${name} ？`,
      onOk: () => mutate(id),
    });
  }, [id, mutate]);

  return (
    <div>
      <Button danger type="link" size="small" disabled={isLoading} onClick={handleDelete}>
        删除
      </Button>
    </div>
  );
}

const columns: TableProps<Topic>['columns'] = [
  {
    dataIndex: 'name',
    title: '名称',
    className: 'whitespace-nowrap',
    render: (name: string, topic: Topic) => <Link to={topic.id} children={name} />,
  },
  {
    dataIndex: 'articleIds',
    title: '数量',
    render: (articleIds: string[]) => articleIds.length,
  },
  {
    key: 'actions',
    title: '操作',
    render: TopicActions,
  },
];

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
        columns={columns}
        loading={isLoading}
        dataSource={topics}
        rowKey="id"
        pagination={false}
      />
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

  const { data: articles } = useArticles();
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
            <ArticleSelect {...field} id="articles" />
            {articles && field.value && (
              <div className="mt-2">
                <div>预览：</div>
                <ul>
                  {field.value
                    .filter((id) => !articleMap[id].private)
                    .map((id) => (
                      <li key={id}>
                        <a href={`../articles/${id}`} target="_blank">
                          {articleMap[id].name}
                        </a>
                      </li>
                    ))}
                </ul>
              </div>
            )}
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
  const topicResult = useTopic(id!);

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
