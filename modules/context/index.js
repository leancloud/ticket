import React, { useContext } from 'react'
import _ from 'lodash'

export const AppContext = React.createContext({
  currentUser: null,
  isStaff: false,
  isCustomerService: false,
  isUser: false,
  tagMetadatas: [],
  addNotification: _.noop,
  setCurrentUser: _.noop,
})

export const useAppContext = () => useContext(AppContext)
