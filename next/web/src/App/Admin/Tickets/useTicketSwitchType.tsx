import { ReactNode, createContext, useContext } from 'react';
import _ from 'lodash';

import { useCurrentUserIsCustomerService } from '@/leancloud';
import { useSearchParams } from '@/utils/useSearchParams';

export type TicketSwitchType = 'all' | 'processable';

const TicketSwitchTypeContext = createContext<[TicketSwitchType, (type: TicketSwitchType) => void]>(
  ['all', _.noop]
);

export const TicketSwitchTypeProvider = ({ children }: { children: ReactNode }) => {
  const [params, { merge }] = useSearchParams();
  const isCustomerService = useCurrentUserIsCustomerService();

  const set = (type: TicketSwitchType) => {
    merge({
      ...params,
      tableType: type,
    });
  };

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
