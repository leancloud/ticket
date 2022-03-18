/* eslint-disable promise/always-return */
/* eslint-disable react/prop-types */

import React, { useEffect, useState, useContext } from 'react'
import { Route, useHistory, useLocation } from 'react-router-dom'
import { auth } from '../../lib/leancloud'
import Login from '../Login'
import { AppContext } from '../context'
import ErrorMessage from '../Error'

function BasicAuthWrapper({ children }) {
  const history = useHistory()
  const location = useLocation()
  const [pass, setPass] = useState()

  useEffect(() => {
    if (auth.currentUser) {
      setPass(true)
    } else {
      sessionStorage.setItem('LeanTicket:nextPathname', location.pathname)
      setPass(false)
    }
  }, [history, location])

  if (pass === undefined) {
    return null
  }
  if (pass === false) {
    return <Login />
  }
  return children
}

function CSAuthWrapper({ children }) {
  const [pass, setPass] = useState(false)
  const [error, setError] = useState()

  const { isUser } = useContext(AppContext)

  useEffect(() => {
    setPass(false)
    setError()
    if (!isUser) {
      setPass(true)
    } else {
      const err = new Error()
      err.code = 'requireCustomerServiceAuth'
      setError(err)
    }
  }, [isUser])

  if (pass) {
    return children
  }
  if (error) {
    return <ErrorMessage error={error} />
  }
  return null
}

export const AuthRoute = ({ children, ...props }) => (
  <Route {...props}>{<BasicAuthWrapper children={children} />}</Route>
)

export const StaffRoute = ({ children, ...props }) => (
  <Route {...props}>{<CSAuthWrapper children={children} />}</Route>
)
