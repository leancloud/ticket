import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { useQueryClient } from 'react-query';
import moment from 'moment';
import { FormInstance } from 'antd/lib/form';

import { LOCALES } from '@/i18n/locales';
import {
  CreateDynamicContentVariantData,
  DynamicContentSchema,
  DynamicContentVariantSchema,
  UpdateDynamicContentVariantData,
  useCreateDynamicContent,
  useCreateDynamicContentVariant,
  useDeleteDynamicContent,
  useDeleteDynamicContentVariant,
  useDynamicContent,
  useDynamicContents,
  useDynamicContentVariants,
  useUpdateDynamicContent,
  useUpdateDynamicContentVariant,
} from '@/api/dynamic-content';
import {
  message,
  Breadcrumb,
  Button,
  Divider,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Spin,
  Table,
} from '@/components/antd';
import { usePage } from '@/utils/usePage';
import { DynamicContentForm } from './DynamicContentForm';

const { TextArea } = Input;
const { Column } = Table;

const PAGE_SIZE = 40;

export function DynamicContentList() {
  const [page, { set: setPage }] = usePage();

  const { data, count, isLoading } = useDynamicContents({
    page,
    pageSize: PAGE_SIZE,
  });

  const queryClient = useQueryClient();
  const { mutate: remove, isLoading: removing } = useDeleteDynamicContent({
    onSuccess: () => {
      message.success('已删除');
      queryClient.invalidateQueries('dynamicContents');
    },
  });

  const handleRemove = (id: string) => {
    Modal.confirm({
      title: '删除动态内容',
      content: '该操作不可恢复',
      okType: 'danger',
      onOk: () => remove(id),
    });
  };

  return (
    <div className="p-10">
      <div className="flex flex-row-reverse mb-4">
        <Link to="new">
          <Button type="primary">添加</Button>
        </Link>
      </div>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          onChange: setPage,
          showSizeChanger: false,
          total: count,
        }}
      >
        <Column key="name" title="名称" render={({ id, name }) => <Link to={id}>{name}</Link>} />
        <Column
          dataIndex="defaultLocale"
          title="默认"
          render={(locale) => LOCALES[locale] ?? 'unknown'}
        />
        <Column
          dataIndex="updatedAt"
          title="最后更新于"
          render={(ts) => <div title={ts}>{moment(ts).fromNow()}</div>}
        />
        <Column
          key="actions"
          render={({ id }) => (
            <div>
              <Button
                type="link"
                danger
                disabled={removing}
                onClick={() => handleRemove(id)}
                style={{ padding: 0, border: 'none', height: 22 }}
              >
                删除
              </Button>
            </div>
          )}
        />
      </Table>
    </div>
  );
}

export function NewDynamicContent() {
  const navigate = useNavigate();

  const { mutate, isLoading } = useCreateDynamicContent({
    onSuccess: () => {
      message.success('创建成功');
      navigate('..');
    },
  });

  return (
    <div className="p-10">
      <DynamicContentForm submitting={isLoading} onSubmit={mutate} />
    </div>
  );
}

interface EditDynamicContentModalProps {
  visible: boolean;
  onHide: () => void;
  dc: DynamicContentSchema;
  locales?: string[];
}

function EditDynamicContentModal({ visible, onHide, dc, locales }: EditDynamicContentModalProps) {
  const localeOptions = useMemo(
    () =>
      locales?.map((locale) => ({
        label: LOCALES[locale] ?? 'unknown',
        value: locale,
      })),
    [locales]
  );

  const { control, handleSubmit, reset } = useForm();

  const resetData = () => {
    reset({
      name: dc.name,
      defaultLocale: dc.defaultLocale,
    });
  };
  useEffect(resetData, [dc]);

  const $form = useRef<FormInstance>(null!);

  const queryClient = useQueryClient();

  const { mutate, isLoading } = useUpdateDynamicContent({
    onSuccess: () => {
      message.success('保存成功');
      queryClient.invalidateQueries(['dynamicContent', dc.id]);
      onHide();
    },
  });

  return (
    <Modal
      title="编辑动态内容"
      visible={visible}
      onCancel={() => !isLoading && onHide()}
      cancelButtonProps={{ disabled: isLoading }}
      onOk={() => $form.current.submit()}
      okButtonProps={{ loading: isLoading }}
      afterClose={resetData}
    >
      <Form ref={$form} layout="vertical" onFinish={handleSubmit((data) => mutate([dc.id, data]))}>
        <Controller
          control={control}
          name="name"
          rules={{
            required: '请填写名称',
            pattern: {
              value: /^[a-zA-Z0-9_]+$/,
              message: '请仅使用 A-Z、0-9、_',
            },
          }}
          render={({ field, fieldState: { error } }) => (
            <Form.Item
              label="名称"
              htmlFor="dc_form_name"
              required
              validateStatus={error ? 'error' : undefined}
              help={error?.message}
            >
              <Input {...field} id="dc_form_name" autoFocus />
            </Form.Item>
          )}
        />

        <Controller
          control={control}
          name="defaultLocale"
          rules={{ required: '请填写默认语言' }}
          render={({ field, fieldState: { error } }) => (
            <Form.Item
              label="默认语言"
              htmlFor="dc_form_defaultLocale"
              required
              validateStatus={error ? 'error' : undefined}
              help={error?.message}
            >
              <Select {...field} id="dc_form_defaultLocale" options={localeOptions} />
            </Form.Item>
          )}
        />
      </Form>
    </Modal>
  );
}

