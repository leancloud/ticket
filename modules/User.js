/*global ENABLE_LEANCLOUD_INTERGRATION */
import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {Link} from 'react-router'
import {cloud} from '../lib/leancloud'
import {Avatar} from './common'
import css from './User.css'
import translate from './i18n/translate'
import {UserTagManager} from './components/UserTag'

class User extends Component {

  constructor(props) {
    super(props)
    this.state = {
      user: null,
      leancloudApps: []
    }
  }

  componentDidMount() {
    this.refreshUserInfo(this.props)
  }

  componentWillReceiveProps(nextProps) {
    this.refreshUserInfo(nextProps)
  }

  refreshUserInfo(props) {
    const username = props.params.username
    return Promise.all([
      cloud.run('getUserInfo', {username}),
      ENABLE_LEANCLOUD_INTERGRATION && props.isCustomerService ? cloud.run('getLeanCloudUserInfosByUsername', {username}) : null,
      ENABLE_LEANCLOUD_INTERGRATION && props.isCustomerService ? cloud.run('getLeanCloudAppsByUsername', {username}) : null,
    ]).then(([user, leancloudUsers, leancloudApps]) => {
      this.setState({
        user,
        leancloudUsers,
        leancloudApps: leancloudApps ? leancloudApps.sort((a, b) => b.month_reqs - a.month_reqs) : []
      })
      return
    })
  }

  addTag(tag) {
    return cloud.run('modifyUserTags', {
      objectId: this.state.user.objectId,
      action: 'add',
      tags: [tag]
    }).then(() => this.refreshUserInfo(this.props))
  }

  removeTag(tag) {
    return cloud.run('modifyUserTags', {
      objectId: this.state.user.objectId,
      action: 'remove',
      tags: [tag]
    }).then(() => this.refreshUserInfo(this.props))
  }

  render() {
    const {t} = this.props
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
            <h2>{this.state.user.username}</h2>
            {this.props.isCustomerService && (
              <UserTagManager tags={this.state.user.tags} onAdd={this.addTag.bind(this)} onRemove={this.removeTag.bind(this)} />
            )}
            <p><Link to={`/customerService/tickets?authorId=${this.state.user.objectId}&page=0&size=10`}>{t('ticketList')}</Link></p>
            {this.state.leancloudUsers &&
              <div>
                <table className='table table-bordered table-striped'>
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
                    {this.state.leancloudUsers.map(leancloudUser => {
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
            }
          </div>
        </div>

        <LeanCloudApps leancloudApps={this.state.leancloudApps} />
      </div>
    )
  }
}
User.propTypes = {
  isCustomerService: PropTypes.bool
}

const LeanCloudApps = (props) => {
  if (props.leancloudApps.length === 0) {
    return <div></div>
  }
  const apps = props.leancloudApps.map((app) => {
    return (
      <tr key={app.id}>
        <td>{app.region}</td>
        <td>{app.id}</td>
        <td>{app.app_name}</td>
        <td>{app.app_id}</td>
        <td>{app.biz_type}</td>
        <td>{app.total_user_count}</td>
        <td>{app.yesterday_reqs}</td>
        <td>{app.month_reqs}</td>
        <td>{app.app_relation}</td>
      </tr>
    )
  })
  return (
    <table className='table table-bordered table-striped'>
      <thead>
        <tr>
          <th>region</th>
          <th>id</th>
          <th>app_name</th>
          <th>app_id</th>
          <th>biz_type</th>
          <th>total_user_count</th>
          <th>yesterday_reqs</th>
          <th>month_reqs</th>
          <th>app_relation</th>
        </tr>
      </thead>
      <tbody>
        {apps}
      </tbody>
    </table>
  )
}
LeanCloudApps.propTypes = {
  leancloudApps: PropTypes.array
}
User.propTypes = {
  t: PropTypes.func
}

export default translate(User)
