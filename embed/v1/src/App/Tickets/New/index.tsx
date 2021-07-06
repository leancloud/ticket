import { useState } from 'react';
import { Link, Redirect } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/solid';
import { useMutation } from 'react-query';

import { useSearchParams } from 'utils/url';
import { useAlert } from 'utils/useAlert';
import { Page } from 'components/Page';
import { Button } from 'components/Button';
import { Uploader } from 'components/Uploader';
import { QueryWrapper } from 'components/QueryWrapper';
import { useCategory } from '../../Categories';
import { FieldTemplate, FormGroup, useForm } from './Form';
import { useUpload } from './useUpload';
import { http } from 'leancloud';

const PRESET_FORM_FIELDS: FieldTemplate[] = [
  {
    name: 'title',
    title: '标题',
    type: 'text',
    required: true,
  },
  {
    name: 'content',
    title: '描述',
    type: 'multi-line',
    rows: 4,
    maxLength: 100,
    required: true,
  },
];

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GB

interface NewTicketData {
  category_id: string;
  title: string;
  content: string;
  file_ids: string[];
}

interface TicketFormProps {
  categoryId: string;
  onCommit: (data: NewTicketData) => any | Promise<any>;
}

function TicketForm({ categoryId, onCommit }: TicketFormProps) {
  const { element: formElement, validate, data: formData } = useForm(PRESET_FORM_FIELDS);
  const { element: alertElement, alert } = useAlert();
  const { files, upload, remove, isUploading } = useUpload();
  const [isCommitting, setIsCommitting] = useState(false);

  const handleUpload = (files: FileList) => {
    if (!files.length) {
      return;
    }
    const file = files[0];
    if (file.size > MAX_FILE_SIZE) {
      alert({ title: '上传失败', content: '附件大小不能超过 1 GB' });
      return;
    }
    upload(file);
  };

  const handleCommit = async () => {
    if (!validate()) {
      return;
    }
    if (isUploading) {
      alert({ title: '提交失败', content: '请等待全部文件上传完毕' });
      return;
    }
    const data = {
      category_id: categoryId,
      title: formData.title as string,
      content: formData.content as string,
      file_ids: files.map((file) => file.id!),
    };
    try {
      setIsCommitting(true);
      await onCommit(data);
    } catch {
      setIsCommitting(false);
    }
  };

  return (
    <div className="p-4 sm:px-8 sm:py-6">
      {alertElement}
      {formElement}
      <FormGroup controlId="ticket_file" title="附件">
        <Uploader
          files={files}
          onUpload={handleUpload}
          onDelete={({ key }) => remove(key as number)}
        />
      </FormGroup>
      <Button
        className="sm:ml-20 w-full sm:max-w-max sm:px-11"
        disabled={isCommitting}
        onClick={handleCommit}
      >
        提 交
      </Button>
    </div>
  );
}

interface SuccessProps {
  ticketId: string;
}

function Success({ ticketId }: SuccessProps) {
  return (
    <div className="flex flex-col justify-center items-center h-full">
      <CheckCircleIcon className="w-12 h-12 text-tapBlue-600" />
      <div className="text-gray-500 mt-8">提交成功，我们将尽快为您处理</div>
      <Button className="mt-4 px-12" as={Link} to={`/tickets/${ticketId}`}>
        问题详情
      </Button>
    </div>
  );
}

async function commitTicket(data: NewTicketData): Promise<string> {
  const {
    data: { id },
  } = await http.post<{ id: string }>('/api/1/tickets', data);
  return id;
}

export function NewTicket() {
  const { category_id } = useSearchParams();
  const result = useCategory(category_id);
  const [ticketId, setTicketId] = useState<string>();

  const { mutateAsync: commit } = useMutation({
    mutationFn: commitTicket,
    onSuccess: setTicketId,
    onError: (error: Error) => alert(error.message),
  });

  if (!result.data && !result.isLoading && !result.error) {
    // Category is not exists :badbad:
    return <Redirect to="/home" />;
  }
  return (
    <Page title={result.data?.name}>
      <QueryWrapper result={result}>
        {ticketId ? (
          <Success ticketId={ticketId} />
        ) : (
          <TicketForm categoryId={category_id} onCommit={commit} />
        )}
      </QueryWrapper>
    </Page>
  );
}
