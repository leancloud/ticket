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
    if (isCustomerService || isStaff) {
      return window.location.replace(`/next/admin/tickets`)
    }
    history.replace('/tickets')
  }, [history, isCustomerService, isStaff])

  return <div>Home</div>
}
