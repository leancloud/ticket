/*global SUPPORT_EMAIL*/
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useTitle } from 'react-use'

export default function NotFound() {
  const { t } = useTranslation()
  useTitle('404 - LeanTicket')

  return (
    <div className="jumbotron">
      <h1>{t('pageNotExist')}</h1>
      <p>{t('pageNotExistInfo')}</p>
      {SUPPORT_EMAIL && (
        <p>
          {t('contactUs')} <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
      )}
    </div>
  )
}
