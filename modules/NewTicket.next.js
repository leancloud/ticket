import React, { useEffect, useRef } from 'react'
import { useHistory } from 'react-router-dom'

import './NewTicket.next.css'

export default function NewTicket() {
  const history = useRef(useHistory())
  const frame = useRef(null)

  useEffect(() => {
    const h = ({ data }) => {
      if (data === 'ticketCreated') {
        setTimeout(() => history.current.push('/tickets'), 1000)
      }
    }
    frame.current.contentWindow.addEventListener('message', h)
  }, [])

  return <iframe ref={frame} frameBorder={0} src="/next/tickets/new" width="100%" height="100%" />
}
