import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface NoDataProps {
  message?: string | ReactNode;
}

export function NoData({ message }: NoDataProps) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto min-h-[10em] text-center flex flex-col justify-center text-gray-300">
      {message || t('general.no_data')}
    </div>
  );
}
