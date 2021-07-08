import React, { Component } from 'react'
import { Table } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { withTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import _ from 'lodash'

import { auth } from '../../lib/leancloud'
import { getCustomerServices, getCategoriesTree, getNodeIndentString } from '../common'
import { UserLabel } from '../UserLabel'
import { depthFirstSearchFind, depthFirstSearchMap, getTinyCategoryInfo } from '../../lib/common'
import { GroupLabel } from '../components/Group'

class Categories extends Component {
  constructor(props) {
    super(props)
    this.state = {
      categoriesTree: [],
      checkedCategories: [],
      customerServices: [],
    }
  }

  loadData() {
    return Promise.all([getCategoriesTree(), getCustomerServices()]).then(
      ([categoriesTree, customerServices]) => {
        this.setState({
          categoriesTree,
          checkedCategories: auth.currentUser.data.categories || [],
          customerServices,
        })
        return
      }
    )
  }

  componentDidMount() {
    this.loadData()
  }

  handleCategoryChange(e, categoryId) {
    let categories = this.state.checkedCategories
    if (e.target.checked) {
      categories.push(
        getTinyCategoryInfo(
          depthFirstSearchFind(this.state.categoriesTree, (c) => c.id == categoryId)
        )
      )
      categories = _.uniqBy(categories, 'objectId')
    } else {
      categories = _.reject(categories, { objectId: categoryId })
    }
    return auth.currentUser.update({ categories }).then(() => {
      this.setState({ checkedCategories: categories })
      return this.loadData()
    })
  }

  render() {
    const { t } = this.props
    const tds = depthFirstSearchMap(this.state.categoriesTree, (c) => {
      const selectCustomerServices = _.filter(this.state.customerServices, (user) => {
        return _.find(user.get('categories'), { objectId: c.id })
      }).map((user) => {
        return (
          <span key={user.id}>
            <UserLabel user={user.toJSON()} />{' '}
          </span>
        )
      })
      return (
        <tr key={c.id}>
          <td>
            <span>{getNodeIndentString(c)}</span>
            <Link to={'/settings/categories/' + c.id}>{c.get('name')}</Link>
          </td>
          <td>
            <input
              type="checkbox"
              checked={!!_.find(this.state.checkedCategories, { objectId: c.id })}
              onChange={(e) => this.handleCategoryChange(e, c.id)}
            />
          </td>
          <td>{selectCustomerServices}</td>
          <td>{c.data.group && <GroupLabel groupId={c.data.group.id} />}</td>
        </tr>
      )
    })
    return (
      <div>
        <Link to={'/settings/categories/_new'}>{t('newCategory')}</Link>{' '}
        <Link to={'/settings/categorySort'}>{t('reorder')}</Link>
        <Table bordered size="sm">
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>{t('assigned')}</th>
              <th>{t('assignTo')}</th>
              <th>{t('assignToGroup')}</th>
            </tr>
          </thead>
          <tbody>{tds}</tbody>
        </Table>
      </div>
    )
  }
}

Categories.propTypes = {
  t: PropTypes.func.isRequired,
}

export default withTranslation()(Categories)
