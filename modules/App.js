import React from 'react'
import { Link, IndexLink } from 'react-router'
import AV from 'leancloud-storage'

import GlobalNav from './GlobalNav'

export default React.createClass({
  render() {
    return (
      <div>
        <GlobalNav />
        {this.props.children}
      </div>
    )
  }
})
