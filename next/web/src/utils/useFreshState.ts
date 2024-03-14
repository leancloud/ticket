import { DependencyList } from 'react';
import { useLatest } from 'react-use';
import { isEqual } from 'lodash-es';

import { useEffectEvent } from './useEffectEvent';

/**
 * Check all states is fresh in async function or callback
 */
export function useFreshState(deps: DependencyList) {
  const latestDeps = useLatest(deps);
  return useEffectEvent(() => isEqual(deps, latestDeps.current));
}
