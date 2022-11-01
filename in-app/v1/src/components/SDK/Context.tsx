import { createContext, useContext, useEffect, useState, FC, useMemo } from 'react';
import { DiviceInfo, loadComplete, onDeviceStatusChange, getDeviceInfo } from './api';
import { checkIsLandScreen } from '@/utils/screen';

type Info = { isInit: boolean } & Partial<DiviceInfo>;

const initialInfo = {
  isInit: false,
};

const SDKContext = createContext<Info>(initialInfo);

export const SDKProvider: FC = ({ children }) => {
  const [info, setInfo] = useState<DiviceInfo>();
  const [isInit, setIsInit] = useState(false);

  // call sdk initial event
  useEffect(() => {
    loadComplete();
    getDeviceInfo()
      .then((res) => {
        setIsInit(true);
        setInfo(res);
      })
      .catch((error) => {
        setIsInit(false);
        console.log(error);
      });
  }, []);

  // register event
  useEffect(() => {
    onDeviceStatusChange((data) => {
      setInfo(data);
    });
  }, []);

  const value = useMemo(() => ({ isInit, ...info }), [isInit, info]);

  return <SDKContext.Provider value={value}>{children}</SDKContext.Provider>;
};

export const useSDKInfo = () => {
  const info = useContext(SDKContext);

  return [info];
};

export const useIsLandScreen = () => {
  const [info] = useSDKInfo();
  const [value, setValue] = useState(checkIsLandScreen());
  const { ORIENTATION } = info;

  useEffect(() => {
    const onChange = () => {
      setValue(checkIsLandScreen());
    };
    if (!ORIENTATION) {
      screen.orientation.addEventListener('change', onChange);
    }
    return () => screen.orientation.removeEventListener('change', onChange);
  }, [ORIENTATION]);

  useEffect(() => {
    if (ORIENTATION) {
      setValue(ORIENTATION === 2);
    } else {
      setValue(checkIsLandScreen());
    }
  }, []);

  return [value];
};
