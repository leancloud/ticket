import React, { useEffect, useRef } from 'react'
import { useHistory } from 'react-router-dom'

import './NewTicket.next.css'

export default function NewTicket() {
  const history = useHistory()
  const frame = useRef(null)

  useEffect(() => {
    const h = ({ data }) => {
      if (data === 'ticketCreated') {
        setTimeout(() => history.push('/tickets'), 1000)
      } else if (data === 'requireAuth') {
        history.push('/login')
      }
    }
    frame.current.contentWindow.addEventListener('message', h)
  }, [])

  return <iframe ref={frame} frameBorder={0} src="/next/tickets/new" width="100%" height="100%" />
}
