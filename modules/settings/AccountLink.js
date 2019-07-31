import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {Form, FormGroup, Button} from 'react-bootstrap'
import _ from 'lodash'
import AV from 'leancloud-storage/live-query'

import {getLeanCloudRegions, getLeanCloudRegionText} from '../../lib/common'

export default class AccountLink extends Component {

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
    if (!this.state.lcUserInfos) {
      return <div>读取中……</div>
    }

    return <div>
      <h2>帐号关联</h2>
      {getLeanCloudRegions().map(region => {
        return <OauthButton currentUser={this.props.currentUser}
          lcUserInfos={this.state.lcUserInfos}
          region={region}
          regionText={getLeanCloudRegionText(region)} />
      })}
      <span className='text-muted'>关联北美节点帐号之前，请先登录北美节点。</span>
    </div>
  }

}

AccountLink.propTypes = {
  currentUser: PropTypes.object,
  updateCurrentUser: PropTypes.func,
}

const OauthButton = (props) => {
  const userInfo = _.find(props.lcUserInfos, {region: props.region})
  if (userInfo) {
    return (
      <FormGroup>
        <Button disabled>已关联 LeanCloud {props.regionText}节点 {userInfo.email} 帐号</Button>
      </FormGroup>
    )
  }

  return (
    <Form action='/oauth/login' method='post'>
      <input type='hidden' name='sessionToken' value={props.currentUser._sessionToken} />
      <input type='hidden' name='region' value={props.region} />
      <FormGroup>
        <Button type='submit' bsStyle='primary'>LeanCloud {props.regionText}节点</Button>
      </FormGroup>
    </Form>
  )
}

OauthButton.propTypes = {
  currentUser: PropTypes.object,
  lcUserInfos: PropTypes.array,
  region: PropTypes.string.isRequired,
  regionText: PropTypes.string.isRequired
}
