import React from 'react'
import _ from 'lodash'
import Promise from 'bluebird'
import AV from 'leancloud-storage'

import common, {UserLabel} from '../common'

export default React.createClass({
  getInitialState() {
    return {
      categories: [],
      newCategory: '',
      checkedCategories: [],
      customerServices: [],
    }
  },
  componentDidMount() {
    Promise.all([
      new AV.Query('Category')
        .descending('createdAt')
        .find(),
      common.getCustomerServices()
        .then((users) => {
          return _.reject(users, {id: AV.User.current().id})
        })
    ]).spread((categories, customerServices) => {
      this.setState({
        categories,
        checkedCategories: AV.User.current().get('categories') || [],
        customerServices,
      })
    })
  },
  handleNewCategoryChange(e) {
    this.setState({newCategory: e.target.value})
  },
  handleCategorySubmit(e) {
    e.preventDefault()
    if (this.state.newCategory) {
      new AV.Object('Category')
        .save({name: this.state.newCategory})
        .then((category) => {
          const categories = this.state.categories
          categories.unshift(category)
          this.setState({categories})
        })
    }
  },
  handleCategoryChange(e, categoryId) {
    let categories = this.state.checkedCategories
    if (e.target.checked) {
      categories.push(common.getTinyCategoryInfo(_.find(this.state.categories, {id: categoryId})))
      categories = _.uniqBy(categories, 'objectId')
    } else {
      categories = _.reject(categories, {objectId: categoryId})
    }
    AV.User.current()
      .set('categories', categories)
      .save()
      .then(() => {
        this.setState({checkedCategories: categories})
      })
  },
  render() {
    const categories = this.state.categories.map((category) => {
      const selectCustomerServices = _.filter(this.state.customerServices, (user) => {
        return _.find(user.get('categories'), {objectId: category.id})
      }).map((user) => {
        return <span key={user.id}><UserLabel user={user} /> </span>
      })
      return (
        <tr key={category.id}>
          <td>{category.get('name')}</td>
          <td><input type='checkbox' 
                checked={!!_.find(this.state.checkedCategories, {objectId: category.id})}
                onChange={(e) => this.handleCategoryChange(e, category.id)}
              /></td>
          <td>{selectCustomerServices}</td>
        </tr>
      )
    })
    return (
      <div>
        <div className="form-inline">
          <div className='form-group'>
            <input type="text" className="form-control" placeholder="分类名称" value={this.state.category} onChange={this.handleNewCategoryChange} />
          </div>
          {' '}
          <button type="button" className="btn btn-default" onClick={this.handleCategorySubmit}>新增分类</button>
        </div>
        <table className='table table-bordered'>
          <thead>
            <tr>
              <th>名称</th>
              <th>我是否负责</th>
              <th>其他负责成员</th>
            </tr>
          </thead>
          <tbody>
            {categories}
          </tbody>
        </table>
      </div>
    )
  }
})
