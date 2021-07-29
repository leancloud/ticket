import React, { useEffect } from 'react'
import PropTypes from 'prop-types'
import { auth } from '../lib/leancloud'
import { useHistory } from 'react-router-dom'

export default function Home({ isStaff }) {
  const history = useHistory()

  useEffect(() => {
    if (!auth.currentUser) {
      history.replace('/login')
      return
    }
    if (isStaff) {
      history.replace('/customerService/tickets?assignee=me&stage=todo')
    } else {
      history.replace('/tickets')
    }
  }, [history, isStaff])

  return <div>Home</div>
}

Home.propTypes = {
  isStaff: PropTypes.bool,
}
