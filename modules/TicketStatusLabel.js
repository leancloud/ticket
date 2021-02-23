import React from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import {TICKET_STATUS, TICKET_STATUS_MSG} from '../lib/common'

export default function TicketStatusLabel({ status }) {
  const { t } = useTranslation()
  switch (status) {
  case TICKET_STATUS.FULFILLED:
    return <span className='label label-success'>{t(TICKET_STATUS_MSG[status])}</span>
  case TICKET_STATUS.CLOSED:
    return <span className='label label-default'>{t(TICKET_STATUS_MSG[status])}</span>
  case TICKET_STATUS.PRE_FULFILLED:
    return <span className='label label-primary'>{t(TICKET_STATUS_MSG[status])}</span>
  case TICKET_STATUS.NEW:
    return <span className='label label-danger'>{t(TICKET_STATUS_MSG[status])}</span>
  case TICKET_STATUS.WAITING_CUSTOMER_SERVICE:
    return <span className='label label-warning'>{t(TICKET_STATUS_MSG[status])}</span>
  case TICKET_STATUS.WAITING_CUSTOMER:
    return <span className='label label-primary'>{t(TICKET_STATUS_MSG[status])}</span>
  default:
    throw new Error('unkonwn ticket status:', status)
  }
}

TicketStatusLabel.propTypes = {
  status: PropTypes.number.isRequired,
}
