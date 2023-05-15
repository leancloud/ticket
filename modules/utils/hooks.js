/*global BRAND_NAME */
import { useMemo, useCallback } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import * as ReactUse from 'react-use'
import _ from 'lodash'

/**
 * @param {string} [title]
 */
export function useTitle(title) {
  ReactUse.useTitle(title === undefined ? BRAND_NAME : `${title} - ${BRAND_NAME}`, {
    restoreOnUnmount: true,
  })
}

export const useApplyChanges = () => {
  const history = useHistory()
  const location = useLocation()
  return useCallback(
    (changeDescriptors, replace = false) => {
      history[replace ? 'replace' : 'push']({
        search: _.flowRight(changeDescriptors)(location.search),
      })
    },
    [history, location.search]
  )
}

export function useURLSearchParam(searchKey) {
  const location = useLocation()
  const applyChanges = useApplyChanges()
  const value = useMemo(() => {
    const urlParams = new URLSearchParams(location.search)
    const keyValue = urlParams.get(searchKey)
    return keyValue !== null ? keyValue : undefined
  }, [location.search, searchKey])

  const change = useCallback(
    (searchValue) => (searchString) => {
      const search = new URLSearchParams(searchString)
      if (typeof searchValue === 'undefined') {
        search.delete(searchKey)
      } else {
        search.set(searchKey, searchValue)
      }
      return search.toString()
    },
    [searchKey]
  )

  const setValue = useCallback(
    (searchValue, replace) => applyChanges([change(searchValue)], replace),
    [applyChanges, change]
  )

  return [value, setValue, change]
}
