import React from 'react'
import { Alert, Button, ButtonToolbar, ControlLabel, FormGroup } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'

import { app } from '../../lib/leancloud'
import { TICKET_STATUS, ticketStatus } from '../../lib/common'
import { plugins } from '../plugin'

export function TicketOperation({ ticket, isCustomerService, onOperate }) {
  const { t } = useTranslation()

  const pluginNodes = plugins['ticket.metadata.action']?.map((element, i) =>
    React.createElement(element, {
      app,
      ticket,
      isCustomerService,
      key: `ticket.metadata.action.${i}`,
    })
  )

  if (ticketStatus.isOpened(ticket.status)) {
    return (
      <FormGroup>
        <ControlLabel>{t('ticketOperation')}</ControlLabel>
        <ButtonToolbar>
          <Button onClick={() => onOperate('resolve')}>{t('resolved')}</Button>
          <Button onClick={() => onOperate('close')}>{t('close')}</Button>
          {pluginNodes}
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
          {pluginNodes}
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
          {pluginNodes}
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
