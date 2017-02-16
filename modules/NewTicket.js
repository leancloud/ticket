import React from 'react'
import AV from 'leancloud-storage'

export default React.createClass({
  getInitialState() {
    return {
      categories: [],
      title: '',
      category: '',
      content: '',
    }
  },
  componentDidMount() {
    new AV.Query('Category').find().then((categories) => {
      this.setState({categories})
    })
  },
  handleTitleChange(e) {
    this.setState({title: e.target.value})
  },
  handleCategoryChange(e) {
    this.setState({category: e.target.value})
  },
  handleContentChange(e) {
    this.setState({content: e.target.value})
  },
  handleSubmit(e) {
    e.preventDefault()
    this.props.addTicket({
      title: this.state.title,
      category: this.state.category,
      content: this.state.content,
    })
    this.setState({
      title: '',
      category: '',
      content: '',
    })
  },
  render() {
    const options = this.state.categories.map((category) => {
      return (
        <option>{category.get('name')}</option>
      )
    })
    return (
      <div>
        <div className="form-group">
          <input type="text" className="form-control" placeholder="标题" value={this.state.title} onChange={this.handleTitleChange} />
        </div>
        <div className="form-group">
          <select className="form-control" value={this.state.category} onChange={this.handleCategoryChange}>
            <option>默认分类</option>
            {options}
          </select>
        </div>
        <div className="form-group">
          <textarea className="form-control" rows="8" placeholder="遇到的问题" value={this.state.content} onChange={this.handleContentChange}></textarea>
        </div>
        <button type="submit" className="btn btn-default" onClick={this.handleSubmit}>提交</button>
      </div>
    )
  }
})
