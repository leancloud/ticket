import { Tag } from '@/components/antd';

export interface ArticleStatusProps {
  article: { private: boolean };
  privateText?: string;
  publicText?: string;
}

export const ArticleStatus = ({
  article,
  privateText = '未发布',
  publicText = '已发布',
}: ArticleStatusProps) => {
  return (
    <>
      <Tag color={article.private ? undefined : 'green'} className="scale-110">
        {article.private ? privateText : publicText}
      </Tag>
    </>
  );
};
