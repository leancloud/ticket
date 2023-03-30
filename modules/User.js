/* global ENABLE_LEANCLOUD_INTEGRATION */
import React, { Component } from 'react'
import { useTranslation, withTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { withRouter } from 'react-router-dom'
import { cloud } from '../lib/leancloud'
import { Avatar } from './Avatar'
import css from './User.css'
import { UserTags } from './UserLabel'

class User extends Component {
  constructor(props) {
    super(props)
    this.state = {
      user: null,
      leancloudApps: [],
    }
  }

  componentDidMount() {
    this.refreshUserInfo()
  }

  refreshUserInfo() {
    const { username } = this.props.match.params
    const { isCustomerService } = this.props
    return Promise.all([
      cloud.run('getUserInfo', { username }),
      ENABLE_LEANCLOUD_INTEGRATION && isCustomerService
        ? cloud.run('getLeanCloudUserInfosByUsername', { username })
        : null,
      ENABLE_LEANCLOUD_INTEGRATION && isCustomerService
        ? cloud.run('getLeanCloudAppsByUsername', { username })
        : null,
    ]).then(([user, leancloudUsers, leancloudApps]) => {
      this.setState({
        user,
        leancloudUsers,
        leancloudApps: leancloudApps || [],
      })
      return
    })
  }

  render() {
    const { t } = this.props
    if (!this.state.user) {
      return <div>{t('loading')}……</div>
    }
    return (
      <div>
        <div className={css.userWrap}>
          <div className={css.avatar}>
            <Avatar height="200" width="200" user={this.state.user} />
          </div>
          <div className={css.info}>
            <h2 className={css.userInfo}>
              {this.state.user.name}{' '}
              <span className="text-muted">({this.state.user.username})</span>{' '}
              {this.props.isCustomerService && (
                <UserTags user={this.state.user} className={css.tags} />
              )}
            </h2>
            {this.state.leancloudUsers && (
              <div className={css.userTable}>
                <table className="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <td>{t('region')}</td>
                      <td>Id</td>
                      <td>{t('username')}</td>
                      <td>{t('email')}</td>
                      <td>{t('mobile')}</td>
                    </tr>
                  </thead>
                  <tbody>
                    {this.state.leancloudUsers.map((leancloudUser) => {
                      return (
                        <tr key={leancloudUser.id}>
                          <td>{leancloudUser.region}</td>
                          <td>{leancloudUser.id}</td>
                          <td>{leancloudUser.username}</td>
                          <td>{leancloudUser.email}</td>
                          <td>{leancloudUser.phone}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <LeanCloudApps leancloudApps={this.state.leancloudApps} />
      </div>
    )
  }
}
// 605aeb3ee7580f00f741d0b9
User.propTypes = {
  match: PropTypes.object.isRequired,
  isCustomerService: PropTypes.bool,
  t: PropTypes.func,
}

const LeanCloudApps = (props) => {
  const { t } = useTranslation()
  if (props.leancloudApps.length === 0) {
    return null
  }
  const apps = props.leancloudApps.map((app) => {
    return (
      <tr key={app.id}>
        <td>{app.region}</td>
        <td>{app.appName}</td>
        <td>{app.appId}</td>
        <td>{app.bizType}</td>
      </tr>
    )
  })
  return (
    <>
      <p>{t('ticketApplications')}</p>
      <table className="table table-bordered table-striped">
        <thead>
          <tr>
            <th>region</th>
            <th>appName</th>
            <th>appId</th>
            <th>bizType</th>
          </tr>
        </thead>
        <tbody>{apps}</tbody>
      </table>
    </>
  )
}
LeanCloudApps.propTypes = {
  leancloudApps: PropTypes.array,
}

export default withTranslation()(withRouter(User))
