/*global SUPPORT_EMAIL*/
import React from 'react'
import PropTypes from 'prop-types'
import translate from './i18n/translate'
import { useTitle } from './utils/hooks'

function Error({t}) {
  useTitle('404 - LeanTicket')

  return (
    <div className="jumbotron">
      <h1>{t('pageNotExist')}</h1>
      <p>{t('pageNotExistInfo')}</p>
      {SUPPORT_EMAIL && <p>{t('contactUs')} <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>}
    </div>
  )
}

Error.propTypes = {
  t: PropTypes.func
}

export default translate(Error)