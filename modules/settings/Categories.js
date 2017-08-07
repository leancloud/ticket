import React from 'react'
import _ from 'lodash'
import {Link} from 'react-router'
import AV from 'leancloud-storage/live-query'

import common, {UserLabel} from '../common'

export default class Cagegories extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      categories: [],
      newCategory: '',
      checkedCategories: [],
      customerServices: [],
    }
  }

  componentDidMount() {
    return Promise.all([
      new AV.Query('Category')
        .descending('createdAt')
        .find(),
      common.getCustomerServices()
        .then((users) => {
          return _.reject(users, {id: AV.User.current().id})
        })
    ]).then(([categories, customerServices]) => {
      this.setState({
        categories,
        checkedCategories: AV.User.current().get('categories') || [],
        customerServices,
      })
    })
  }

  handleNewCategoryChange(e) {
    this.setState({newCategory: e.target.value})
  }

  handleCategorySubmit(e) {
    e.preventDefault()
    if (this.state.newCategory) {
      new AV.Object('Category')
        .save({name: this.state.newCategory})
        .then((category) => {
          const categories = this.state.categories
          categories.unshift(category)
          this.setState({
            categories,
            newCategory: ''
          })
        })
    }
  }

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
  }

  render() {
    const categories = this.state.categories.map((category) => {
      const selectCustomerServices = _.filter(this.state.customerServices, (user) => {
        return _.find(user.get('categories'), {objectId: category.id})
      }).map((user) => {
        return <span key={user.id}><UserLabel user={user} /> </span>
      })
      return (
        <tr key={category.id}>
          <td><Link to={'/settings/categories/' + category.id}>{category.get('name')}</Link></td>
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
        <div className="form-inline form-group">
          <div className='form-group'>
            <input type="text" className="form-control" placeholder="分类名称" value={this.state.newCategory} onChange={this.handleNewCategoryChange.bind(this)} />
          </div>
          {' '}
          <button type="button" className="btn btn-default" onClick={this.handleCategorySubmit.bind(this)}>新增分类</button>
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

}
