import React from 'react'
import PropTypes from 'prop-types'

import translate from './i18n/translate'

function Error(props) {
  const {t} = props
  if (!props.location.state) {
    return (
      <div>
        <h1 className='font-logo'>{t('errorPage')}</h1>
        <hr />
        <p>{t('noErrorMessage')}</p>
        <p>{t('contactUs')}</p>
      </div>
    )
  }

  let message
  switch (props.location.state.code) {
  case 'requireCustomerServiceAuth':
    message = t('staffOnlyPage')
    break
  case 'Unauthorized':
    message = t('unauthorizedPage')
    break
  default:
    message = props.location.state.err.message
  }
  console.log(props.location.state.err)
  return (
    <div>
      <h1 className='font-logo'>{t('somethingWrong')}</h1>
      <hr />
      <p>{message}</p>
      <p>{t('contactUs')}</p>
    </div>
  )
}

Error.propTypes = {
  location: PropTypes.object.isRequired,
  t: PropTypes.func
}

export default translate(Error)
