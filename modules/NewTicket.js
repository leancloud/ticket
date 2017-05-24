import React from 'react'
import _ from 'lodash'
import {FormGroup, ControlLabel, FormControl} from 'react-bootstrap'
import AV from 'leancloud-storage'

const common = require('./common')

export default React.createClass({
  getInitialState() {
    return {
      categories: [],
      apps: [],
      title: '',
      appId: '',
      category: {},
      content: '',
    }
  },
  componentDidMount() {
    Promise.all([
      new AV.Query('Category').find(),
      AV.Cloud.run('getLeanCloudApps'),
    ])
    .then(([categories, apps]) => {
      this.setState({categories, apps})
    })
  },
  handleTitleChange(e) {
    this.setState({title: e.target.value})
  },
  handleCategoryChange(e) {
    const category = _.find(this.state.categories, {id: e.target.value})
    this.setState({category})
  },
  handleAppChange(e) {
    this.setState({appId: e.target.value})
  },
  handleContentChange(e) {
    this.setState({content: e.target.value})
  },
  handleSubmit(e) {
    e.preventDefault()
    common.uploadFiles($('#ticketFile')[0].files)
    .then((files) => {
      return new AV.Object('Ticket').save({
        title: this.state.title,
        category: common.getTinyCategoryInfo(this.state.category),
        content: this.state.content,
        files,
      })
      .then((ticket) => {
        return new AV.Object('Tag').save({
          key: 'appId',
          value: this.state.appId,
          ticket
        })
      })
    }).then(() => {
      this.context.router.push('/tickets')
    })
  },
  contextTypes: {
    router: React.PropTypes.object
  },
  render() {
    const options = this.state.categories.map((category) => {
      return (
        <option key={category.id} value={category.id}>{category.get('name')}</option>
      )
    })
    const appOptions = this.state.apps.map((app) => {
      return <option key={app.app_id} value={app.app_id}>{app.app_name}</option>
    })
    return (
      <form onSubmit={this.handleSubmit}>
        <FormGroup>
          <ControlLabel>标题</ControlLabel>
          <input type="text" className="form-control" value={this.state.title} onChange={this.handleTitleChange} />
        </FormGroup>
        <FormGroup>
          <ControlLabel>问题分类</ControlLabel>
          <FormControl componentClass="select" value={this.state.category.id} onChange={this.handleCategoryChange}>
            <option key='empty'></option>
            {options}
          </FormControl>
        </FormGroup>
        <FormGroup>
          <ControlLabel>相关应用</ControlLabel>
          <FormControl componentClass="select" value={this.state.appId} onChange={this.handleAppChange}>
            <option key='empty'></option>
            {appOptions}
          </FormControl>
        </FormGroup>
        <FormGroup>
          <textarea className="form-control" rows="8" placeholder="遇到的问题" value={this.state.content} onChange={this.handleContentChange}></textarea>
        </FormGroup>
        <FormGroup>
          <input id="ticketFile" type="file" multiple />
        </FormGroup>
        <button type="submit" className="btn btn-default">提交</button>
      </form>
    )
  }
})
