import React from 'react'
import { Alert, Button, ButtonToolbar, ControlLabel, FormGroup } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'

import { TICKET_STATUS, ticketStatus } from '../../lib/common'
import { MountCustomElement } from '../custom/element'

export function TicketOperation({ ticket, isCustomerService, onOperate }) {
  const { t } = useTranslation()

  if (ticketStatus.isOpened(ticket.status)) {
    return (
      <FormGroup>
        <ControlLabel>{t('ticketOperation')}</ControlLabel>
        <ButtonToolbar>
          <Button onClick={() => onOperate('resolve')}>{t('resolved')}</Button>
          <Button onClick={() => onOperate('close')}>{t('close')}</Button>
          <MountCustomElement
            point="ticket.metadata.action"
            props={{ ticket, isCustomerService }}
          />
        </ButtonToolbar>
      </FormGroup>
    )
  }
  if (!isCustomerService && ticket.status === TICKET_STATUS.PRE_FULFILLED) {
    return (
      <Alert bsStyle="warning">
        <ControlLabel>{t('confirmResolved')}</ControlLabel>
        <ButtonToolbar>
          <Button bsStyle="primary" onClick={() => onOperate('resolve')}>
            {t('resolutionConfirmed')}
          </Button>
          <Button onClick={() => onOperate('reopen')}>{t('unresolved')}</Button>
          <MountCustomElement
            point="ticket.metadata.action"
            props={{ ticket, isCustomerService }}
          />
        </ButtonToolbar>
      </Alert>
    )
  }
  if (isCustomerService) {
    return (
      <FormGroup>
        <ControlLabel>{t('ticketOperation')}</ControlLabel>
        <ButtonToolbar>
          <Button onClick={() => onOperate('reopen')}>{t('reopen')}</Button>
          <MountCustomElement
            point="ticket.metadata.action"
            props={{ ticket, isCustomerService }}
          />
        </ButtonToolbar>
      </FormGroup>
    )
  }
  return null
}

TicketOperation.propTypes = {
  ticket: PropTypes.object.isRequired,
  onOperate: PropTypes.func.isRequired,
  isCustomerService: PropTypes.bool,
}
