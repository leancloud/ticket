import React from 'react'
import PropTypes from 'prop-types'
import { db } from '../lib/leancloud'
import StatsSummary from './StatsSummary'
import StatsChart from './StatsChart'
import translate from './i18n/translate'
import {DocumentTitle} from './utils/DocumentTitle'

class CustomerServiceStats extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      categories: []
    }
  }

  componentDidMount() {
    return db.class('Category')
    .limit(1000)
    .find()
    .then((categories) => {
      this.setState({categories})
      return
    })
    .catch(this.context.addNotification)
  }

  render() {
    const {t} = this.props
    return (
      <div>
        <DocumentTitle title={`${t('statistics')} - LeanTicket`} />
        <StatsSummary categories={this.state.categories} />
        <StatsChart categories={this.state.categories} />
      </div>
    )
  }

}

CustomerServiceStats.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

CustomerServiceStats.propTypes = {
  t: PropTypes.func
}

export default translate(CustomerServiceStats)
