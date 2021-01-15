import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {Label} from 'react-bootstrap'
import LC, { cloud } from '../lib/leancloud'

import translate from './i18n/translate'

class Tag extends Component {

  componentDidMount() {
    if (this.props.tag.get('key') === 'appId') {
      const appId = this.props.tag.get('value')
      if (!appId) {
        return
      }
      return cloud.run('getLeanCloudApp', {
        username: this.props.ticket.get('author').get('username'),
        appId,
      })
      .then((app) => {
        this.setState({key: 'application', value: app.app_name})
        if (this.props.isCustomerService) {
          return cloud.run('getLeanCloudAppUrl', {appId, region: app.region})
          .then((url) => {
            if (url) {
              this.setState({url})
            }
            return
          })
        }
        return
      })
    }
  }

  render() {
    const {t} = this.props
    if (!this.state) {
      return <div className="form-group">
        <Label bsStyle="default">{this.props.tag.get('key')}: {this.props.tag.get('value')}</Label>
      </div>
    } else {
      if (this.state.url) {
        return <div>
          <label className="control-label">
            {t(this.state.key)}
          </label>
          <div className="form-group">
            <a className="btn btn-default" href={this.state.url} target='_blank'>
              {this.state.value}
            </a>
          </div>
        </div>
      }
      return <div>
        <label className="control-label">
          {this.state.key}
        </label>
        <div className="form-group">
          <a className="btn btn-default disabled">
            {this.state.value}
          </a>
        </div>
      </div>
    }
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