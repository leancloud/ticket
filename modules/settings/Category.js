import _ from 'lodash'
import React from 'react'
import PropTypes from 'prop-types'
import {FormGroup, ControlLabel, FormControl, Button} from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'

export default class Category extends React.Component {

  componentDidMount() {
    return new AV.Query('Category')
    .doesNotExist('parent')
    .find()
    .then(categories => {
      const categoryId = this.props.params.id
      return Promise.resolve()
      .then(() => {
        if (categoryId == '_new') {
          return new AV.Object('Category', {
            name: '',
            qTemplate: '',
          })
        }

        const category = _.find(categories, {id: categoryId})
        if (category) {
          return category
        }

        return new AV.Query('Category').get(categoryId)
      })
      .then(category => {
        this.setState({
          name: category.get('name'),
          qTemplate: category.get('qTemplate'),
          category,
          parentCategory: null,
          categories,
        })
        return
      })
    })
  }

  handleNameChange(e) {
    this.setState({name: e.target.value})
  }

  handleParentChange(e) {
    const category = this.state.categories.find(c => c.id === e.target.value)
    this.setState({parentCategory: category})
  }

  handleQTemplateChange(e) {
    this.setState({qTemplate: e.target.value})
  }

  handleSubmit(e) {
    e.preventDefault()
    const category = this.state.category
    return category.save({
      name: this.state.name,
      parent: this.state.parentCategory,
      qTemplate: this.state.qTemplate,
    })
    .then(() => {
      this.context.router.push('/settings/categories')
      return
    })
    .then(this.context.addNotification)
  }

  handleDelete() {
    const result = confirm('确认要停用分类：' + this.state.category.get('name'))
    if (result) {
      return this.state.category.destroy()
      .then(() => {
        this.context.router.push('/settings/categories')
        return
      })
      .catch(this.context.addNotification)
    }
  }

  render() {
    if (!this.state) {
      return <div>数据读取中……</div>
    }

    const categorieOptions = this.state.categories.map(c => {
      return <option key={c.id} value={c.id}>{c.get('name')}</option>
    })

    return (
      <div>
        <form onSubmit={this.handleSubmit.bind(this)}>
          <FormGroup controlId="nameText">
            <ControlLabel>分类名称</ControlLabel>
            <FormControl type="text" value={this.state.name} onChange={this.handleNameChange.bind(this)} />
          </FormGroup>
          <FormGroup controlId="parentSelect">
            <ControlLabel>父分类(可选)</ControlLabel>
            <FormControl componentClass='select'
              value={this.state.category.get('parent') && this.state.category.get('parent').id}
              onChange={this.handleParentChange.bind(this)}>
              <option value=''></option>
              {categorieOptions}
            </FormControl>
          </FormGroup>
          <FormGroup controlId="qTemplateTextarea">
            <ControlLabel>问题描述模板</ControlLabel>
            <FormControl
              componentClass="textarea"
              placeholder="用户新建该分类工单时，问题描述默认显示这里的内容。"
              rows='8'
              value={this.state.qTemplate}
              onChange={this.handleQTemplateChange.bind(this)}/>
          </FormGroup>
          <Button type='submit' bsStyle='success'>保存</Button>
          {' '}
          {this.state.category.id
            && <Button type='button' bsStyle="danger" onClick={this.handleDelete.bind(this)}>删除</Button>
            || <Button type='button' onClick={() => this.context.router.push('/settings/categories')}>取消</Button>
          }
        </form>
      </div>
    )
  }

}

Category.propTypes = {
  params: PropTypes.object.isRequired,
}

Category.contextTypes = {
  router: PropTypes.object.isRequired,
  addNotification: PropTypes.func.isRequired,
}
