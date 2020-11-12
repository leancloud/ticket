import React, { PropTypes }  from 'react'
import DocumentTitle from 'react-document-title'
import translate from './i18n/translate'

function About({ t }) {
  return <div>
    <DocumentTitle title={`${t('about')} - LeanTicket`} />
    <h1 className='font-logo'>LeanTicket</h1>
    <hr />
    <p>{t('lightweight')} <a href="https://github.com/leancloud/ticket">{t('oss')}</a> {t('intro')}</p>
    <p>{t('builtWith')}<a href={t('leanCloudUrl')}>LeanCloud</a>{t('builtWithEnding')}</p>
  </div>
}

About.displayName = 'About'
About.propTypes = {
  t: PropTypes.func
}

export default translate(About)
