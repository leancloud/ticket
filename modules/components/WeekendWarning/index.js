import React from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from 'react-bootstrap'

import { getConfig } from '../../config'

export function WeekendWarning() {
  const { t } = useTranslation()

  if (!getConfig('weekendWarning.enabled')) {
    return null
  }
  const day = new Date().getDay()
  if (day >= 1 && day <= 5) {
    return null
  }

  return <Alert variant="warning">{t('weekendWarning')}</Alert>
}
