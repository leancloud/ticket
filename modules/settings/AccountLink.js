import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { cloud } from '../../lib/leancloud'

import { getLeanCloudRegions, getLeanCloudRegionText } from '../../lib/common'
import OauthButton from './OauthButton'

// TODO: 使用新的 Context 语法
export default function AccountLink({ currentUser, updateCurrentUser }, context) {
  const { t } = useTranslation()
  const [LCUserInfos, setLCUserInfos] = useState()

  useEffect(() => {
    cloud.run('getLeanCloudUserInfos').then(setLCUserInfos).catch(context.addNotification)
  }, [])

  if (!LCUserInfos) {
    return <div>{t('loading')}……</div>
  }

  return (
    <div>
      <h2>{t('linkedAccounts')}</h2>
      {getLeanCloudRegions().map((region) => (
        <OauthButton
          currentUser={currentUser}
          lcUserInfos={LCUserInfos}
          region={region}
          regionText={getLeanCloudRegionText(region)}
        />
      ))}
      <span className="text-muted">{t('loginIntlFirst')}</span>
    </div>
  )
}

AccountLink.propTypes = {
  currentUser: PropTypes.object,
  updateCurrentUser: PropTypes.func,
}
