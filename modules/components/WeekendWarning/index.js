/*global DISABLE_WEEKEND_WARNING*/

import React from 'react'
import {Alert} from 'react-bootstrap'

import translate from '../../i18n/translate'

export const WeekendWarning = translate(({t}) => {
  if (DISABLE_WEEKEND_WARNING) {
    return null
  }
  const day = new Date().getDay()
  if (day >= 1 && day <= 5) {
    return null
  }

  return <Alert bsStyle="warning">{t('weekendWarning')}</Alert>
})
