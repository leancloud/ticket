import React, {Component} from 'react'
import _ from 'lodash'
import PropTypes from 'prop-types'
import AV from 'leancloud-storage/live-query'

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
      this.setState({user, leancloudUser, leancloudApps: _.sortBy(leancloudApps, app => -app.month_reqs)})
    })
  }

  render() {
    let leancloudUser 
    if (this.state.leancloudUser) {
      leancloudUser = (
        <table className='table table-bordered'>
          <tbody>
            <tr>
              <td>id</td>
              <td>{this.state.leancloudUser.id}</td>
              <td>email</td>
              <td>{this.state.leancloudUser.email}</td>
            </tr>
            <tr>
              <td>username</td>
              <td>{this.state.leancloudUser.username}</td>
              <td>phone</td>
              <td>{this.state.leancloudUser.phone}</td>
            </tr>
          </tbody>
        </table>
      )
    }
    return (
      <div>
        <div><img height="200" width="200" src={'https://cdn.v2ex.com/gravatar/' + this.state.user.gravatarHash + '?s=200&r=pg&d=identicon'} /></div>
        <div>{this.state.user.username}</div>
        {leancloudUser}
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
