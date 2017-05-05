import React from 'react'

export default React.createClass({
  componentDidMount() {
    this.context.router.push('/tickets')
  },
  contextTypes: {
    router: React.PropTypes.object
  },
  render() {
    return <div>Home</div>
  }
})
