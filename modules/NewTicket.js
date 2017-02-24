import React from 'react'
import _ from 'lodash'
import AV from 'leancloud-storage'

const common = require('./common')

export default React.createClass({
  getInitialState() {
    return {
      categories: [],
      title: '',
      category: {},
      content: '',
    }
  },
  componentDidMount() {
    new AV.Query('Category').find().then((categories) => {
      this.setState({categories, category: categories[0]})
    })
  },
  handleTitleChange(e) {
    this.setState({title: e.target.value})
  },
  handleCategoryChange(e) {
    const category = _.find(this.state.categories, {id: e.target.value})
    this.setState({category})
  },
  handleContentChange(e) {
    this.setState({content: e.target.value})
  },
  handleSubmit(e) {
    e.preventDefault()
    common.uploadFiles($('#ticketFile')[0].files)
    .then((files) => {
      this.props.addTicket({
        title: this.state.title,
        category: this.state.category.toJSON(),
        content: this.state.content,
        files,
      })
      this.setState({
        title: '',
        category: '',
        content: '',
      })
    })
  },
  render() {
    const options = this.state.categories.map((category) => {
      return (
        <option key={category.id} value={category.id}>{category.get('name')}</option>
      )
    })
    return (
      <form onSubmit={this.handleSubmit}>
        <div className="form-group">
          <input type="text" className="form-control" placeholder="标题" value={this.state.title} onChange={this.handleTitleChange} />
        </div>
        <div className="form-group">
          <select className="form-control" value={this.state.category.id} onChange={this.handleCategoryChange}>
            {options}
          </select>
        </div>
        <div className="form-group">
          <textarea className="form-control" rows="8" placeholder="遇到的问题" value={this.state.content} onChange={this.handleContentChange}></textarea>
        </div>
        <div className="form-group">
          <input id="ticketFile" type="file" multiple />
        </div>
        <button type="submit" className="btn btn-default">提交</button>
      </form>
    )
  }
})
