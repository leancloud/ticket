import React from 'react'
import PropTypes from 'prop-types'

export default React.createClass({
  componentDidMount() {
    this.context.router.push('/tickets')
  },
  contextTypes: {
    router: PropTypes.object
  },
  render() {
    return <div>Home</div>
  }
})