interface AddVariantModalProps {
  visible: boolean;
  onHide: () => void;
  excludeLocales?: string[];
  dynamicContentId: string;
}

function AddVariantModal({
  visible,
  onHide,
  excludeLocales,
  dynamicContentId,
}: AddVariantModalProps) {
  const { control, handleSubmit, reset } = useForm<CreateDynamicContentVariantData>();

  useEffect(() => {
    if (!visible) {
      reset();
    }
  }, [visible]);

  const localeOptions = useMemo(() => {
    return Object.entries(LOCALES).map(([value, label]) => ({
      label,
      value,
      disabled: excludeLocales?.includes(value),
    }));
  }, [excludeLocales]);

  const $form = useRef<FormInstance>(null!);

  const queryClient = useQueryClient();
  const { mutate, isLoading } = useCreateDynamicContentVariant({
    onSuccess: () => {
      message.success('添加成功');
      onHide();
      queryClient.invalidateQueries(['dynamicContentVariants', dynamicContentId]);
    },
  });

  return (
    <Modal
      destroyOnClose
      title="添加变量"
      visible={visible}
      onCancel={() => !isLoading && onHide()}
      cancelButtonProps={{ disabled: isLoading }}
      onOk={() => $form.current.submit()}
      okButtonProps={{ loading: isLoading }}
      width="80%"
    >
      <Form
        ref={$form}
        layout="vertical"
        onFinish={handleSubmit((data) => mutate({ ...data, dynamicContentId }))}
      >
        <Controller
          control={control}
          name="locale"
          rules={{ required: '请填写默认语言' }}
          render={({ field, fieldState: { error } }) => (
            <Form.Item
              label="语言"
              htmlFor="dc_form_locale"
              extra="动态内容变量的语言。"
              required
              validateStatus={error ? 'error' : undefined}
              help={error?.message}
            >
              <Select {...field} id="dc_form_locale" options={localeOptions} autoFocus />
            </Form.Item>
          )}
        />

        <Controller
          control={control}
          name="active"
          defaultValue={true}
          render={({ field }) => (
            <Form.Item label="状态">
              <Radio.Group {...field}>
                <Radio value={true}>活跃的</Radio>
                <Radio value={false}>非活跃的</Radio>
              </Radio.Group>
            </Form.Item>
          )}
        />

        <Controller
          control={control}
          name="content"
          rules={{ required: '请填写内容' }}
          render={({ field, fieldState: { error } }) => (
            <Form.Item
              label="内容"
              htmlFor="dc_form_content"
              extra="动态内容的文本。您也可以在您的文本中使用占位符。"
              required
              validateStatus={error ? 'error' : undefined}
              help={error?.message}
            >
              <TextArea {...field} id="dc_form_content" rows={10} />
            </Form.Item>
          )}
        />
      </Form>
    </Modal>
  );
}

interface EditVariantModalProps {
  onHide: () => void;
  dc: DynamicContentSchema;
  variant?: DynamicContentVariantSchema;
}

