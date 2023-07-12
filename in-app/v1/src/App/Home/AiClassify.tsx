import { PageContent } from '@/components/Page';
import { EditableIcon } from '@/icons/EditableIcon';
import { useRootCategory } from '@/states/root-category';
import {
  useState,
  useCallback,
  ChangeEventHandler,
  ComponentPropsWithoutRef,
  memo,
  KeyboardEventHandler,
} from 'react';
import { useTranslation } from 'react-i18next';
import cx from 'classnames';
import LoadingIcon from '@/icons/LoadingIcon.png';
import { DoneIcon } from '@/icons/Done';
import { Link } from 'react-router-dom';
import { FailedIcon } from '@/icons/FailedIcon';
import {
  useSetContent,
  useClassifyCategoryLoadable,
  useContent,
  useClassifyCategory,
} from '@/states/content';
import { Button } from '@/components/Button';
import { CategoryPath } from '@/components/CategoryPath';

const MaxLength = 150;

const Input = memo(({ className, ...props }: ComponentPropsWithoutRef<'div'>) => {
  const { t } = useTranslation();

  const content = useContent();
  const setContent = useSetContent();

  const [value, setValue] = useState(content ?? '');
  const [editable, setEditable] = useState(!content);

  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>((e) => {
    setValue(e.target.value);
  }, []);

  const handleSubmit = useCallback(() => {
    setEditable(false);
    setContent(value);
  }, [value, setContent]);

  const handleEdit = useCallback(() => {
    setEditable(true);
  }, []);

  const handlePressEnter = useCallback<KeyboardEventHandler<HTMLInputElement>>(
    (e) => {
      if (e.key === 'Enter') {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <>
      <div className="flex flex-row justify-between">
        <h2 className="font-bold">{t('category.classify.title')}</h2>
        {editable && (
          <span className={cx(value.length > MaxLength ? 'text-red' : 'text-[#B9BEC1]')}>
            {value.length}/{MaxLength}
          </span>
        )}
      </div>
      <div
        className={cx(
          'mt-3',
          'rounded-2xl',
          'bg-black/[0.02]',
          'py-3',
          'px-4',
          'flex',
          'flex-row',
          'justify-between',
          'items-center',
          !editable && 'w-fit',
          className
        )}
        {...props}
      >
        {editable ? (
          <>
            <input
              className="placeholder:text-[#BFBFBF] bg-transparent flex-grow"
              onChange={handleChange}
              onKeyPress={handlePressEnter}
              value={value}
              placeholder={t('category.classify.placeholder')}
            />
            <Button
              onClick={handleSubmit}
              disabled={!value.length || value.length > MaxLength}
              className={cx(
                value.length > MaxLength
                  ? 'text-red'
                  : value.length
                  ? 'text-tapBlue'
                  : 'text-[#888888]',
                'transition-colors',
                'rounded-[15px]',
                'h-[1.875rem]',
                'flex',
                'items-center'
              )}
            >
              {t('general.next_step')}
            </Button>
          </>
        ) : (
          <>
            <span>{value}</span>
            <button className="text-tapBlue ml-2 h-[1.875rem]" onClick={handleEdit}>
              <EditableIcon />
            </button>
          </>
        )}
      </div>
    </>
  );
});

const Loading = memo(() => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-row items-center">
      <span className="mr-2 animate-spin">
        <img src={LoadingIcon} />
      </span>
      <span className="text-[#666666]">{t('category.classify.loading')}</span>
    </div>
  );
});

const Result = memo(({ categoryId }: { categoryId: string }) => {
  const { t } = useTranslation();

  const data = useClassifyCategory(categoryId);

  return (
    <div>
      <div className="flex flex-row items-center">
        <span className="mr-[0.375rem]">
          {data?.status === 'success' ? <DoneIcon /> : <FailedIcon />}
        </span>
        <span className="text-[#222222]">
          {data?.status === 'success' ? (
            <>
              {t('category.classify.result.title')} <CategoryPath categoryId={data.data.id} />
            </>
          ) : (
            t('category.classify.result.failed')
          )}
        </span>
      </div>
      {data?.status === 'success' && (
        <Link
          className="border-[0.5px] border-solid border-transparent rounded-2xl w-full text-tapBlue font-bold py-2 mt-3 block text-center before:mr-2"
          style={{
            backgroundImage:
              'linear-gradient(#fff, #fff), linear-gradient(to left, #15CCCE, #004BBC)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
          to={`categories/${data.data.id}`}
        >
          {t('category.classify.result.solution')}
        </Link>
      )}

      <div className="text-center text-gray-400 opacity-80 mt-5 mb-2">
        {t('topic.hint')}{' '}
        <Link to="/categories" className="text-tapBlue">
          {t('category.classify.result.select')}
        </Link>
      </div>
    </div>
  );
});

export const AiClassify = ({ className }: { className?: string }) => {
  const category = useRootCategory();

  const data = useClassifyCategoryLoadable(category.id);

  return (
    <PageContent className={className} shadow>
      <Input />
      {(data.state === 'loading' || data.state === 'hasError' || data.getValue()) && (
        <div
          className={cx(
            'px-4 py-3 bg-gradient-to-b from-[#F2FDFE] to-[#F2FDFE]/[0.2] rounded-2xl mt-[0.62rem]',
            className
          )}
        >
          {data.state === 'loading' ? <Loading /> : <Result categoryId={category.id} />}
        </div>
      )}
    </PageContent>
  );
};
