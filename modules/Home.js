import React, { useEffect, useContext } from 'react'
import { auth } from '../lib/leancloud'
import { useHistory } from 'react-router-dom'
import { AppContext } from './context'

export default function Home() {
  const history = useHistory()
  const { isStaff, isCustomerService } = useContext(AppContext)

  useEffect(() => {
    if (!auth.currentUser) {
      history.replace('/login')
      return
    }
    if (isCustomerService) {
      return history.replace('/customerService/tickets?assignee=me&stage=todo')
    }
    if (isStaff) {
      return history.replace('/customerService/tickets')
    }
    history.replace('/tickets')
  }, [history, isCustomerService, isStaff])

  return <div>Home</div>
}
