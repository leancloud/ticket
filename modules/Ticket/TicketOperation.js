import React from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'

import { TICKET_STATUS, ticketStatus } from '../../lib/common'

export function TicketOperation({ ticket, isCustomerService, onOperate }) {
  const { t } = useTranslation()

  if (ticketStatus.isOpened(ticket.status)) {
    return (
      <Form.Group>
        <Form.Label>{t('ticketOperation')}</Form.Label>
        <div>
          <Button variant="light" onClick={() => onOperate('resolve')}>
            {t('resolved')}
          </Button>{' '}
          <Button variant="light" onClick={() => onOperate('close')}>
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
          <Button onClick={() => onOperate('resolve')}>{t('resolutionConfirmed')}</Button>{' '}
          <Button variant="light" onClick={() => onOperate('reopen')}>
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
          <Button variant="light" onClick={() => onOperate('reopen')}>
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
  onOperate: PropTypes.func.isRequired,
  isCustomerService: PropTypes.bool,
}
