import { useMemo, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'react-query';
import { pick, cloneDeep } from 'lodash-es';
import { AiFillCheckCircle } from 'react-icons/ai';
import { http } from '@/leancloud';
import { Modal, Button, ModalProps, message } from '@/components/antd';
import { FieldItem, useTicketFormItems } from '@/api/ticket-form';
import { Category } from '@/api/category';
import { useTicketInfo } from '@/states/ticket-info';
import { Loading } from '@/components/Loading';
import { CustomForm, CustomFieldConfig, CustomFormItem } from './CustomForm';
import { usePersistFormData } from './usePersistFormData';
import { useContent } from '@/states/content';

const DEFAULT_FIELDS: CustomFieldConfig[] = [
  {
    id: 'title',
    type: 'text',
    title: 'title',
    required: true,
  },
  {
    id: 'description',
    type: 'multi-line',
    title: 'description',
    required: true,
  },
];

interface NewTicketData {
  categoryId: string;
  title: string;
  content: string;
  fileIds?: string[];
  customFields?: {
    field: string;
    value: string | string[];
  }[];
  tags?: {
    key: string;
    value: string;
  }[];
  metaData?: Record<string, any>;
}

interface TicketFormProps {
  category: Category;
  onSubmit: (data: NewTicketData) => Promise<any>;
  submitting?: boolean;
}

const FORM_ID = 'new_ticket';

function TicketForm({ category, onSubmit, submitting }: TicketFormProps & { showTitle?: boolean }) {
  const { t } = useTranslation();
  const { meta, fields: presetFieldValues } = useTicketInfo();

  const result = useTicketFormItems(category.formId!, {
    enabled: category.formId !== undefined,
    staleTime: 1000 * 60 * 5,
  });

  const { data: formItems, isLoading: loadingFormItems } = result;

  const items = useMemo<CustomFormItem[]>(() => {
    if (!category.formId) {
      return DEFAULT_FIELDS.map((field) => ({ type: 'field', data: field }));
    }
    return formItems ?? [];
  }, [category.formId, formItems]);

  const fields = useMemo(() => {
    const fieldItems = items.filter((item) => item.type === 'field') as FieldItem[];
    return fieldItems.map((item) => item.data);
  }, [items]);

  const { initData, onChange, clear } = usePersistFormData(category.id);

  const contentValueFromClassify = useContent();

  const defaultValues = useMemo(() => {
    const defaultValues = {
      ...cloneDeep(presetFieldValues ?? {}),
      description: contentValueFromClassify,
      title: contentValueFromClassify,
    };

    if (initData && fields) {
      // 目前无法根据文件 id 恢复文件字段的状态, 所以排除文件字段
      const ids = fields.filter((f) => f.type !== 'file').map((f) => f.id);
      Object.assign(defaultValues, pick(initData, ids));
    }
    return defaultValues;
  }, [presetFieldValues, initData, fields, contentValueFromClassify]);

  const handleSubmit = (data: Record<string, any>) => {
    const { title, description, ...fieldValues } = data;
    onSubmit({
      categoryId: category.id,
      title: title,
      content: description,
      customFields: Object.entries(fieldValues).map(([id, value]) => ({ field: id, value })),
      metaData: meta ?? undefined,
    }).then(clear);
  };

  if (loadingFormItems) {
    return <Loading />;
  }

  return (
    <>
      <CustomForm
        items={items}
        defaultValues={defaultValues}
        onChange={onChange}
        onSubmit={handleSubmit}
        submitting={submitting}
        formId={FORM_ID}
      />
    </>
  );
}

async function createTicket(data: NewTicketData): Promise<string> {
  const res = await http.post<{ id: string }>('/api/2/tickets', data, {
    params: {
      storeUnknownField: 1,
    },
  });
  return res.data.id;
}

const Success = ({ ticketId }: { ticketId: string }) => {
  const { t } = useTranslation();

  return (
    <div className="text-center">
      <AiFillCheckCircle className="inline text-[50px] text-auxiliary" />
      <div className="mt-8 mb-4 text-lg">{t('ticket.create.success_text')}</div>
      <Link to={`/tickets/${ticketId}`}>
        <Button type="primary">{t('ticket.detail')}</Button>
      </Link>
    </div>
  );
};

export function NewTicketModal({
  category,
  open,
  close,
}: {
  category: Category;
  open: boolean;
  close: () => void;
}) {
  const { t } = useTranslation();
  const [ticketId, setTicketId] = useState('');

  useEffect(() => {
    setTicketId('');
  }, [open]);

  const { mutateAsync: submit, isLoading: submitting } = useMutation({
    mutationFn: createTicket,
    onSuccess: (ticketId: string) => {
      setTicketId(ticketId);
    },
  });

  return (
    <Modal
      onCancel={close}
      open={open}
      width={'70%'}
      title={<div className="text-xl">{category.name}</div>}
      footer={[
        <Button key="close" onClick={close} disabled={submitting}>
          {t('general.close')}
        </Button>,
        !ticketId && (
          <Button
            key="comfirm"
            form={FORM_ID}
            type="primary"
            htmlType="submit"
            disabled={submitting}
            loading={submitting}
          >
            {t('general.confirm')}
          </Button>
        ),
      ]}
    >
      {ticketId ? (
        <Success ticketId={ticketId} />
      ) : (
        <TicketForm category={category} onSubmit={submit} submitting={submitting} />
      )}
    </Modal>
  );
}
