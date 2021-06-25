import { useCallback, useState } from 'react';

import { Alert, AlertProps } from '../components/Alert';

export interface AlertFuncParam {
  title: string;
  content: string;
  buttonTitle?: string;
}

export function useAlert() {
  const [props, setProps] = useState<AlertProps>({
    show: false,
    title: '',
    content: '',
    onClose: () => setProps((current) => ({ ...current, show: false })),
  });

  const element = <Alert {...props} />;

  const alert = useCallback((param: AlertFuncParam) => {
    setProps((current) => ({ ...current, ...param, show: true }));
  }, []);

  return { element, alert };
}
