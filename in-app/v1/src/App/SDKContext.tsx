import { createContext, useContext, useEffect, useMemo, useState, FC } from 'react';
import { DiviceInfo, isInit, loadComplete, onDeviceStatusChange, getDeviceInfo } from '@/utils/sdk';

type Info = { isInit: boolean } & Partial<DiviceInfo>;

const defaultInfo = {
  isInit,
};

const SDKContext = createContext<Info>(defaultInfo);

const paresValue = (info: DiviceInfo) => ({ ...info, isInit });

export const SDKProvider: FC = ({ children }) => {
  const [value, setValue] = useState<Info>(defaultInfo);

  // call sdk initial event
  useEffect(() => {
    if (isInit) {
      loadComplete();
      getDeviceInfo()
        .then((res) => {
          setValue(paresValue(res));
        })
        .catch((error) => {
          console.log(error);
        });
    }
  }, []);

  // register event
  useEffect(() => {
    if (isInit) {
      onDeviceStatusChange((data) => setValue(paresValue(data)));
    }
  }, []);

  return <SDKContext.Provider value={value}>{children}</SDKContext.Provider>;
};

export const useSDKInfo = () => {
  const info = useContext(SDKContext);

  return [info];
};
