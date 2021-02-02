/*global ENABLE_LEANCLOUD_INTERGRATION */
import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {Label} from 'react-bootstrap'
import LC, { cloud } from '../lib/leancloud'

import translate from './i18n/translate'

class Tag extends Component {

  async componentDidMount() {
    const {ticket, tag} = this.props
    if (ENABLE_LEANCLOUD_INTERGRATION && tag.data.key === 'appId') {
      const appId = tag.data.value
      if (!appId) {
        return
      }
      const app = await cloud.run('getLeanCloudApp', {
        appId,
        username: ticket.data.author.data.username,
      })
      this.setState({key: 'application', value: app.app_name})
      if (this.props.isCustomerService) {
        const url = await cloud.run('getLeanCloudAppUrl', {appId, region: app.region})
        if (url) {
          this.setState({url})
        }
      }
    }
  }

  render() {
    const {t, tag} = this.props
    if (!this.state) {
      return (
        <div className="form-group">
          <Label bsStyle="default">{tag.data.key}: {tag.data.value}</Label>
        </div>
      )
    }
    return (
      <div>
        <label className="control-label">
          {t(this.state.key)}
        </label>
        <div className="form-group">
          {this.state.url ? (
            <a className="btn btn-default" href={this.state.url} target='_blank'>
              {this.state.value}
            </a>
          ) : (
            <a className="btn btn-default disabled">
              {this.state.value}
            </a>
          )}
        </div>
      </div>
    )
  }
}

Tag.propTypes = {
  tag: PropTypes.instanceOf(LC.LCObject).isRequired,
  ticket: PropTypes.object.isRequired,
  isCustomerService: PropTypes.bool,
  t: PropTypes.func.isRequired
}

Tag.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

export default translate(Tag)
