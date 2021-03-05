/* eslint-disable promise/always-return */
/* eslint-disable react/prop-types */

import React, { useEffect, useState } from 'react'
import { Route, useHistory, useLocation } from 'react-router-dom'
import { auth } from '../../lib/leancloud'
import { isCustomerService } from '../common'

function BasicAuthWrapper({ children }) {
  const history = useHistory()
  const location = useLocation()
  const [pass, setPass] = useState(false)

  useEffect(() => {
    if (auth.currentUser()) {
      setPass(true)
    } else {
      localStorage.setItem('LeanTicket:nextPathname', location.pathname)
      history.replace('/login')
      setPass(false)
    }
  }, [history, location])

  return pass && children
}

function CSAuthWrapper({ children }) {
  const history = useHistory()
  const [pass, setPass] = useState(false)

  useEffect(() => {
    setPass(false)
    isCustomerService(auth.currentUser())
      .then((isCS) => {
        if (isCS) {
          setPass(true)
        } else {
          history.replace({
            pathname: '/error',
            state: { code: 'requireCustomerServiceAuth' },
          })
        }
      })
      .catch((err) => {
        history.replace({
          pathname: '/error',
          state: { err, code: err.code },
        })
      })
  }, [history])

  return pass && children
}

export const AuthRoute = ({ children, mustCustomerService, ...props }) => (
  <Route {...props}>
    {mustCustomerService ? (
      <CSAuthWrapper children={children} />
    ) : (
      <BasicAuthWrapper children={children} />
    )}
  </Route>
)
