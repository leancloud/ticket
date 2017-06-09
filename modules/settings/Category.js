import React from 'react'
import PropTypes from 'prop-types'
import {FormGroup, ControlLabel, FormControl, Button} from 'react-bootstrap'
import AV from 'leancloud-storage'

export default class Category extends React.Component {

  componentDidMount() {
    return new AV.Query('Category')
    .get(this.props.params.id)
    .then((category) => {
      this.setState({
        category
      })
    })
  }

  handleNameChange(e) {
    const category = this.state.category
    category.set('name', e.target.value)
    this.setState({category})
  }

  handleQTemplateChange(e) {
    const category = this.state.category
    category.set('qTemplate', e.target.value)
    this.setState({category})
  }

  handleSubmit(e) {
    e.preventDefault()
    const category = this.state.category
    category.save()
    .then(() => {
      this.setState({category})
    })
  }

  handleDelete() {
    const result = confirm('确认要删除分类：' + this.state.category.get('name'))
    if (result) {
      this.state.category.destroy()
      .then(() => {
        this.context.router.push('/settings/categories')
      })
      .catch(this.props.addNotification)
    }
  }

  render() {
    if (!this.state) {
      return <div>数据读取中……</div>
    }

    return (
      <div>
        <h1>分类修改</h1>
        <form onSubmit={this.handleSubmit.bind(this)}>
          <FormGroup controlId="qTemplateTextarea">
            <ControlLabel>分类名称</ControlLabel>
            <FormControl type="text" value={this.state.category.get('name')} onChange={this.handleNameChange.bind(this)} />
          </FormGroup>
          <FormGroup>
            <ControlLabel>问题模板</ControlLabel>
            <FormControl
              componentClass="textarea"
              placeholder="用户新建该分类工单时，问题描述默认显示这里的内容。"
              rows='8'
              value={this.state.category.get('qTemplate')}
              onChange={this.handleQTemplateChange.bind(this)}/>
          </FormGroup>
          <Button type='submit'>保存</Button>
          {' '}
          <Button type='button' bsStyle="danger" onClick={this.handleDelete.bind(this)}>删除</Button>
        </form>
      </div>
    )
  }

}

Category.propTypes = {
  params: PropTypes.object.isRequired,
  addNotification: PropTypes.func.isRequired,
}

Category.contextTypes = {
  router: PropTypes.object.isRequired
}
