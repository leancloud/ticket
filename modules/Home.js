import React, { useEffect, useContext } from 'react'
import { auth } from '../lib/leancloud'
import { useHistory } from 'react-router-dom'
import { AppContext } from './context'

export default function Home() {
  const history = useHistory()
  const { isUser } = useContext(AppContext)

  useEffect(() => {
    if (!auth.currentUser) {
      history.replace('/login')
      return
    }
    if (!isUser) {
      return window.location.replace(`/next/admin/`)
    }
    history.replace('/tickets')
  }, [history, isUser])

  return <div>Home</div>
}
