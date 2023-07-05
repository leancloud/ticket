import { ClassifyResult, useClassifyTicket } from '@/api/category';
import { PageContent } from '@/components/Page';
import { EditableIcon } from '@/icons/EditableIcon';
import { useRootCategory } from '@/states/root-category';
import { useState, useCallback, ChangeEventHandler, ComponentPropsWithoutRef, memo } from 'react';
import { useTranslation } from 'react-i18next';
import cx from 'classnames';
import LoadingIcon from '@/icons/LoadingIcon.png';
import { DoneIcon } from '@/icons/Done';
import { Link } from 'react-router-dom';
import { FailedIcon } from '@/icons/FailedIcon';
import { useSetContent } from '@/states/content';
import { Button } from '@/components/Button';

const MaxLength = 100;

interface InputProps {
  onSubmit?: (value: string) => void;
}

const Input = memo(
  ({
    onSubmit,
    className,
    ...props
  }: InputProps & Omit<ComponentPropsWithoutRef<'div'>, keyof InputProps>) => {
    const { t } = useTranslation();

    const [value, setValue] = useState('');
    const [editable, setEditable] = useState(true);

    const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>((e) => {
      setValue(e.target.value);
    }, []);

    const handleSubmit = useCallback(() => {
      setEditable(false);
      onSubmit?.(value);
    }, [value]);

    const handleEdit = useCallback(() => {
      setEditable(true);
    }, []);

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
                下一步
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
  }
);

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

const Result = memo(({ data }: { data?: ClassifyResult }) => {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex flex-row items-center">
        <span className="mr-[0.375rem]">
          {data?.status === 'success' ? <DoneIcon /> : <FailedIcon />}
        </span>
        <span className="text-[#222222]">
          {data?.status === 'success'
            ? `${t('category.classify.result.title')}「${data.data.name}」`
            : t('category.classify.result.failed')}
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
  const setContent = useSetContent();

  const { data, mutate: classify, isLoading, isError } = useClassifyTicket({
    onError: console.error,
  });

  const handleSubmit = useCallback(
    (content: string) => {
      classify({ categoryId: category.id, content });
      setContent(content);
    },
    [classify, category, setContent]
  );

  return (
    <PageContent className={className} shadow>
      <Input onSubmit={handleSubmit} />
      {(data || isLoading || isError) && (
        <div
          className={cx(
            'px-4 py-3 bg-gradient-to-b from-[#F2FDFE] to-[#F2FDFE]/[0.2] rounded-2xl mt-[0.62rem]',
            className
          )}
        >
          {isLoading ? <Loading /> : <Result data={data} />}
        </div>
      )}
    </PageContent>
  );
};
