import React from 'react'
import _ from 'lodash'
import Promise from 'bluebird'
import AV from 'leancloud-storage'

import common from './common'

export default React.createClass({
  getInitialState() {
    return {
      isCustomerService: false,
      categories: [],
      category: null,
      assignees: [],
    }
  },
  componentDidMount() {
    common.isCustomerService(AV.User.current()).then((isCustomerService) => {
      if (!isCustomerService) {
        this.setState({isCustomerService})
      } else {
        Promise.all([
          new AV.Query('Category').find(),
          common.getCustomerServices()
        ]).spread((categories, assignees) => {
          this.setState({isCustomerService, categories, assignees})
        })
      }
    })
  },
  handleCategoryChange(e) {
    const category = _.find(this.state.categories, {id: e.target.value})
    this.props.updateTicketCategory(category)
  },
  handleAssigneeChange(e) {
    const customerService = _.find(this.state.assignees, {id: e.target.value})
    this.props.updateTicketAssignee(customerService)
  },
  render() {
    if (!this.state.isCustomerService) {
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
    return (
      <div className='form-horizontal'>
        <div className='form-group'>
          <label className="col-sm-2 control-label">修改类别</label>
          <div className="col-sm-10">
            <select className="form-control" value={this.props.ticket.get('category').objectId} onChange={this.handleCategoryChange}>
              {categoryOptions}
            </select>
          </div>
        </div>
        <div className='form-group'>
          <label className="col-sm-2 control-label">修改负责人</label>
          <div className="col-sm-10">
            <select className="form-control" value={this.props.ticket.get('assignee').id} onChange={this.handleAssigneeChange}>
              {assigneesOptions}
            </select>
          </div>
        </div>
      </div>
    )
  }
})
