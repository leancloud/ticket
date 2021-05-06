import React, { useContext } from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'

import { TICKET_STATUS, ticketStatus } from '../../lib/common'
import { operateTicket } from './hooks'
import { AppContext } from '../context'

export function TicketOperation({ ticket, isCustomerService }) {
  const { t } = useTranslation()
  const { addNotification } = useContext(AppContext)

  const handleOperateTicket = async (action) => {
    try {
      await operateTicket(ticket.nid, action)
    } catch (error) {
      addNotification(error)
    }
  }

  if (ticketStatus.isOpened(ticket.status)) {
    return (
      <Form.Group>
        <Form.Label>{t('ticketOperation')}</Form.Label>
        <div>
          <Button variant="light" onClick={() => handleOperateTicket('resolve')}>
            {t('resolved')}
          </Button>{' '}
          <Button variant="light" onClick={() => handleOperateTicket('close')}>
            {t('close')}
          </Button>
        </div>
      </Form.Group>
    )
  }
  if (!isCustomerService && ticket.status === TICKET_STATUS.PRE_FULFILLED) {
    return (
      <Alert variant="warning">
        <Form.Label>{t('confirmResolved')}</Form.Label>
        <div>
          <Button onClick={() => handleOperateTicket('resolve')}>{t('resolutionConfirmed')}</Button>{' '}
          <Button variant="light" onClick={() => handleOperateTicket('reopen')}>
            {t('unresolved')}
          </Button>
        </div>
      </Alert>
    )
  }
  if (isCustomerService) {
    return (
      <Form.Group>
        <Form.Label>{t('ticketOperation')}</Form.Label>
        <div>
          <Button variant="light" onClick={() => handleOperateTicket('reopen')}>
            {t('reopen')}
          </Button>
        </div>
      </Form.Group>
    )
  }
  return null
}

TicketOperation.propTypes = {
  ticket: PropTypes.object.isRequired,
  isCustomerService: PropTypes.bool,
}
