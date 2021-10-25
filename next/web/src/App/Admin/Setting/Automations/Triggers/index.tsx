import { Button } from 'antd';
import { AiOutlineSetting } from 'react-icons/ai';
import { Link, RouteComponentProps } from 'react-router-dom';

export default function CreateTriggers({ match: { path } }: RouteComponentProps) {
  return (
    <>
      <div className="flex my-4">
        <div className="flex-grow leading-8 text-[#475867]">
          <button className="inline-flex items-center">
            正在执行 所有匹配的规则
            <AiOutlineSetting className="inline-block w-4 h-4 ml-1" />
          </button>
        </div>
        <Link to={`${path}/new`}>
          <Button type="primary">新规则</Button>
        </Link>
      </div>
    </>
  );
}
