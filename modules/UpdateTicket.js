import React from 'react'
import _ from 'lodash'
import AV from 'leancloud-storage'

export default React.createClass({
  getInitialState() {
    return {
      categories: [],
      category: null,
    }
  },
  componentDidMount() {
    new AV.Query('Category').find().then((categories) => {
      this.setState({categories})
    })
  },
  handleCategoryChange(e) {
    const category = _.find(this.state.categories, {id: e.target.value})
    this.props.updateTicketCategory(category)
  },
  render() {
    const options = this.state.categories.map((category) => {
      return (
        <option key={category.id} value={category.id}>{category.get('name')}</option>
      )
    })
    return (
      <div>
        <div className="form-group">
          <select className="form-control" value={this.props.ticket.get('category').objectId} onChange={this.handleCategoryChange}>
            {options}
          </select>
        </div>
        <button type="submit" className="btn btn-default" onClick={this.handleSubmit}>提交</button>
      </div>
    )
  }
})
