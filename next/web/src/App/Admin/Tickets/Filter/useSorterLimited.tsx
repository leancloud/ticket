import { FC, createContext, useContext, useState } from 'react';

export const SortLimitedContext = createContext<{
  limitedSorter: boolean;
  setLimitedSorter: (limited: boolean) => void;
}>({ limitedSorter: false, setLimitedSorter: () => {} });

export const SortLimited: FC = ({ children }) => {
  const [limited, setLimited] = useState(false);

  return (
    <SortLimitedContext.Provider value={{ limitedSorter: limited, setLimitedSorter: setLimited }}>
      {children}
    </SortLimitedContext.Provider>
  );
};

export const useSorterLimited = () => useContext(SortLimitedContext);
