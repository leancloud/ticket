/* global SUPPORT_EMAIL */
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

export default function Error() {
  const { t } = useTranslation()
  const location = useLocation()

  if (!location.state) {
    return (
      <div>
        <h1 className="font-logo">{t('errorPage')}</h1>
        <hr />
        <p>{t('noErrorMessage')}</p>
        {typeof SUPPORT_EMAIL === 'string' && (
          <p>
            {t('contactUs')} <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
        )}
      </div>
    )
  }

  let message
  switch (location.state.code) {
    case 'requireCustomerServiceAuth':
      message = t('staffOnlyPage')
      break
    case 'Unauthorized':
      message = t('unauthorizedPage')
      break
    default:
      message = location.state.err.message
  }
  console.log(location.state.err)
  return (
    <div>
      <h1 className="font-logo">{t('somethingWrong')}</h1>
      <hr />
      <p>{message}</p>
      {typeof SUPPORT_EMAIL === 'string' && (
        <p>
          {t('contactUs')} <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
      )}
    </div>
  )
}
