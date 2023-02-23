import { Tag } from '@/components/antd';

export const ArticleStatus = ({ article }: { article: { private: boolean } }) => {
  return (
    <>
      <Tag color={article.private ? undefined : 'green'} className="scale-110">
        {article.private ? '未发布' : '已发布'}
      </Tag>
    </>
  );
};
