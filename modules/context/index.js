import React, { useContext } from 'react'
import _ from 'lodash'

export const AppContext = React.createContext({
  currentUser: null,
  isCustomerService: false,
  tagMetadatas: [],
  addNotification: _.noop,
})

export const useAppContext = () => useContext(AppContext)
