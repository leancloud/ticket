import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { cloud } from '../../lib/leancloud'

import { getLeanCloudRegions, getLeanCloudRegionText } from '../../lib/common'
import OauthButton from './OauthButton'
import { AppContext } from '../context'

export default function AccountLink({ currentUser, updateCurrentUser }) {
  const { t } = useTranslation()
  const { addNotification } = useContext(AppContext)
  const [LCUserInfos, setLCUserInfos] = useState()

  useEffect(() => {
    cloud.run('getLeanCloudUserInfos').then(setLCUserInfos).catch(addNotification)
  }, [])

  if (!LCUserInfos) {
    return <div>{t('loading')}……</div>
  }

  return (
    <div>
      <h2>{t('linkedAccounts')}</h2>
      {getLeanCloudRegions().map((region) => (
        <OauthButton
          key={region}
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
