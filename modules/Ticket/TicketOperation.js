import React, { useState } from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'

import { TICKET_STATUS, ticketStatus } from '../../lib/common'

export function TicketOperation({ ticket, isCustomerService, onOperate }) {
  const { t } = useTranslation()
  const [operating, setOperating] = useState(false)

  const operate = async (action) => {
    setOperating(true)
    try {
      await onOperate(action)
    } finally {
      setOperating(false)
    }
  }

  if (ticketStatus.isOpened(ticket.status)) {
    return (
      <Form.Group>
        <Form.Label>{t('ticketOperation')}</Form.Label>
        <div>
          {process.env.ENABLE_USER_CONFIRMATION && (
            <Button variant="light" disabled={operating} onClick={() => operate('resolve')}>
              {t('resolved')}
            </Button>
          )}{' '}
          <Button variant="light" disabled={operating} onClick={() => operate('close')}>
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
          <Button disabled={operating} onClick={() => operate('resolve')}>
            {t('resolutionConfirmed')}
          </Button>{' '}
          <Button variant="light" disabled={operating} onClick={() => operate('reopen')}>
            {t('unresolved')}
          </Button>
        </div>
      </Alert>
    )
  }
  return (
    <Form.Group>
      <Form.Label>{t('ticketOperation')}</Form.Label>
      <div>
        <Button variant="light" disabled={operating} onClick={() => operate('reopen')}>
          {t('reopen')}
        </Button>
      </div>
    </Form.Group>
  )
}

TicketOperation.propTypes = {
  ticket: PropTypes.object.isRequired,
  onOperate: PropTypes.func.isRequired,
  isCustomerService: PropTypes.bool,
}
