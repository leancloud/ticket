import React from 'react'
import {Alert} from 'react-bootstrap'

import {enableWeekendWarning} from '../../../config.webapp'
import translate from '../../i18n/translate'

export const WeekendWarning = translate(({t}) => {
  if (!enableWeekendWarning) {
    return null
  }
  const day = new Date().getDay()
  if (day >= 1 && day <= 5) {
    return null
  }

  return <Alert bsStyle="warning">{t('weekendWarning')}</Alert>
})