function EditVariantModal({ onHide, dc, variant }: EditVariantModalProps) {
  const { control, handleSubmit, reset } = useForm<UpdateDynamicContentVariantData>();

  useEffect(() => {
    if (variant) {
      reset({
        active: variant.active,
        content: variant.content,
      });
    } else {
      reset();
    }
  }, [variant]);

  const $form = useRef<FormInstance>(null!);

  const queryClient = useQueryClient();
  const { mutate, isLoading } = useUpdateDynamicContentVariant({
    onSuccess: () => {
      message.success('已保存');
      queryClient.invalidateQueries(['dynamicContentVariants', dc.id]);
      onHide();
    },
  });

  return (
    <Modal
      destroyOnClose
      title="编辑变量"
      visible={variant !== undefined}
      onCancel={() => !isLoading && onHide()}
      cancelButtonProps={{ disabled: isLoading }}
      onOk={() => $form.current.submit()}
      okButtonProps={{ loading: isLoading }}
      width="80%"
    >
      <Form
        ref={$form}
        layout="vertical"
        onFinish={handleSubmit((data) =>
          mutate({ ...data, dynamicContentId: dc.id, variantId: variant!.id })
        )}
      >
        <Controller
          control={control}
          name="active"
          defaultValue={true}
          render={({ field }) => (
            <Form.Item label="状态">
              <Radio.Group {...field} disabled={dc.defaultLocale === variant?.locale}>
                <Radio value={true}>活跃的</Radio>
                <Radio value={false}>非活跃的</Radio>
              </Radio.Group>
            </Form.Item>
          )}
        />

        <Controller
          control={control}
          name="content"
          rules={{ required: '请填写内容' }}
          render={({ field, fieldState: { error } }) => (
            <Form.Item
              label="内容"
              htmlFor="dc_form_content"
              extra="动态内容的文本。您也可以在您的文本中使用占位符。"
              required
              validateStatus={error ? 'error' : undefined}
              help={error?.message}
            >
              <TextArea {...field} id="dc_form_content" rows={10} />
            </Form.Item>
          )}
        />
      </Form>
    </Modal>
  );
}

export function DynamicContentDetail() {
  const { id } = useParams<'id'>();

  const { data: dc, isLoading } = useDynamicContent(id!);

  const { data: variants } = useDynamicContentVariants(id!);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addVariantModalVisible, setAddVariantModalVisible] = useState(false);
  const [editingVariant, setEditingVariant] = useState<DynamicContentVariantSchema>();

  const locales = useMemo(() => variants?.map((v) => v.locale), [variants]);
  const activeLocales = useMemo(() => variants?.filter((v) => v.active).map((v) => v.locale), [
    variants,
  ]);

  const queryClient = useQueryClient();
  const { mutate: remove, isLoading: removing } = useDeleteDynamicContentVariant({
    onSuccess: () => {
      message.success('已删除');
      queryClient.invalidateQueries(['dynamicContentVariants', id]);
    },
  });

  const handleRemove = (variantId: string) => {
    Modal.confirm({
      title: '删除变量',
      content: '该操作不可恢复',
      okType: 'danger',
      onOk: () => remove([id!, variantId]),
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <Spin />
      </div>
    );
  }

  if (!dc) {
    return null;
  }

  return (
    <div className="p-10">
      <div className="flex">
        <div className="grow">
          <Breadcrumb>
            <Breadcrumb.Item>
              <Link to="..">动态内容</Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item>{dc.name}</Breadcrumb.Item>
          </Breadcrumb>

          <div className="mt-2">占位符：{`{{ dc.${dc.name} }}`}</div>
        </div>

        <div>
          <Button
            type="link"
            onClick={() => setEditModalVisible(true)}
            style={{ padding: 0, border: 'none', height: 22 }}
          >
            编辑
          </Button>
        </div>
      </div>

      <EditDynamicContentModal
        visible={editModalVisible}
        onHide={() => setEditModalVisible(false)}
        dc={dc}
        locales={activeLocales}
      />

      <AddVariantModal
        visible={addVariantModalVisible}
        onHide={() => setAddVariantModalVisible(false)}
        excludeLocales={locales}
        dynamicContentId={dc.id}
      />

      <EditVariantModal
        dc={dc}
        variant={editingVariant}
        onHide={() => setEditingVariant(undefined)}
      />

      <Divider />

      <div className="flex flex-row-reverse mb-4">
        <Button
          type="link"
          onClick={() => setAddVariantModalVisible(true)}
          style={{ padding: 0, border: 'none', height: 22 }}
        >
          添加变量
        </Button>
      </div>

      <Table rowKey="id" dataSource={variants} pagination={false}>
        <Column
          dataIndex="locale"
          title="语言"
          render={(locale) => (
            <>
              <span>{LOCALES[locale] ?? 'unknown'}</span>
              {locale === dc.defaultLocale && <span className="font-semibold">（默认）</span>}
            </>
          )}
        />

        <Column dataIndex="content" title="内容" />

        <Column
          dataIndex="active"
          title="状态"
          render={(active) => (active ? '活跃的' : '非活跃的')}
        />

        <Column
          key="actions"
          render={(variant) => (
            <div>
              <Button
                type="link"
                onClick={() => setEditingVariant(variant)}
                style={{ padding: 0, border: 'none', height: 22 }}
              >
                编辑
              </Button>
              <Button
                className="ml-2"
                type="link"
                danger
                disabled={variant.locale === dc.defaultLocale || removing}
                onClick={() => handleRemove(variant.id)}
                style={{ padding: 0, border: 'none', height: 22 }}
              >
                删除
              </Button>
            </div>
          )}
        />
      </Table>
    </div>
  );
}
