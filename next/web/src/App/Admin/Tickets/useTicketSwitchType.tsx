import { useCurrentUserIsCustomerService } from '@/leancloud';
import { useSearchParams } from '@/utils/useSearchParams';
import _ from 'lodash';
import { ReactNode, createContext, useCallback, useContext } from 'react';

export type TicketSwitchType = 'all' | 'processable';

const TicketSwitchTypeContext = createContext<[TicketSwitchType, (type: TicketSwitchType) => void]>(
  ['all', _.noop]
);

export const TicketSwitchTypeProvider = ({ children }: { children: ReactNode }) => {
  const [params, { merge }] = useSearchParams();
  const isCustomerService = useCurrentUserIsCustomerService();

  const set = useCallback(
    (type: TicketSwitchType) => {
      merge({
        ...params,
        tableType: type,
      });
    },
    [merge, params]
  );

  return (
    <TicketSwitchTypeContext.Provider
      value={[
        isCustomerService
          ? (params.tableType as TicketSwitchType | undefined) ?? 'processable'
          : 'all',
        set,
      ]}
    >
      {children}
    </TicketSwitchTypeContext.Provider>
  );
};

export const useTicketSwitchType = () => useContext(TicketSwitchTypeContext);
