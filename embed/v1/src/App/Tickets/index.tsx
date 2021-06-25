import { useEffect, useRef, useState } from 'react';
import { Redirect } from 'react-router-dom';
import classNames from 'classnames';

import { Page } from 'components/Page';
import { QueryWrapper } from 'components/QueryWrapper';
import { Input, Textarea } from 'components/Form';
import { Uploader } from 'components/Uploader';
import { Button } from 'components/Button';
import { useSearchParams } from 'utils/url';
import { useAlert } from 'utils/useAlert';
import { useCategory } from '../Categories';

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

function TicketForm() {
  const [description, setDescription] = useState('');
  const { element: alertElement, alert } = useAlert();

  const handleUpload = () => {
    alert({ title: '上传失败', content: '附件大小不能超过 1 GB' });
  };

  return (
    <div className="px-8 py-6">
      {alertElement}
      <FormGroup controlId="ticket_title" title="标题">
        <Input placeholder="请输入标题" />
      </FormGroup>
      <FormGroup controlId="ticket_uid" title="账号ID">
        <Input placeholder="请输入正确的账号ID" />
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
        <Uploader onUpload={handleUpload} />
      </FormGroup>
      <FormGroup>
        <Button>提 交</Button>
      </FormGroup>
    </div>
  );
}

export default function Tickets() {
  const { category_id } = useSearchParams();
  const result = useCategory(category_id);

  if (!result.data && !result.isLoading && !result.error) {
    // Category is not exists :badbad:
    return <Redirect to="/home" />;
  }
  return (
    <Page title={result.data?.name}>
      <QueryWrapper result={result}>{(category) => <TicketForm />}</QueryWrapper>
    </Page>
  );
}
