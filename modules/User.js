import React, {Component} from 'react'
import {Link} from 'react-router'
import PropTypes from 'prop-types'
import AV from 'leancloud-storage/live-query'
import {Avatar} from './common'
import css from './User.css'

export default class User extends Component {

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
      AV.Cloud.run('getUserInfo', {username}),
      props.isCustomerService ? AV.Cloud.run('getLeanCloudUserInfosByUsername', {username}) : null,
      props.isCustomerService ? AV.Cloud.run('getLeanCloudAppsByUsername', {username}) : null,
    ]).then(([user, leancloudUsers, leancloudApps]) => {
      this.setState({
        user,
        leancloudUsers,
        leancloudApps: leancloudApps ? leancloudApps.sort((a, b) => b.month_reqs - a.month_reqs) : []
      })
      return
    })
  }

  render() {
    if (!this.state.user) {
      return <div>读取中……</div>
    }

    return (
      <div>
        <div className={css.userWrap}>
          <div className={css.avatar}>
            <Avatar height="200" width="200" user={this.state.user} />
          </div>
          <div className={css.info}>
            <h2>{this.state.user.username}</h2>
            <p><Link to={`/customerService/tickets?authorId=${this.state.user.objectId}&page=0&size=10`}>工单列表</Link></p>
            {this.state.leancloudUsers &&
              <div>
                <table className='table table-bordered table-striped'>
                  <thead>
                    <tr>
                      <td>区域</td>
                      <td>Id</td>
                      <td>用户名</td>
                      <td>电子邮箱</td>
                      <td>电话</td>
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
