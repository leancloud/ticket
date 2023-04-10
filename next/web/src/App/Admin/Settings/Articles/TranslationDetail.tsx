import { useArticleTranslation, useDeleteArticleTranslation } from '@/api/article';
import { message, Spin, Empty, Breadcrumb, Dropdown, Menu, Typography, Divider } from 'antd';
import { FC } from 'react';
import { useQueryClient } from 'react-query';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ToggleTranslationPrivateButton } from './components/TogglePrivateButton';
import { LOCALES } from '@/i18n/locales';
import { useState } from 'react';

export const ArticleTranslationDetail: FC = () => {
  const navigate = useNavigate();
  const { id, language } = useParams();

  const [productId, setProductId] = useState<string | undefined>();

  const { data: translation, isLoading } = useArticleTranslation(id!, language!, {
    staleTime: 1000 * 60,
  });

  const queryClient = useQueryClient();
  const { mutate: deleteTranslation } = useDeleteArticleTranslation({
    onSuccess: () => {
      message.success('已删除');
      navigate('..');
      queryClient.invalidateQueries('articles');
      queryClient.invalidateQueries(['article', id]);
    },
    onError: (error: Error) => {
      console.error(error);
      message.error(`删除失败：${error.message}`);
    },
  });

  if (isLoading) {
    return <div className="h-80 my-40 text-center" children={<Spin />} />;
  }

  if (!translation) {
    return <Empty description="没有找到该文章" />;
  }

  return (
    <div className="p-10">
      <div className="flex justify-center mb-1">
        <Breadcrumb className="grow">
          <Breadcrumb.Item>
            <Link to="../../..">文章</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="../..">{translation.id}</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item className="text-gray-300">
            {LOCALES[translation.language]}
          </Breadcrumb.Item>
        </Breadcrumb>
        <div>
          <ToggleTranslationPrivateButton size="small" translation={translation} />{' '}
          <Dropdown.Button
            size="small"
            onClick={() => navigate('edit')}
            overlay={
              <Menu>
                <Menu.Item key="0">
                  <Link to="./revisions">历史</Link>
                </Menu.Item>
                {translation.private && (
                  <>
                    <Menu.Divider />
                    <Menu.Item
                      key="1"
                      danger
                      onClick={() => deleteTranslation({ id: id!, language: language! })}
                    >
                      删除
                    </Menu.Item>
                  </>
                )}
              </Menu>
            }
          >
            编辑
          </Dropdown.Button>
        </div>
      </div>
      <Typography.Title level={2}>{translation.title}</Typography.Title>

      {translation && (
        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: translation.contentSafeHTML }}
        />
      )}
      <div className=" mt-7">
        <span className="text-gray-400">
          创建于 {new Date(translation.createdAt).toLocaleString()} 更新于{' '}
          {new Date(translation.updatedAt).toLocaleString()}
        </span>
      </div>
    </div>
  );
};
