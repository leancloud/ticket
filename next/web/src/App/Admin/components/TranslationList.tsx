import { LOCALES } from '@/i18n/locales';
import { List, Button } from 'antd';
import { useState, useMemo, ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LocaleModal } from './LocaleModal';

interface TranslationListProps<T extends { language: string }> {
  data?: T[];
  header?: string;
  loading?: boolean;
  title?: (item: T) => ReactNode;
  action?: (item: T) => ReactNode | ReactNode[];
  defaultLanguage?: string;
  onChangeDefault?: (item: T) => void;
  changeDefaultLoading?: boolean;
}

export const TranslationList = <T extends { language: string }>({
  data,
  header,
  loading,
  title,
  action,
  defaultLanguage,
  onChangeDefault,
  changeDefaultLoading,
}: TranslationListProps<T>) => {
  const navigate = useNavigate();

  const [show, setShow] = useState(false);

  const existLanguages = useMemo(() => data?.map(({ language }) => language) ?? [], [data]);

  return (
    <>
      <List
        header={header ?? '翻译'}
        dataSource={data}
        loading={loading}
        footer={
          existLanguages.length < Object.keys(LOCALES).length ? (
            <Button type="text" onClick={() => setShow(true)} block>
              添加翻译
            </Button>
          ) : null
        }
        renderItem={(item) => (
          <List.Item className="flex flex-row justify-between items-center w-full">
            <Link to={item.language} className="grow-0 shrink">
              {title ? title(item) : LOCALES[item.language]}
            </Link>

            <div className="flex flex-row items-center justify-end space-x-4 basis-4/6 shrink-0">
              {action ? (
                action(item)
              ) : (
                <Button
                  onClick={() => {
                    onChangeDefault?.(item);
                  }}
                  loading={changeDefaultLoading}
                  disabled={defaultLanguage === item.language}
                  size="small"
                >
                  {defaultLanguage === item.language ? '已是默认' : '设为默认'}
                </Button>
              )}
            </div>
          </List.Item>
        )}
      />
      <LocaleModal
        show={show}
        hiddenLocales={existLanguages}
        onOk={(locale) => navigate(`${locale}/new`)}
        onCancel={() => setShow(false)}
      />
    </>
  );
};
