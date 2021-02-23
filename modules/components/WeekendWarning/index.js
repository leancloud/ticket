import React from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from 'react-bootstrap'

import { enableWeekendWarning } from '../../../config.webapp'

export function WeekendWarning() {
  const { t } = useTranslation()

  if (!enableWeekendWarning) {
    return null
  }
  const day = new Date().getDay()
  if (day >= 1 && day <= 5) {
    return null
  }

  return <Alert bsStyle="warning">{t('weekendWarning')}</Alert>
}
