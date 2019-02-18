import React, {Component} from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import {FormGroup, ControlLabel, FormControl} from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'
import {getUserDisplayName} from './common'

import {getCustomerServices, CategoriesSelect, depthFirstSearchFind} from './common'

export default class UpdateTicket extends Component {
  constructor(props) {
    super(props)
    this.state = {
      category: null,
      assignees: [],
    }
  }

  componentDidMount() {
    if (this.props.isCustomerService) {
      getCustomerServices()
      .then(assignees => {
        this.setState({assignees})
        return
      })
      .catch(this.context.addNotification)
    }
  }

  handleCategoryChange(e) {
    this.props.updateTicketCategory(depthFirstSearchFind(this.props.categoriesTree, c => c.id == e.target.value))
    .then(this.context.addNotification)
    .catch(this.context.addNotification)
  }

  handleAssigneeChange(e) {
    const customerService = _.find(this.state.assignees, {id: e.target.value})
    this.props.updateTicketAssignee(customerService)
    .then(this.context.addNotification)
    .catch(this.context.addNotification)
  }

  render() {
    if (!this.props.isCustomerService) {
      return <div></div>
    }
    const assigneesOptions = this.state.assignees.map((cs) => {
      return (
        <option key={cs.id} value={cs.id}>{getUserDisplayName(cs)}</option>
      )
    })
    return <div>
      <FormGroup>
        <ControlLabel>修改负责人</ControlLabel>
        <FormControl componentClass='select' value={this.props.ticket.get('assignee').id} onChange={this.handleAssigneeChange.bind(this)}>
          {assigneesOptions}
        </FormControl>
      </FormGroup>
      <FormGroup>
        <ControlLabel>修改类别</ControlLabel>
        <CategoriesSelect categoriesTree={this.props.categoriesTree}
          selected={this.props.ticket.get('category')}
          onChange={this.handleCategoryChange.bind(this)} />
      </FormGroup>
    </div>
  }

}

UpdateTicket.propTypes = {
  ticket: PropTypes.instanceOf(AV.Object).isRequired,
  isCustomerService: PropTypes.bool,
  updateTicketCategory: PropTypes.func.isRequired,
  updateTicketAssignee: PropTypes.func.isRequired,
  categoriesTree: PropTypes.array.isRequired,
}

UpdateTicket.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}
