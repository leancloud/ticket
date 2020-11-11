import React from 'react'
import PropTypes from 'prop-types'
import AV from 'leancloud-storage/live-query'
import DocumentTitle from 'react-document-title'
import StatsSummary from './StatsSummary'
import StatsChart from './StatsChart'


export default class CustomerServiceStats extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      categories: []
    }
  }

  componentDidMount() {
    return new AV.Query('Category')
    .limit(1000)
    .find()
    .then((categories) => {
      this.setState({categories})
      return
    })
    .catch(this.context.addNotification)
  }

  render() {
    return (
      <div>
        <DocumentTitle title='统计 - LeanTicket' />
        <StatsSummary categories={this.state.categories} />
        <StatsChart categories={this.state.categories} />
      </div>
    )
  }

}

CustomerServiceStats.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

