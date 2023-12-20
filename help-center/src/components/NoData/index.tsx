import classNames from 'classnames';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { TbMoodEmpty } from 'react-icons/tb';

export interface NoDataProps {
  message?: string | ReactNode;
  className?: string;
}

export function NoData({ message, className }: NoDataProps) {
  const { t } = useTranslation();

  return (
    <div
      className={classNames(
        'mx-auto min-h-[10em] text-center flex flex-col justify-center items-center text-gray-300',
        className
      )}
    >
      <TbMoodEmpty className="text-[80px]" />
      <div className="mt-4 text-lg">{message || t('general.no_data')}</div>
    </div>
  );
}
