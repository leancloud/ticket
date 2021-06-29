import { useEffect, useRef, useState } from 'react';
import { Link, Redirect } from 'react-router-dom';
import classNames from 'classnames';
import { CheckCircleIcon } from '@heroicons/react/solid';

import { useSearchParams } from 'utils/url';
import { useAlert } from 'utils/useAlert';
import { Page } from 'components/Page';
import { Button } from 'components/Button';
import { Uploader } from 'components/Uploader';
import { QueryWrapper } from 'components/QueryWrapper';
import { useCategory } from '../../Categories';
import { FormGroup, useForm } from './Form';

interface TicketFormProps {
  onCommit: () => void;
}

function TicketForm({ onCommit }: TicketFormProps) {
  const { element: formElement, validate, data: formData } = useForm({
    template: [
      {
        name: 'title',
        title: '标题',
        type: 'text',
        required: true,
      },
      {
        name: 'uid',
        title: '账号ID',
        type: 'text',
      },
      {
        name: 'content',
        title: '描述',
        type: 'multi-line',
        rows: 4,
        maxLength: 100,
        required: true,
      },
    ],
  });
  const { element: alertElement, alert } = useAlert();

  const handleUpload = () => {
    alert({ title: '上传失败', content: '附件大小不能超过 1 GB' });
  };

  console.log(formData);

  return (
    <div className="px-8 py-6">
      {alertElement}
      {formElement}
      <FormGroup controlId="ticket_file" title="附件">
        <Uploader
          defaultFiles={[
            { name: '附件有个很长的名称.png' },
            { name: '附件.png' },
            { name: '附件有个很长的名称.png', progress: 80 },
          ]}
          onUpload={handleUpload}
        />
      </FormGroup>
      <Button className="ml-20 px-11" onClick={validate}>
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
    <div className="flex flex-col items-center">
      <CheckCircleIcon className="w-12 h-12 m-8 text-tapBlue-600" />
      <div className="text-gray-500 mb-4">提交成功，我们将尽快为您处理</div>
      <Button className="px-12" as={Link} to="/home">
        问题详情
      </Button>
    </div>
  );
}

export function NewTicket() {
  const { category_id } = useSearchParams();
  const result = useCategory(category_id);
  const [ticketId, setTicketId] = useState<string>();
  const { element: formElement, validate } = useForm({
    template: [
      {
        name: 'title',
        title: '标题',
        type: 'text',
        required: true,
      },
      {
        name: 'uid',
        title: '账号ID',
        type: 'text',
      },
      {
        name: 'content',
        title: '描述',
        type: 'multi-line',
        rows: 4,
        maxLength: 100,
        required: true,
      },
    ],
  });

  const handleCommit = () => {
    setTicketId('114514');
  };

  if (!result.data && !result.isLoading && !result.error) {
    // Category is not exists :badbad:
    return <Redirect to="/home" />;
  }
  return (
    <Page title={result.data?.name}>
      <QueryWrapper result={result}>
        {ticketId ? <Success ticketId={ticketId} /> : <TicketForm onCommit={handleCommit} />}
      </QueryWrapper>
    </Page>
  );
}
