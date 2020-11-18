import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {Form, FormGroup, ControlLabel, FormControl, Button, Checkbox, Table} from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'

import Vacation from './Vacation'
import translate from '../i18n/translate'

class CustomerServiceProfile extends Component {

  constructor(props) {
    super(props)
    this.state = {
      wechatUsers: [],
      wechatUserId: AV.User.current().get('wechatEnterpriseUserId'),
      bearychatUrl: AV.User.current().get('bearychatUrl'),
    }
  }

  componentDidMount() {
    AV.Cloud.run('getWechatEnterpriseUsers', {})
    .then((wechatUsers) => {
      this.setState({wechatUsers})
      return
    })
    .catch(this.context.addNotification)
  }

  handleWechatIdChange(e) {
    this.setState({wechatUserId: e.target.value})
  }

  handleBearychatUrlChange(e) {
    this.setState({bearychatUrl: e.target.value})
  }

  handleSubmit(e) {
    e.preventDefault()
    const currentUser = AV.User.current()
    currentUser.set('wechatEnterpriseUserId', this.state.wechatUserId)
    currentUser.set('bearychatUrl', this.state.bearychatUrl)
    currentUser.save()
    .catch(this.context.addNotification)
  }

  render() {
    const {t} = this.props
    const wechatUserOptions = this.state.wechatUsers.map((user) => {
      return <option key={user.userid} value={user.userid}>{user.name}</option>
    })
    return <div>
      <h2>{t('associatedAccounts')}</h2>
      <Form>
        <FormGroup>
          <ControlLabel>{t('weCom')}</ControlLabel>
          <FormControl componentClass="select" value={this.state.wechatUserId} onChange={this.handleWechatIdChange.bind(this)}>
            <option key='undefined' value=''>{t('unlinked')}</option>
            {wechatUserOptions}
          </FormControl>
        </FormGroup>
        <Button type='button' onClick={this.handleSubmit.bind(this)}>{t('save')}</Button>
      </Form>
      <Vacation />
    </div>
  }

}

CustomerServiceProfile.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

CustomerServiceProfile.propTypes = {
  t: PropTypes.func
}

export default translate(CustomerServiceProfile)