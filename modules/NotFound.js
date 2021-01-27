/*global SUPPORT_EMAIL*/
import React from 'react'
import PropTypes from 'prop-types'
import DocumentTitle from 'react-document-title'
import translate from './i18n/translate'

function Error({t}) {
  return (
    <div className="jumbotron">
      <DocumentTitle title='404 - LeanTicket' />
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