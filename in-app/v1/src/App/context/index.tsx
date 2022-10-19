import { createContext, useState, FC, useCallback, useContext } from 'react';
import { noop } from 'lodash';

export interface AppState {
  topicIndex?: number;
  ticketsIndex?: number;
}

const AppStateContext = createContext<[AppState, { update: (v: Partial<AppState>) => void }]>([
  {},
  { update: noop },
]);

export const useAppState = () => useContext(AppStateContext);

export const AppStateProvider: FC = ({ children }) => {
  const [status, setStatus] = useState<AppState>({ topicIndex: 0, ticketsIndex: 0 });

  const update = useCallback((data: Partial<AppState>) => {
    setStatus((prev) => ({ ...prev, ...data }));
  }, []);

  return (
    <AppStateContext.Provider value={[status, { update }]}>{children}</AppStateContext.Provider>
  );
};
