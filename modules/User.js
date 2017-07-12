import React, {Component} from 'react'
import {Link} from 'react-router'
import PropTypes from 'prop-types'
import AV from 'leancloud-storage/live-query'
import css from './User.css'

export default class User extends Component {

  constructor(props) {
    super(props)
    this.state = {
      user: {},
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
    Promise.all([
      AV.Cloud.run('getUserInfo', {username}),
      props.isCustomerService ? AV.Cloud.run('getLeanCloudUserInfoByUsername', {username}) : null,
      props.isCustomerService ? AV.Cloud.run('getLeanCloudAppsByUsername', {username}) : null,
    ]).then(([user, leancloudUser, leancloudApps]) => {
      this.setState({
        user,
        leancloudUser,
        leancloudApps: leancloudApps ? leancloudApps.sort((a, b) => b.month_reqs - a.month_reqs) : []
      })
    })
  }

  render() {
    let leancloudUser
    if (this.state.leancloudUser) {
      leancloudUser = (
        <div>
          <p>{this.state.leancloudUser.username}<span className={css.id}>#{this.state.leancloudUser.id}</span></p>
          <p>{this.state.leancloudUser.email}</p>
          <p><a href={'tel:' + this.state.leancloudUser.phone}>{this.state.leancloudUser.phone}</a></p>
          <p><Link to={`/customerService/tickets?authorId=${this.state.user.objectId}`}>工单列表</Link></p>
        </div>
      )
    }
    return (
      <div>
        <div className={css.userWrap}>
          <div className={css.avatar}>
            <img height="100" width="100" src={'https://cdn.v2ex.com/gravatar/' + this.state.user.gravatarHash + '?s=300&r=pg&d=identicon'} />
          </div>
          <div className={css.info}>
            <h2>{this.state.user.username}</h2>
            {leancloudUser}
          </div>
        </div>

        <LeanCloudApps leancloudApps={this.state.leancloudApps} />
      </div>
    )
  }
}

const LeanCloudApps = (props) => {
  if (props.leancloudApps.length === 0) {
    return <div></div>
  }
  const apps = props.leancloudApps.map((app) => {
    return (
      <tr key={app.id}>
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
