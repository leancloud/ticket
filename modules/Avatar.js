import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {Image} from 'react-bootstrap'

export default class Avatar extends Component {

  render() {
    let src = `https://cdn.v2ex.com/gravatar/${this.props.user.gravatarHash || this.props.user.get('gravatarHash')}?s=${this.props.height || 16}&r=pg&d=identicon`
    return <Image height={this.props.height || 16} width={this.props.width || 16} src={src} />
  }

}

Avatar.propTypes = {
  user: PropTypes.object.isRequired,
  height: PropTypes.number,
  width: PropTypes.number
}
