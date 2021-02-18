import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {Form, FormGroup, ControlLabel, FormControl, Button} from 'react-bootstrap'
import {auth, cloud} from '../../lib/leancloud'

import Vacation from './Vacation'
import translate from '../i18n/translate'

class CustomerServiceProfile extends Component {
  constructor(props) {
    super(props)
    this.state = {
      wechatUsers: [],
      wechatUserId: auth.currentUser().data.wechatEnterpriseUserId,
      bearychatUrl: auth.currentUser().data.bearychatUrl,
    }
  }

  componentDidMount() {
    cloud.run('getWechatEnterpriseUsers', {})
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
    auth.currentUser()
    .update({
      wechatEnterpriseUserId: this.state.wechatUserId,
      bearychatUrl: this.state.bearychatUrl,
    })
    .catch(this.context.addNotification)
  }

  render() {
    const {t} = this.props
    const wechatUserOptions = this.state.wechatUsers.map((user) => (
      <option key={user.userid} value={user.userid}>{user.name}</option>
    ))
    return (
      <div>
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
    )
  }

}

CustomerServiceProfile.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

CustomerServiceProfile.propTypes = {
  t: PropTypes.func
}

export default translate(CustomerServiceProfile)
