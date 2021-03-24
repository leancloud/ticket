import React from 'react'
import _ from 'lodash'

export const AppContext = React.createContext({
  isCustomerService: false,
  tagMetadatas: [],
  addNotification: _.noop,
})
