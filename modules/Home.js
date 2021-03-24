import React, { useEffect } from 'react'
import PropTypes from 'prop-types'
import { auth } from '../lib/leancloud'
import { useHistory } from 'react-router-dom'

export default function Home({ isCustomerService }) {
  const history = useHistory()

  useEffect(() => {
    if (!auth.currentUser) {
      history.replace('/login')
      return
    }
    if (isCustomerService) {
      history.replace('/customerService/tickets?assignee=me&isOpen=true')
    } else {
      history.replace('/tickets')
    }
  }, [history, isCustomerService])

  return <div>Home</div>
}

Home.propTypes = {
  isCustomerService: PropTypes.bool,
}
