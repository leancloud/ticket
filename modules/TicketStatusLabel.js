import React from 'react'
import PropTypes from 'prop-types'
import {TICKET_STATUS, TICKET_STATUS_MSG} from '../lib/common'

const TicketStatusLabel = (props) => {
  switch (props.status) {
  case TICKET_STATUS.FULFILLED:
    return <span className='label label-success'>{TICKET_STATUS_MSG[props.status]}</span>
  case TICKET_STATUS.REJECTED:
    return <span className='label label-default'>{TICKET_STATUS_MSG[props.status]}</span>
  case TICKET_STATUS.PRE_FULFILLED:
    return <span className='label label-primary'>{TICKET_STATUS_MSG[props.status]}</span>
  case TICKET_STATUS.NEW:
    return <span className='label label-danger'>{TICKET_STATUS_MSG[props.status]}</span>
  case TICKET_STATUS.WAITING_CUSTOMER_SERVICE:
    return <span className='label label-warning'>{TICKET_STATUS_MSG[props.status]}</span>
  case TICKET_STATUS.WAITING_CUSTOMER:
    return <span className='label label-primary'>{TICKET_STATUS_MSG[props.status]}</span>
  default:
    throw new Error('unkonwn ticket status:', props.status)
  }
}

TicketStatusLabel.displayName = 'TicketStatusLabel'

TicketStatusLabel.propTypes = {
  status: PropTypes.number.isRequired,
}

export default TicketStatusLabel 