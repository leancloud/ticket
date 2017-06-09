import React, {Component} from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import {FormGroup, ControlLabel, FormControl} from 'react-bootstrap'
import AV from 'leancloud-storage'

import common from './common'

export default class UpdateTicket extends Component {
  constructor(props) {
    super(props)
    this.state = {
      categories: [],
      category: null,
      assignees: [],
    }
  }

  componentDidMount() {
    if (this.props.isCustomerService) {
      Promise.all([
        new AV.Query('Category').find(),
        common.getCustomerServices()
      ]).then(([categories, assignees]) => {
        this.setState({categories, assignees})
      })
      .catch(this.props.addNotification)
    }
  }

  handleCategoryChange(e) {
    const category = _.find(this.state.categories, {id: e.target.value})
    this.props.updateTicketCategory(category)
    .catch(this.props.addNotification)
  }

  handleAssigneeChange(e) {
    const customerService = _.find(this.state.assignees, {id: e.target.value})
    this.props.updateTicketAssignee(customerService)
    .catch(this.props.addNotification)
  }

  render() {
    if (!this.props.isCustomerService) {
      return <div></div>
    }
    const categoryOptions = this.state.categories.map((category) => {
      return (
        <option key={category.id} value={category.id}>{category.get('name')}</option>
      )
    })
    const assigneesOptions = this.state.assignees.map((cs) => {
      return (
        <option key={cs.id} value={cs.id}>{cs.get('username')}</option>
      )
    })
    return <div>
      <FormGroup>
        <ControlLabel>修改类别</ControlLabel>
        <FormControl componentClass='select' value={this.props.ticket.get('category').objectId} onChange={this.handleCategoryChange.bind(this)}>
          {categoryOptions}
        </FormControl>
      </FormGroup>
      <FormGroup>
        <ControlLabel>修改负责人</ControlLabel>
        <FormControl componentClass='select' value={this.props.ticket.get('assignee').id} onChange={this.handleAssigneeChange.bind(this)}>
          {assigneesOptions}
        </FormControl>
      </FormGroup>
    </div>
  }

}

UpdateTicket.propTypes = {
  ticket: PropTypes.instanceOf(AV.Object).isRequired,
  isCustomerService: PropTypes.bool,
  updateTicketCategory: PropTypes.func.isRequired,
  updateTicketAssignee: PropTypes.func.isRequired,
  addNotification: PropTypes.func.isRequired,
}
