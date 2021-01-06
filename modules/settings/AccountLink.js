import React, {Component} from 'react'
import PropTypes from 'prop-types'
import AV from 'leancloud-storage/live-query'

import {getLeanCloudRegions, getLeanCloudRegionText} from '../../lib/common'
import translate from '../i18n/translate'
import OauthButton from './OauthButton'

class AccountLink extends Component {

  constructor(props) {
    super(props)
    this.state = {
      lcUserInfos: null,
    }
  }

  componentDidMount() {
    return AV.Cloud.run('getLeanCloudUserInfos').then(lcUserInfos => {
      this.setState({lcUserInfos})
      return
    })
  }

  render() {
    const {t} = this.props
    if (!this.state.lcUserInfos) {
      return <div>{t('loading')}……</div>
    }

    return <div>
      <h2>{t('linkedAccounts')}</h2>
      {getLeanCloudRegions().map(region => {
        return <OauthButton currentUser={this.props.currentUser}
          lcUserInfos={this.state.lcUserInfos}
          region={region}
          regionText={getLeanCloudRegionText(region)} />
      })}
      <span className='text-muted'>{t('loginIntlFirst')}</span>
    </div>
  }

}

AccountLink.propTypes = {
  currentUser: PropTypes.object,
  updateCurrentUser: PropTypes.func,
  t: PropTypes.func
}

export default translate(AccountLink)