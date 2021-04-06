import React from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'

import style from './index.module.scss'
import { TICKET_STATUS, TICKET_STATUS_MSG } from '../../../lib/common'

export function TicketStatusLabel({ status }) {
  const { t } = useTranslation()
  switch (status) {
    case TICKET_STATUS.FULFILLED:
      return <span className={`${style.label} ${style.green}`}>{t(TICKET_STATUS_MSG[status])}</span>
    case TICKET_STATUS.CLOSED:
      return <span className={`${style.label} ${style.grey}`}>{t(TICKET_STATUS_MSG[status])}</span>
    case TICKET_STATUS.PRE_FULFILLED:
      return <span className={`${style.label} ${style.blue}`}>{t(TICKET_STATUS_MSG[status])}</span>
    case TICKET_STATUS.NEW:
      return <span className={`${style.label} ${style.red}`}>{t(TICKET_STATUS_MSG[status])}</span>
    case TICKET_STATUS.WAITING_CUSTOMER_SERVICE:
      return (
        <span className={`${style.label} ${style.orange}`}>{t(TICKET_STATUS_MSG[status])}</span>
      )
    case TICKET_STATUS.WAITING_CUSTOMER:
      return <span className={`${style.label} ${style.blue}`}>{t(TICKET_STATUS_MSG[status])}</span>
    default:
      throw new Error('unkonwn ticket status:', status)
  }
}

TicketStatusLabel.propTypes = {
  status: PropTypes.number.isRequired,
}
