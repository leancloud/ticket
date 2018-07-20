import React from 'react'
import _ from 'lodash'
import {Link} from 'react-router'
import {FormGroup} from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'

import common, {UserLabel, makeTree, depthFirstSearchMap} from '../common'

export default class Cagegories extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      categories: [],
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
      return
    })
  }

  handleCategoryChange(e, categoryId) {
    let categories = this.state.checkedCategories
    if (e.target.checked) {
      categories.push(common.getTinyCategoryInfo(_.find(this.state.categories, {id: categoryId})))
      categories = _.uniqBy(categories, 'objectId')
    } else {
      categories = _.reject(categories, {objectId: categoryId})
    }
    return AV.User.current()
      .set('categories', categories)
      .save()
      .then(() => {
        this.setState({checkedCategories: categories})
        return
      })
  }

  render() {
    const categoriesTree = makeTree(this.state.categories)
    const categories = depthFirstSearchMap(categoriesTree, (category) => {
      const selectCustomerServices = _.filter(this.state.customerServices, (user) => {
        return _.find(user.get('categories'), {objectId: category.id})
      }).map((user) => {
        return <span key={user.id}><UserLabel user={user} /> </span>
      })
      return (
        <tr key={category.id}>
          <td>{category.get('parent') && ' └ '}<Link to={'/settings/categories/' + category.id}>{category.get('name')}</Link></td>
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
        <form>
          <FormGroup>
            <Link to={'/settings/categories/_new'}>新增分类</Link>
          </FormGroup>
        </form>
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
