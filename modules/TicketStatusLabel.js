import React from 'react'
import { Badge } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { TICKET_STATUS, TICKET_STATUS_MSG } from '../lib/common'

export default function TicketStatusLabel({ status }) {
  const { t } = useTranslation()
  switch (status) {
    case TICKET_STATUS.FULFILLED:
      return <Badge variant="success">{t(TICKET_STATUS_MSG[status])}</Badge>
    case TICKET_STATUS.CLOSED:
      return <Badge variant="secondary">{t(TICKET_STATUS_MSG[status])}</Badge>
    case TICKET_STATUS.PRE_FULFILLED:
      return <Badge variant="primary">{t(TICKET_STATUS_MSG[status])}</Badge>
    case TICKET_STATUS.NEW:
      return <Badge variant="danger">{t(TICKET_STATUS_MSG[status])}</Badge>
    case TICKET_STATUS.WAITING_CUSTOMER_SERVICE:
      return <Badge variant="warning">{t(TICKET_STATUS_MSG[status])}</Badge>
    case TICKET_STATUS.WAITING_CUSTOMER:
      return <Badge variant="primary">{t(TICKET_STATUS_MSG[status])}</Badge>
    default:
      throw new Error('unkonwn ticket status:', status)
  }
}

TicketStatusLabel.propTypes = {
  status: PropTypes.number.isRequired,
}
