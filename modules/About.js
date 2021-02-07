import React from 'react'
import PropTypes from 'prop-types'
import translate from './i18n/translate'
import {useTitle} from './utils/hooks'

function About({ t }) {
  useTitle(`${t('about')} - LeanTicket`)

  return (
    <div>
      <h1 className='font-logo'>LeanTicket</h1>
      <hr />
      <p>{t('lightweight')} <a href="https://github.com/leancloud/ticket">{t('oss')}</a> {t('intro')}</p>
      <p>{t('builtWith')}<a href={t('leanCloudUrl')}>LeanCloud</a>{t('builtWithEnding')}</p>
    </div>
  )
}

About.displayName = 'About'
About.propTypes = {
  t: PropTypes.func
}

export default translate(About)
