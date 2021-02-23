import React from 'react'
import { useTranslation } from 'react-i18next'
import { useTitle } from './utils/hooks'

export default function About() {
  const { t } = useTranslation()
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
