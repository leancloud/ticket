import { useEffect, useRef, useState } from 'react';
import { Link, Redirect } from 'react-router-dom';
import classNames from 'classnames';
import { CheckCircleIcon } from '@heroicons/react/solid';

import { useSearchParams } from 'utils/url';
import { useAlert } from 'utils/useAlert';
import { Page } from 'components/Page';
import { Button } from 'components/Button';
import { Input, Textarea } from 'components/Form';
import { Uploader } from 'components/Uploader';
import { QueryWrapper } from 'components/QueryWrapper';
import { useCategory } from '../../Categories';

type DivProps = JSX.IntrinsicElements['div'];

export interface FromGroupProps extends DivProps {
  title?: string;
  controlId?: string;
}

function FormGroup({ title, controlId, children, ...props }: FromGroupProps) {
  const $container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (controlId && $container.current) {
      const input = $container.current.querySelector('input');
      if (input) {
        input.id = controlId;
      }
    }
  }, [controlId]);

  return (
    <div {...props} className={classNames(props.className, 'flex mb-5')} ref={$container}>
      <label className="w-20 mt-1.5 flex-shrink-0" htmlFor={controlId}>
        {title}
      </label>
      <div className="flex-grow">{children}</div>
    </div>
  );
}

interface TicketFormProps {
  onCommit: () => void;
}

function TicketForm({ onCommit }: TicketFormProps) {
  const [description, setDescription] = useState('');
  const { element: alertElement, alert } = useAlert();

  const handleUpload = () => {
    alert({ title: '上传失败', content: '附件大小不能超过 1 GB' });
  };

  return (
    <div className="px-8 py-6">
      {alertElement}
      <FormGroup controlId="ticket_title" title="标题">
        <Input className="w-full" placeholder="请输入标题" />
      </FormGroup>
      <FormGroup controlId="ticket_uid" title="账号ID">
        <Input className="w-full" placeholder="请输入正确的账号ID" />
      </FormGroup>
      <FormGroup controlId="ticket_desc" title="描述">
        <Textarea
          rows={3}
          placeholder="补充说明（非必填）"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 100))}
        />
        <div className="text-right text-xs text-gray-400">{description.length}/100</div>
      </FormGroup>
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
      <FormGroup>
        <Button className="px-12" onClick={onCommit}>
          提 交
        </Button>
      </FormGroup>
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
        {(category) =>
          ticketId ? <Success ticketId={ticketId} /> : <TicketForm onCommit={handleCommit} />
        }
      </QueryWrapper>
    </Page>
  );
}
