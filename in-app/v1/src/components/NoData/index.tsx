import { useTranslation } from 'react-i18next';

import { Center } from '../Center';

export interface NoDataProps {
  message?: string;
}

export function NoData({ message }: NoDataProps) {
  const { t } = useTranslation();

  return (
    <Center>
      <div className="text-gray-300">{message || t('general.no_data')}</div>
    </Center>
  );
}
