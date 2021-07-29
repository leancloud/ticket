/* eslint-disable promise/always-return */
/* eslint-disable react/prop-types */

import React, { useEffect, useState } from 'react'
import { Route, useHistory, useLocation } from 'react-router-dom'
import { auth } from '../../lib/leancloud'
import { isStaff } from '../common'
import Login from '../Login'

function BasicAuthWrapper({ children }) {
  const history = useHistory()
  const location = useLocation()
  const [pass, setPass] = useState()

  useEffect(() => {
    if (auth.currentUser) {
      setPass(true)
    } else {
      sessionStorage.setItem('LeanTicket:nextPathname', location.pathname)
      // history.replace('/login')
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
  const history = useHistory()
  const [pass, setPass] = useState(false)
  const [error, setError] = useState()

  useEffect(() => {
    setPass(false)
    setError()
    isStaff(auth.currentUser)
      .then((isCS) => {
        if (isCS) {
          setPass(true)
        } else {
          const err = new Error()
          err.code = 'requireCustomerServiceAuth'
          setError(err)
        }
      })
      .catch((err) => {
        setError(err)
      })
  }, [history])

  if (pass) {
    return children
  }
  if (error) {
    return <Error error={error} />
  }
  return null
}

export const AuthRoute = ({ children, ...props }) => (
  <Route {...props}>{<BasicAuthWrapper children={children} />}</Route>
)

export const StaffRoute = ({ children, ...props }) => (
  <Route {...props}>{<CSAuthWrapper children={children} />}</Route>
)
