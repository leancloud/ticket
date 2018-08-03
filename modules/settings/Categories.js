import React from 'react'
import _ from 'lodash'
import {Link} from 'react-router'
import {Form, FormGroup} from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'

import {getCustomerServices, getTinyCategoryInfo, UserLabel, getCategoriesTree,
  depthFirstSearchMap, depthFirstSearchFind, getNodeIndentString} from '../common'

export default class Categories extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      categoriesTree: [],
      checkedCategories: [],
      customerServices: [],
    }
  }

  componentDidMount() {
    return Promise.all([
      getCategoriesTree(),
      getCustomerServices()
        .then((users) => {
          return _.reject(users, {id: AV.User.current().id})
        })
    ]).then(([categoriesTree, customerServices]) => {
      this.setState({
        categoriesTree,
        checkedCategories: AV.User.current().get('categories') || [],
        customerServices,
      })
      return
    })
  }

  handleCategoryChange(e, categoryId) {
    let categories = this.state.checkedCategories
    if (e.target.checked) {
      categories.push(getTinyCategoryInfo(depthFirstSearchFind(this.state.categoriesTree, (c) => c.id == categoryId)))
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
    const tds = depthFirstSearchMap(this.state.categoriesTree, (c) => {
      const selectCustomerServices = _.filter(this.state.customerServices, (user) => {
        return _.find(user.get('categories'), {objectId: c.id})
      }).map((user) => {
        return <span key={user.id}><UserLabel user={user} /> </span>
      })
      return (
        <tr key={c.id}>
          <td><span>{getNodeIndentString(c)}</span><Link to={'/settings/categories/' + c.id}>{c.get('name')}</Link></td>
          <td><input type='checkbox'
                checked={!!_.find(this.state.checkedCategories, {objectId: c.id})}
                onChange={(e) => this.handleCategoryChange(e, c.id)}
              /></td>
          <td>{selectCustomerServices}</td>
        </tr>
      )
    })
    return (
      <div>
        <Form inline>
          <FormGroup>
            <Link to={'/settings/categories/_new'}>新增分类</Link>
          </FormGroup>{' '}
          <FormGroup>
            <Link to={'/settings/categorySort'}>调整顺序</Link>
          </FormGroup>
        </Form>
        <table className='table table-bordered'>
          <thead>
            <tr>
              <th>名称</th>
              <th>我是否负责</th>
              <th>其他负责成员</th>
            </tr>
          </thead>
          <tbody>
            {tds}
          </tbody>
        </table>
      </div>
    )
  }

}
