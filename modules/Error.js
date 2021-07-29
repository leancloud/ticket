/* eslint-disable react/prop-types */
/* global SUPPORT_EMAIL */
import React from 'react'
import { useTranslation } from 'react-i18next'

export default function Error(props) {
  const { t } = useTranslation()

  if (!props.error) {
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
  switch (props.error.code) {
    case 'requireCustomerServiceAuth':
      message = t('staffOnlyPage')
      break
    default:
      message = props.error.message
  }
  console.log(props.error)
  return (
    <div className="my-2">
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
