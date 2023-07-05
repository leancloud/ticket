import { useClassifyTicket } from '@/api/category';
import { Input } from 'antd';
import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';

export const AiClassifyTest = () => {
  const { id } = useParams<'id'>();

  const { data, mutate: classify, isLoading, isError } = useClassifyTicket();

  const handleSubmit = useCallback(
    (v: string) => {
      id && classify({ categoryId: id, content: v });
    },
    [id, classify]
  );

  return (
    <div>
      <Input.Search
        placeholder="输入内容来测试 AI  分类"
        onSearch={handleSubmit}
        loading={isLoading}
      />
      <div className="mt-2">
        {(data || isLoading || isError) &&
          (isLoading ? (
            '分类中……'
          ) : data?.status === 'success' ? (
            <>
              结果为：
              <Link to={`../${data.data.id}`} target="_blank" rel="noopener noreferrer">
                {data.data.name}
              </Link>
            </>
          ) : (
            <>分类失败了</>
          ))}
      </div>
    </div>
  );
};
