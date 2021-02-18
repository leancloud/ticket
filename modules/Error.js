/*global SUPPORT_EMAIL*/
import React from 'react'
import PropTypes from 'prop-types'

import translate from './i18n/translate'
import { useLocation } from 'react-router'

function Error({ t }) {
  const location = useLocation()

  if (!location.state) {
    return (
      <div>
        <h1 className='font-logo'>{t('errorPage')}</h1>
        <hr />
        <p>{t('noErrorMessage')}</p>
        {SUPPORT_EMAIL && <p>{t('contactUs')} <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>}
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
      <h1 className='font-logo'>{t('somethingWrong')}</h1>
      <hr />
      <p>{message}</p>
      {SUPPORT_EMAIL && <p>{t('contactUs')} <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>}
    </div>
  )
}

Error.propTypes = {
  location: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
}

export default translate(Error)
